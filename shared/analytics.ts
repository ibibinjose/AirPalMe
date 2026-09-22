/** Typed analytics contract. Schema version 1. Do not log secrets or free text. */

export const ANALYTICS_SCHEMA_VERSION = 1 as const;
export const ANALYTICS_AGGREGATION_VERSION = 1 as const;
export const ANALYTICS_MAX_BYTES = 8192;
export const ANALYTICS_MAX_STRING = 200;
export const NORTH_STAR_METRIC_ID = "weekly_qualified_guest_actions_per_active_qr_context";
export const NORTH_STAR_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Winnable guest loop target: scan room QR → Wi-Fi + tonight + answered
 * first value within 60s. Reported on `first_value` via timeFromQrScanMs /
 * loopTargetMet — never the average alone, always with the distribution.
 */
export const WINNABLE_LOOP_TARGET_MS = 60_000;

/** Pure: ms between two ISO timestamps, or undefined when either is invalid. */
export function loopMs(fromIso: string | undefined, toIso: string): number | undefined {
  if (!fromIso) return undefined;
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return undefined;
  return to - from;
}

/** Pure: did the guest reach first value inside the winnable-loop target? */
export function winnableLoopMet(scanAtIso: string | undefined, valueAtIso: string): boolean {
  const ms = loopMs(scanAtIso, valueAtIso);
  return ms !== undefined && ms <= WINNABLE_LOOP_TARGET_MS;
}

export const ANALYTICS_EVENT_NAMES = [
  "session_started",
  "qr_scan",
  "context_view",
  "context_load_failed",
  "first_value",
  "content_action",
  "ask_submitted",
  "ask_answered",
  "offer_view",
  "offer_claim",
  "offer_redeem",
  "event_save",
  "event_check_in",
  "support_request",
  "support_resolved",
  "host_activation",
  "content_publish",
  "content_update",
  "rating_submitted",
  "share_created",
  "subscription_state",
  "calendar_event_view",
  "calendar_event_share",
  "calendar_event_going",
  "calendar_event_interested",
  "calendar_event_liked",
  "calendar_event_directions",
  "calendar_event_open",
  "calendar_month_navigate",
  "calendar_jump_today",
  "calendar_date_select",
  "calendar_view_change",
  "calendar_filter_change",
  "calendar_category_filter",
  "calendar_search",
  "calendar_export_batch",
  "calendar_agenda_export_day",
  "calendar_export_selected_day",
  "calendar_event_reschedule",
  "favorites_view",
  "favorites_place_select",
  "favorites_filter_change",
  "companion_cta_viewed",
  "companion_application_started",
  "companion_application_submitted",
  "companion_application_reviewed",
  "client_error",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export const CONTEXT_TYPES = ["property", "room", "marker", "campus", "event", "business", "bio"] as const;
export type ContextType = (typeof CONTEXT_TYPES)[number];

export const ANALYTICS_SOURCES = ["qr", "direct", "share", "referral", "internal", "unknown"] as const;
export type AnalyticsSource = (typeof ANALYTICS_SOURCES)[number];

export const BACKEND_STATES = ["live", "offline_queued", "local_demo", "failed"] as const;
export type BackendState = (typeof BACKEND_STATES)[number];

export const VALUE_TYPES = ["wifi", "answer", "map", "profile", "faq", "offer", "save", "support", "booking", "place"] as const;
export type ValueType = (typeof VALUE_TYPES)[number];

export const CONTENT_ACTION_TYPES = [
  "map_open",
  "wifi_reveal",
  "profile_open",
  "booking_intent",
  "place_open",
] as const;
export type ContentActionType = (typeof CONTENT_ACTION_TYPES)[number];

export const SENSITIVE_PROPERTY_KEYS = [
  "password",
  "wifiPassword",
  "email",
  "phone",
  "question",
  "note",
  "details",
  "token",
  "roomToken",
  "pin",
  "staffPin",
  "href",
  "url",
  "guestName",
  "code",
] as const;

const SENSITIVE = new Set<string>(SENSITIVE_PROPERTY_KEYS);

/** Known seed/demo context ids. Events for these are local_demo and never enter production KPIs. */
export const SEED_CONTEXT_IDS = new Set([
  "harbour-hotel",
  "harbour-rocks-sydney",
  "harbour-college",
  "syd-rocks-argyle",
  "97a4e8add3a8c668",
  "evt-rocks-market",
]);

export type AnalyticsProperties = Record<string, string | number | boolean | null>;

export type AnalyticsEvent = {
  eventId: string;
  eventName: AnalyticsEventName;
  schemaVersion: typeof ANALYTICS_SCHEMA_VERSION;
  occurredAt: string;
  receivedAt?: string;
  anonymousSessionId: string;
  visitorId?: string;
  uid?: string;
  tenantId?: string;
  contextId?: string;
  contextType?: ContextType;
  qrCampaignId?: string;
  source?: AnalyticsSource;
  backendState: BackendState;
  properties: AnalyticsProperties;
};

export const EVENT_PROPERTY_ALLOWLIST: Record<
  AnalyticsEventName,
  { required: readonly string[]; optional: readonly string[] }
> = {
  session_started: { required: ["entryPath", "source"], optional: ["referrerClass", "locale"] },
  qr_scan: { required: ["contextType", "contextId"], optional: ["qrCampaignId", "placementType", "source"] },
  context_view: { required: ["contextType", "contextId", "loadStatus"], optional: ["loadMs", "backendState"] },
  context_load_failed: { required: ["contextType", "contextId", "errorClass"], optional: ["loadMs"] },
  first_value: {
    required: ["valueType", "contextId"],
    optional: ["contentId", "timeFromSessionStartMs", "timeFromQrScanMs", "loopTargetMet"],
  },
  content_action: { required: ["actionType", "contextId"], optional: ["contentId", "category", "destination"] },
  ask_submitted: { required: ["contextId", "questionCategory"], optional: ["answerSource", "latencyMs"] },
  ask_answered: { required: ["contextId", "answerStatus"], optional: ["questionCategory", "helpful"] },
  offer_view: { required: ["offerId", "partnerId", "contextId"], optional: ["placement"] },
  offer_claim: { required: ["offerId", "partnerId", "claimId", "contextId"], optional: ["expiryBucket"] },
  offer_redeem: { required: ["offerId", "partnerId", "claimId"], optional: ["redemptionChannel"] },
  event_save: { required: ["eventId", "contextId"], optional: ["stallId", "source", "action"] },
  event_check_in: { required: ["eventId", "contextId", "checkInId"], optional: ["method"] },
  support_request: { required: ["contextId", "requestId", "category"], optional: ["priority"] },
  support_resolved: { required: ["contextId", "requestId", "resolutionStatus"], optional: ["resolutionTimeMs"] },
  host_activation: { required: ["tenantId", "activationStep"], optional: ["contextId", "actorRole"] },
  content_publish: { required: ["tenantId", "contentType", "contentId"], optional: ["contextId", "actorRole"] },
  content_update: { required: ["tenantId", "contentType", "contentId"], optional: ["contextId", "actorRole"] },
  rating_submitted: { required: ["targetType", "targetId", "contextId"], optional: ["ratingBucket"] },
  share_created: { required: ["shareType", "contextId"], optional: ["contentId", "destination"] },
  subscription_state: { required: ["tenantId", "planState"], optional: ["planId"] },
  calendar_event_view: { required: [], optional: ["eventId", "slug", "name", "category", "action"] },
  calendar_event_share: { required: [], optional: ["eventId", "name", "action"] },
  calendar_event_going: { required: [], optional: ["eventId", "name", "action"] },
  calendar_event_interested: { required: [], optional: ["eventId", "name", "action"] },
  calendar_event_liked: { required: [], optional: ["eventId", "name", "action"] },
  calendar_event_directions: { required: [], optional: ["eventId", "name", "action"] },
  calendar_event_open: { required: [], optional: ["eventId", "name", "action"] },
  calendar_month_navigate: { required: [], optional: ["direction", "year", "month", "action"] },
  calendar_jump_today: { required: [], optional: ["date", "action"] },
  calendar_date_select: { required: [], optional: ["date", "hasEvents", "action"] },
  calendar_view_change: { required: [], optional: ["view", "action"] },
  calendar_filter_change: { required: [], optional: ["filter", "action"] },
  calendar_category_filter: { required: [], optional: ["category", "action"] },
  calendar_search: { required: [], optional: ["query", "queryLength", "action"] },
  calendar_export_batch: { required: [], optional: ["type", "count", "action"] },
  calendar_agenda_export_day: { required: [], optional: ["date", "count", "action"] },
  calendar_export_selected_day: { required: [], optional: ["date", "count", "action"] },
  calendar_event_reschedule: { required: [], optional: ["eventId", "fromDate", "toDate", "action"] },
  favorites_view: { required: [], optional: ["contextId", "lat", "lng", "category", "action"] },
  favorites_place_select: { required: [], optional: ["placeId", "placeName", "action"] },
  favorites_filter_change: { required: [], optional: ["category", "action"] },
  companion_cta_viewed: { required: [], optional: ["source"] },
  companion_application_started: { required: [], optional: [] },
  companion_application_submitted: { required: [], optional: ["roles"] },
  companion_application_reviewed: { required: ["status"], optional: [] },
  client_error: { required: ["errorClass", "errorSource"], optional: ["path", "name"] },
};

export function isAnalyticsEventName(value: string): value is AnalyticsEventName {
  return (ANALYTICS_EVENT_NAMES as readonly string[]).includes(value);
}

export function isContextType(value: string): value is ContextType {
  return (CONTEXT_TYPES as readonly string[]).includes(value);
}

export function isAnalyticsSource(value: string): value is AnalyticsSource {
  return (ANALYTICS_SOURCES as readonly string[]).includes(value);
}

export function isBackendState(value: string): value is BackendState {
  return (BACKEND_STATES as readonly string[]).includes(value);
}

export function isSeedContextId(contextId: string | undefined): boolean {
  if (!contextId) return false;
  const bare = contextId.includes(":") ? contextId.split(":")[1] || contextId : contextId;
  return SEED_CONTEXT_IDS.has(contextId) || SEED_CONTEXT_IDS.has(bare);
}

export function newAnalyticsEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `ae_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function contextFromPath(path: string): { contextType: ContextType; contextId: string } | undefined {
  const stay = path.match(/^\/g\/([^/?#]+)/);
  if (stay?.[1]) return { contextType: "property", contextId: stay[1] };
  const marker = path.match(/^\/q\/([^/?#]+)/);
  if (marker?.[1]) return { contextType: "marker", contextId: marker[1] };
  const campus = path.match(/^\/c\/([^/?#]+)/);
  if (campus?.[1]) return { contextType: "campus", contextId: campus[1] };
  const event = path.match(/^\/e\/([^/?#]+)/);
  if (event?.[1]) return { contextType: "event", contextId: event[1] };
  const bio = path.match(/^\/@([a-z0-9._]{3,30})/i);
  if (bio?.[1]) return { contextType: "bio", contextId: bio[1].toLowerCase() };
  return undefined;
}

export function contextFromStay(input: {
  kind?: string;
  propertyId?: string;
  markerId?: string;
  campusId?: string;
}): { contextType: ContextType; contextId: string } | undefined {
  if (input.markerId) return { contextType: "marker", contextId: input.markerId };
  if (input.kind === "campus" && input.campusId) return { contextType: "campus", contextId: input.campusId };
  if (input.campusId && !input.propertyId) return { contextType: "campus", contextId: input.campusId };
  if (input.kind === "stay" && input.propertyId) return { contextType: "room", contextId: input.propertyId };
  if (input.propertyId) return { contextType: "property", contextId: input.propertyId };
  return undefined;
}

function clipString(value: unknown): string | number | boolean | null | undefined {
  if (value == null) return null;
  if (typeof value === "boolean" || typeof value === "number") {
    if (typeof value === "number" && !Number.isFinite(value)) return undefined;
    return value;
  }
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > ANALYTICS_MAX_STRING ? trimmed.slice(0, ANALYTICS_MAX_STRING) : trimmed;
}

export type AnalyticsValidation = { ok: true; event: AnalyticsEvent } | { ok: false; reason: string };

export function validateAnalyticsEvent(raw: unknown): AnalyticsValidation {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "not_an_object" };
  const input = raw as Record<string, unknown>;
  const eventName = String(input.eventName || "");
  if (!isAnalyticsEventName(eventName)) return { ok: false, reason: "unknown_event" };

  const eventId = String(input.eventId || "").trim();
  if (!eventId || eventId.length > 80) return { ok: false, reason: "bad_event_id" };

  const anonymousSessionId = String(input.anonymousSessionId || "").trim();
  if (!anonymousSessionId || anonymousSessionId.length > 80) return { ok: false, reason: "bad_session" };

  const occurredAt = String(input.occurredAt || "");
  if (!Number.isFinite(Date.parse(occurredAt))) return { ok: false, reason: "bad_occurred_at" };

  const backendState = String(input.backendState || "");
  if (!isBackendState(backendState)) return { ok: false, reason: "bad_backend_state" };

  const allow = EVENT_PROPERTY_ALLOWLIST[eventName];
  const allowed = Array.from(new Set<string>([...allow.required, ...allow.optional]));
  const incoming =
    input.properties && typeof input.properties === "object" ? (input.properties as Record<string, unknown>) : {};

  for (const key of Object.keys(incoming)) {
    if (SENSITIVE.has(key) || SENSITIVE.has(key.toLowerCase())) {
      return { ok: false, reason: `sensitive_key:${key}` };
    }
  }

  const properties: AnalyticsProperties = {};
  for (const key of allowed) {
    if (!(key in incoming)) continue;
    const clipped = clipString(incoming[key]);
    if (clipped !== undefined) properties[key] = clipped;
  }

  for (const key of allow.required) {
    const value = properties[key];
    if (value == null || value === "") return { ok: false, reason: `missing:${key}` };
  }

  const contextTypeRaw =
    input.contextType != null
      ? String(input.contextType)
      : properties.contextType != null
        ? String(properties.contextType)
        : "";
  const contextIdRaw =
    input.contextId != null
      ? String(input.contextId)
      : properties.contextId != null
        ? String(properties.contextId)
        : "";
  const sourceRaw =
    input.source != null ? String(input.source) : properties.source != null ? String(properties.source) : "";

  const event: AnalyticsEvent = {
    eventId,
    eventName,
    schemaVersion: ANALYTICS_SCHEMA_VERSION,
    occurredAt,
    receivedAt: input.receivedAt ? String(input.receivedAt) : undefined,
    anonymousSessionId,
    visitorId: input.visitorId ? String(input.visitorId).slice(0, 80) : undefined,
    uid: input.uid ? String(input.uid).slice(0, 128) : undefined,
    tenantId: input.tenantId ? String(input.tenantId).slice(0, 120) : undefined,
    contextId: contextIdRaw ? contextIdRaw.slice(0, 120) : undefined,
    contextType: isContextType(contextTypeRaw) ? contextTypeRaw : undefined,
    qrCampaignId: input.qrCampaignId ? String(input.qrCampaignId).slice(0, 120) : undefined,
    source: isAnalyticsSource(sourceRaw) ? sourceRaw : undefined,
    backendState,
    properties,
  };

  const serialized = JSON.stringify(event);
  if (serialized.length > ANALYTICS_MAX_BYTES) return { ok: false, reason: "payload_too_large" };
  const blob = Object.values(properties).join(" ");
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(blob) || /\b(?:password|passwd)\b/i.test(blob)) {
    return { ok: false, reason: "pii_pattern" };
  }

  return { ok: true, event };
}

export function calendarDay(iso: string): string {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "";
  return new Date(at).toISOString().slice(0, 10);
}

export function analyticsDedupeKey(event: AnalyticsEvent): string {
  const day = calendarDay(event.occurredAt);
  const session = event.anonymousSessionId;
  const context = event.contextId || "";
  const props = event.properties;
  switch (event.eventName) {
    case "first_value":
      return `first_value|${session}|${context}|${day}`;
    case "content_action":
      return `content_action|${session}|${context}|${String(props.actionType || "")}|${String(props.contentId || "")}|${day}`;
    case "offer_claim":
      return `claim:${String(props.claimId || event.eventId)}`;
    case "offer_redeem":
      return `redeem:${String(props.claimId || event.eventId)}`;
    case "event_check_in":
      return `checkin:${String(props.checkInId || event.eventId)}`;
    case "support_request":
      return `support:${String(props.requestId || event.eventId)}`;
    case "support_resolved":
      return `support_resolved:${String(props.requestId || event.eventId)}`;
    case "rating_submitted":
      return `rating|${session}|${String(props.targetId || "")}|${day}`;
    case "event_save":
      return `save|${session}|${String(props.eventId || "")}|${String(props.stallId || "")}|${day}`;
    default:
      return `id:${event.eventId}`;
  }
}

export function isProductionEligible(event: AnalyticsEvent): boolean {
  if (event.backendState === "local_demo" || event.backendState === "failed") return false;
  if (isSeedContextId(event.contextId)) return false;
  return true;
}

export function isQualifiedAction(event: AnalyticsEvent): boolean {
  if (!isProductionEligible(event)) return false;
  if (!event.contextId && event.eventName !== "offer_redeem") return false;
  switch (event.eventName) {
    case "first_value":
      return VALUE_TYPES.includes(String(event.properties.valueType) as ValueType);
    case "content_action":
      return CONTENT_ACTION_TYPES.includes(String(event.properties.actionType) as ContentActionType);
    case "ask_answered":
      return event.properties.answerStatus === "shown";
    case "offer_claim":
    case "offer_redeem":
    case "event_save":
    case "event_check_in":
    case "support_request":
    case "support_resolved":
    case "rating_submitted":
      return true;
    default:
      return false;
  }
}

export type NorthStarResult = {
  id: typeof NORTH_STAR_METRIC_ID;
  windowMs: number;
  from: string;
  to: string;
  qualifiedActions: number;
  activeQrContexts: number;
  value: number;
  uniqueSessions: number;
  firstValueSessions: number;
  qualifiedActionSessions: number;
  firstValueRate: number;
  qualifiedActionRate: number;
  localDemoExcluded: number;
  duplicatesExcluded: number;
  byContext: Array<{ contextId: string; scans: number; qualifiedActions: number }>;
};

export function northStarFromEvents(
  events: AnalyticsEvent[],
  now = Date.now(),
  windowMs = NORTH_STAR_WINDOW_MS,
): NorthStarResult {
  const from = now - windowMs;
  const seenDedupe = new Set<string>();
  let localDemoExcluded = 0;
  let duplicatesExcluded = 0;

  const inWindow: AnalyticsEvent[] = [];
  for (const event of events) {
    const at = Date.parse(event.occurredAt);
    if (!Number.isFinite(at) || at < from || at > now) continue;
    if (event.backendState === "local_demo" || isSeedContextId(event.contextId)) {
      localDemoExcluded += 1;
      continue;
    }
    const key = analyticsDedupeKey(event);
    if (seenDedupe.has(key)) {
      duplicatesExcluded += 1;
      continue;
    }
    seenDedupe.add(key);
    inWindow.push(event);
  }

  const byContext = new Map<string, { scans: number; qualifiedActions: number }>();
  const sessions = new Set<string>();
  const firstValueSessions = new Set<string>();
  const qualifiedSessions = new Set<string>();
  let qualifiedActions = 0;

  for (const event of inWindow) {
    if (event.backendState === "failed") continue;
    sessions.add(event.anonymousSessionId);
    const contextId = event.contextId;
    if (contextId) {
      const row = byContext.get(contextId) || { scans: 0, qualifiedActions: 0 };
      if (event.eventName === "qr_scan") row.scans += 1;
      if (isQualifiedAction(event)) {
        row.qualifiedActions += 1;
        qualifiedActions += 1;
        qualifiedSessions.add(event.anonymousSessionId);
      }
      byContext.set(contextId, row);
    } else if (isQualifiedAction(event)) {
      qualifiedActions += 1;
      qualifiedSessions.add(event.anonymousSessionId);
    }
    if (event.eventName === "first_value") firstValueSessions.add(event.anonymousSessionId);
  }

  const active = Array.from(byContext.entries())
    .filter(([, row]) => row.scans > 0)
    .map(([contextId, row]) => ({ contextId, ...row }))
    .sort((a, b) => b.qualifiedActions - a.qualifiedActions || a.contextId.localeCompare(b.contextId));

  const activeQrContexts = active.length;
  const uniqueSessions = sessions.size;

  return {
    id: NORTH_STAR_METRIC_ID,
    windowMs,
    from: new Date(from).toISOString(),
    to: new Date(now).toISOString(),
    qualifiedActions,
    activeQrContexts,
    value: activeQrContexts === 0 ? 0 : qualifiedActions / activeQrContexts,
    uniqueSessions,
    firstValueSessions: firstValueSessions.size,
    qualifiedActionSessions: qualifiedSessions.size,
    firstValueRate: uniqueSessions === 0 ? 0 : firstValueSessions.size / uniqueSessions,
    qualifiedActionRate: uniqueSessions === 0 ? 0 : qualifiedSessions.size / uniqueSessions,
    localDemoExcluded,
    duplicatesExcluded,
    byContext: active,
  };
}

/** @deprecated Use contextFromPath. Kept so older call sites compile during the cutover. */
export function qrContextIdFromPath(path: string): string | undefined {
  const hit = contextFromPath(path);
  return hit ? `${hit.contextType}:${hit.contextId}` : undefined;
}

/** @deprecated Use contextFromStay. */
export function qrContextIdFromStay(input: {
  kind?: string;
  propertyId?: string;
  markerId?: string;
  campusId?: string;
}): string | undefined {
  const hit = contextFromStay(input);
  return hit ? `${hit.contextType}:${hit.contextId}` : undefined;
}
