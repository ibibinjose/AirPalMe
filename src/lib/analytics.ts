import {
  analyticsDedupeKey,
  calendarDay,
  contextFromPath,
  contextFromStay,
  isSeedContextId,
  loopMs,
  newAnalyticsEventId,
  validateAnalyticsEvent,
  winnableLoopMet,
  type AnalyticsEvent,
  type AnalyticsEventName,
  type AnalyticsProperties,
  type AnalyticsSource,
  type BackendState,
  type ContentActionType,
  type ContextType,
  type ValueType,
} from "@shared/analytics";
import { liveBackendEnabled, recordAnalyticsBatchRemote } from "./functions";
import {
  analyticsEnabled,
  analyticsEnvironment,
  ensureAnonymousSession,
  getFirebaseAnalytics,
  getFirebaseAuth,
} from "./firebase";

const SESSION_KEY = "airpal.analytics.session";
const VISITOR_KEY = "airpal.analytics.visitor";
const CONSENT_KEY = "airpal.analytics.consent";
const QUEUE_KEY = "airpal.analytics.queue.v2";
const FROM_SCAN_KEY = "airpal.analytics.from-scan";
const INTERNAL_KEY = "airpal.analytics.internal";
const FIRST_PREFIX = "airpal.analytics.first.";
const SESSION_STARTED_KEY = "airpal.analytics.session-started";
const SESSION_START_AT_KEY = "airpal.analytics.session-started-at";
const QR_SCAN_AT_PREFIX = "airpal.analytics.qr-scan-at.";

export type AnalyticsConsent = "necessary" | "analytics" | "denied";

function storageGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    /* ignore quota */
  }
}

export function getAnalyticsConsent(): AnalyticsConsent {
  const raw = typeof window === "undefined" ? null : storageGet(localStorage, CONSENT_KEY);
  if (raw === "analytics" || raw === "denied" || raw === "necessary") return raw;
  return "necessary";
}

export function setAnalyticsConsent(consent: AnalyticsConsent) {
  if (typeof window === "undefined") return;
  storageSet(localStorage, CONSENT_KEY, consent);
}

export function anonymousSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  const existing = storageGet(sessionStorage, SESSION_KEY);
  if (existing) return existing;
  const id = newAnalyticsEventId();
  storageSet(sessionStorage, SESSION_KEY, id);
  return id;
}

function visitorId(): string | undefined {
  if (getAnalyticsConsent() !== "analytics") return undefined;
  const existing = storageGet(localStorage, VISITOR_KEY);
  if (existing) return existing;
  const id = newAnalyticsEventId();
  storageSet(localStorage, VISITOR_KEY, id);
  return id;
}

function readQueue(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AnalyticsEvent[];
    return Array.isArray(parsed) ? parsed.slice(-200) : [];
  } catch {
    return [];
  }
}

function writeQueue(rows: AnalyticsEvent[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(rows.slice(-200)));
  } catch {
    /* ignore */
  }
}

function inferSource(path: string, explicit?: AnalyticsSource): AnalyticsSource {
  if (explicit) return explicit;
  if (typeof window === "undefined") return "unknown";
  const params = new URLSearchParams(window.location.search);
  const utm = (params.get("utm_source") || "").toLowerCase();
  if (utm === "share" || params.get("share")) return "share";
  if (utm === "referral") return "referral";
  if (params.get("qr") || params.get("r") || utm === "qr") return "qr";
  if (storageGet(sessionStorage, FROM_SCAN_KEY)) return "qr";
  if (storageGet(sessionStorage, INTERNAL_KEY)) return "internal";
  if (path.startsWith("/g/") || path.startsWith("/q/") || path.startsWith("/c/")) return "qr";
  return "direct";
}

function currentBackendState(contextId?: string): BackendState {
  if (!liveBackendEnabled()) return "local_demo";
  if (isSeedContextId(contextId)) return "local_demo";
  return "live";
}

function stayContext(): { contextType: ContextType; contextId: string } | undefined {
  try {
    const raw = sessionStorage.getItem("airpal.stay");
    if (!raw) return undefined;
    return contextFromStay(
      JSON.parse(raw) as { kind?: string; propertyId?: string; markerId?: string; campusId?: string },
    );
  } catch {
    return undefined;
  }
}

export type TrackOptions = {
  contextId?: string;
  contextType?: ContextType;
  source?: AnalyticsSource;
  qrCampaignId?: string;
  tenantId?: string;
};

function buildEvent(
  eventName: AnalyticsEventName,
  properties: AnalyticsProperties,
  options?: TrackOptions,
): AnalyticsEvent | null {
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  const fromPath = contextFromPath(path);
  const fromStay = stayContext();
  const contextId =
    options?.contextId ||
    (typeof properties.contextId === "string" ? properties.contextId : undefined) ||
    fromPath?.contextId ||
    fromStay?.contextId;
  const contextType =
    options?.contextType ||
    (typeof properties.contextType === "string" ? (properties.contextType as ContextType) : undefined) ||
    fromPath?.contextType ||
    fromStay?.contextType;
  const source = inferSource(path, options?.source);
  const raw = {
    eventId: newAnalyticsEventId(),
    eventName,
    schemaVersion: 1 as const,
    occurredAt: new Date().toISOString(),
    anonymousSessionId: anonymousSessionId(),
    visitorId: visitorId(),
    uid: getFirebaseAuth()?.currentUser?.uid,
    tenantId: options?.tenantId,
    contextId,
    contextType,
    qrCampaignId: options?.qrCampaignId,
    source,
    backendState: currentBackendState(contextId),
    properties: {
      ...properties,
      ...(contextId ? { contextId } : {}),
      ...(contextType ? { contextType } : {}),
      ...(source ? { source } : {}),
    },
  };
  const validated = validateAnalyticsEvent(raw);
  if (!validated.ok) {
    if (import.meta.env.DEV) console.debug("[analytics] rejected", eventName, validated.reason);
    return null;
  }
  return validated.event;
}

let flushing = false;

export async function flushAnalyticsQueue(): Promise<void> {
  if (flushing || typeof window === "undefined") return;
  if (getAnalyticsConsent() === "denied") return;
  const pending = readQueue().filter((row) => row.backendState === "live" || row.backendState === "offline_queued");
  if (!pending.length || !liveBackendEnabled()) return;
  flushing = true;
  try {
    const uid = await ensureAnonymousSession();
    if (!uid) {
      writeQueue(
        readQueue().map((row) =>
          row.backendState === "live" ? { ...row, backendState: "offline_queued" as const } : row,
        ),
      );
      return;
    }
    const batch = pending.slice(0, 20);
    const result = await recordAnalyticsBatchRemote({ events: batch });
    const accepted = new Set(result.acceptedIds || []);
    const rest = readQueue().filter((row) => !accepted.has(row.eventId));
    writeQueue(rest);
  } catch {
    writeQueue(
      readQueue().map((row) =>
        row.backendState === "live" ? { ...row, backendState: "offline_queued" as const } : row,
      ),
    );
  } finally {
    flushing = false;
  }
}

async function mirrorGa4(event: AnalyticsEvent) {
  if (getAnalyticsConsent() === "denied") return;
  if (!analyticsEnabled()) return;
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;
  const params: Record<string, string | number> = {
    env: analyticsEnvironment(),
  };
  if (event.contextId) params.context_id = event.contextId;
  if (event.contextType) params.context_type = event.contextType;
  for (const [key, value] of Object.entries(event.properties)) {
    if (value == null) continue;
    params[key] = typeof value === "boolean" ? Number(value) : value;
  }
  try {
    const { logEvent } = await import("firebase/analytics");
    logEvent(analytics, event.eventName, params);
  } catch {
    /* ignore */
  }
}

export async function track(
  eventName: AnalyticsEventName,
  properties: AnalyticsProperties = {},
  options?: TrackOptions,
): Promise<void> {
  if (typeof window === "undefined") return;
  if (getAnalyticsConsent() === "denied") return;
  try {
    const event = buildEvent(eventName, properties, options);
    if (!event) return;
    const queue = readQueue();
    const key = analyticsDedupeKey(event);
    if (queue.some((row) => analyticsDedupeKey(row) === key)) return;
    writeQueue([...queue, event]);
    if (import.meta.env.DEV) console.debug("[analytics]", event.eventName, event.eventId, event.backendState);
    void mirrorGa4(event);
    if (event.backendState === "live") void flushAnalyticsQueue();
    storageSet(sessionStorage, INTERNAL_KEY, "1");
  } catch {
    /* never block the guest path */
  }
}

export function trackFirstValue(valueType: ValueType, contextId: string, extra?: AnalyticsProperties) {
  const nowIso = new Date().toISOString();
  try {
    const day = calendarDay(nowIso);
    const key = FIRST_PREFIX + contextId + "." + day;
    if (storageGet(sessionStorage, key)) return;
    storageSet(sessionStorage, key, "1");
  } catch {
    /* still emit; server dedupes */
  }
  // Winnable loop: scan room QR → first value within 60s, measured per context.
  let timeFromSessionStartMs: number | undefined;
  let timeFromQrScanMs: number | undefined;
  let loopTargetMet: boolean | undefined;
  try {
    const sessionStartAt = storageGet(sessionStorage, SESSION_START_AT_KEY) || undefined;
    timeFromSessionStartMs = loopMs(sessionStartAt, nowIso);
    const scanAt = storageGet(sessionStorage, QR_SCAN_AT_PREFIX + contextId) || undefined;
    timeFromQrScanMs = loopMs(scanAt, nowIso);
    if (scanAt) loopTargetMet = winnableLoopMet(scanAt, nowIso);
  } catch {
    /* timing is best-effort; the event still counts */
  }
  void track("first_value", {
    valueType,
    contextId,
    ...(timeFromSessionStartMs !== undefined ? { timeFromSessionStartMs } : {}),
    ...(timeFromQrScanMs !== undefined ? { timeFromQrScanMs } : {}),
    ...(loopTargetMet !== undefined ? { loopTargetMet } : {}),
    ...extra,
  });
}

/** True while the web build has no live backend (seed/demo data on screen). */
export function demoModeActive(): boolean {
  return !liveBackendEnabled();
}

export function trackContentAction(actionType: ContentActionType, contextId: string, extra?: AnalyticsProperties) {
  void track("content_action", { actionType, contextId, ...extra });
  // first_value keeps the action subtype instead of collapsing to "faq", and
  // receives only allowlisted keys: anything else in `extra` (destination,
  // category, …) would be silently stripped by the validator.
  const valueType: ValueType =
    actionType === "wifi_reveal"
      ? "wifi"
      : actionType === "map_open"
        ? "map"
        : actionType === "profile_open"
          ? "profile"
          : actionType === "booking_intent"
            ? "booking"
            : actionType === "place_open"
              ? "place"
              : "faq";
  const contentId = typeof extra?.contentId === "string" ? extra.contentId : undefined;
  trackFirstValue(valueType, contextId, contentId ? { contentId } : undefined);
}

export function trackPageView(path: string) {
  if (!storageGet(sessionStorage, SESSION_STARTED_KEY)) {
    storageSet(sessionStorage, SESSION_STARTED_KEY, "1");
    storageSet(sessionStorage, SESSION_START_AT_KEY, new Date().toISOString());
    const params = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
    void track("session_started", {
      entryPath: path.slice(0, 200),
      source: inferSource(path),
      referrerClass: params?.get("utm_medium") ? "campaign" : document.referrer ? "external" : "none",
    });
  }
  const ctx = contextFromPath(path);
  if (!ctx) return;
  void track("context_view", {
    contextType: ctx.contextType,
    contextId: ctx.contextId,
    loadStatus: "ok",
  });
}

export function noteQrContext(
  id: string,
  extra?: { source?: string; propertyId?: string; markerId?: string; campusId?: string },
) {
  const ctx =
    contextFromPath(typeof window === "undefined" ? "" : window.location.pathname) ||
    contextFromStay({
      propertyId: extra?.propertyId,
      markerId: extra?.markerId || (id.startsWith("marker:") ? id.slice(7) : undefined),
      campusId: extra?.campusId,
      kind: extra?.campusId ? "campus" : extra?.propertyId ? "stay" : undefined,
    });
  const contextId = ctx?.contextId || id.replace(/^(marker|stay|campus|property|room):/, "");
  const contextType =
    ctx?.contextType || (id.startsWith("campus:") ? "campus" : id.startsWith("marker:") ? "marker" : "property");
  storageSet(sessionStorage, FROM_SCAN_KEY, contextId);
  storageSet(sessionStorage, QR_SCAN_AT_PREFIX + contextId, new Date().toISOString());
  void track(
    "qr_scan",
    { contextType, contextId, source: "qr", placementType: extra?.source || "scan" },
    { contextId, contextType, source: "qr" },
  );
}

export function openMap(url: string, extra?: { contextId?: string; contentId?: string; destination?: string }) {
  const ctx = extra?.contextId || stayContext()?.contextId || contextFromPath(window.location.pathname)?.contextId;
  if (ctx)
    trackContentAction("map_open", ctx, {
      contentId: extra?.contentId || null,
      destination: extra?.destination || "maps",
    });
  window.open(url, "_blank", "noopener,noreferrer");
}

export function trackMapClick(extra?: { contextId?: string; placeId?: string; propertyId?: string; source?: string }) {
  const ctx = extra?.contextId || extra?.propertyId || stayContext()?.contextId;
  if (ctx)
    trackContentAction("map_open", ctx, { contentId: extra?.placeId || null, destination: extra?.source || "maps" });
}

export function loadAnalyticsBuffer(): AnalyticsEvent[] {
  return readQueue();
}

if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushAnalyticsQueue();
  });
}
