import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  ANALYTICS_AGGREGATION_VERSION,
  analyticsDedupeKey,
  calendarDay,
  isSeedContextId,
  newAnalyticsEventId,
  validateAnalyticsEvent,
  type AnalyticsEvent,
} from "../../shared/analytics";
import { aggregateDailyFacts, dailyFactId } from "../../shared/analytics-aggregate";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";

const CALLABLE = {
  consumeAppCheckToken: true,
  enforceAppCheck: process.env.ENFORCE_APPCHECK === "true",
} as const;

function db() {
  return getFirestore();
}

const BATCH_MAX = 20;

async function resolveContext(event: AnalyticsEvent): Promise<{ tenantId?: string; resolved: boolean }> {
  const id = event.contextId;
  if (!id) return { resolved: event.eventName === "session_started" || event.eventName === "host_activation" };
  if (isSeedContextId(id)) return { resolved: false };
  const type = event.contextType;
  try {
    if (type === "property" || type === "room") {
      const snap = await db().collection("properties").doc(id).get();
      if (!snap.exists) return { resolved: false };
      return { tenantId: String(snap.data()?.ownerId || snap.data()?.ownerUid || ""), resolved: true };
    }
    if (type === "marker") {
      const snap = await db().collection("markers").doc(id).get();
      if (!snap.exists) return { resolved: false };
      const propertyId = String(snap.data()?.propertyId || "");
      return { tenantId: propertyId || String(snap.data()?.ownerUid || ""), resolved: true };
    }
    if (type === "event") {
      const snap = await db().collection("events").doc(id).get();
      if (!snap.exists) return { resolved: false };
      return { tenantId: String(snap.data()?.organiserUid || ""), resolved: true };
    }
    if (type === "bio" || type === "business") {
      const snap = await db().collection("handles").doc(id).get();
      if (!snap.exists) return { resolved: false };
      return { tenantId: String(snap.data()?.ownerUid || ""), resolved: true };
    }
    if (type === "campus") {
      const snap = await db().collection("properties").doc(id).get();
      return { tenantId: snap.exists ? String(snap.data()?.ownerId || "") : undefined, resolved: snap.exists };
    }
  } catch {
    return { resolved: false };
  }
  return { resolved: false };
}

export async function writeAuthoritativeEvent(input: {
  uid: string;
  eventName: AnalyticsEvent["eventName"];
  contextId?: string;
  contextType?: AnalyticsEvent["contextType"];
  source?: AnalyticsEvent["source"];
  properties: AnalyticsEvent["properties"];
  anonymous?: boolean;
}): Promise<void> {
  const raw = {
    eventId: newAnalyticsEventId(),
    eventName: input.eventName,
    schemaVersion: 1 as const,
    occurredAt: new Date().toISOString(),
    anonymousSessionId: `server:${input.uid}`,
    uid: input.uid,
    contextId: input.contextId,
    contextType: input.contextType,
    source: input.source || "internal",
    backendState: isSeedContextId(input.contextId) ? ("local_demo" as const) : ("live" as const),
    properties: input.properties,
  };
  const validated = validateAnalyticsEvent(raw);
  if (!validated.ok) return;
  const event = validated.event;
  const resolved = await resolveContext(event);
  const dedupeKey = analyticsDedupeKey(event);
  const dup = await db().collection("analyticsEvents").where("dedupeKey", "==", dedupeKey).limit(1).get();
  if (!dup.empty) return;
  const ref = db().collection("analyticsEvents").doc(event.eventId);
  const existing = await ref.get();
  if (existing.exists) return;
  await ref.set({
    ...event,
    tenantId: event.tenantId || resolved.tenantId || null,
    contextResolved: resolved.resolved,
    dedupeKey: analyticsDedupeKey(event),
    receivedAt: new Date().toISOString(),
    createdAt: FieldValue.serverTimestamp(),
  });
}

export const recordAnalyticsBatch = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "recordAnalyticsBatch");
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  await enforceRateLimit(uid, "analytics", isAnonymousAuth(request));

  const eventsIn = Array.isArray(request.data?.events) ? request.data.events : [];
  if (eventsIn.length > BATCH_MAX) throw new HttpsError("invalid-argument", "Batch too large.");

  const acceptedIds: string[] = [];
  const rejected: Array<{ eventId?: string; reason: string }> = [];
  let duplicates = 0;

  for (const item of eventsIn) {
    const validated = validateAnalyticsEvent(item);
    if (!validated.ok) {
      rejected.push({ eventId: item && typeof item === "object" ? String((item as { eventId?: string }).eventId || "") : undefined, reason: validated.reason });
      continue;
    }
    const event = validated.event;
    if (event.uid && event.uid !== uid) {
      rejected.push({ eventId: event.eventId, reason: "uid_mismatch" });
      continue;
    }
    event.uid = uid;
    if (event.backendState === "local_demo") {
      rejected.push({ eventId: event.eventId, reason: "local_demo" });
      continue;
    }
    const resolved = await resolveContext(event);
    const dedupeKey = analyticsDedupeKey(event);
    const ref = db().collection("analyticsEvents").doc(event.eventId);
    const existing = await ref.get();
    if (existing.exists) {
      duplicates += 1;
      acceptedIds.push(event.eventId);
      continue;
    }
    const dupQuery = await db().collection("analyticsEvents").where("dedupeKey", "==", dedupeKey).limit(1).get();
    if (!dupQuery.empty) {
      duplicates += 1;
      acceptedIds.push(event.eventId);
      continue;
    }
    await ref.set({
      ...event,
      tenantId: event.tenantId || resolved.tenantId || null,
      contextResolved: resolved.resolved,
      dedupeKey,
      receivedAt: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
    });
    acceptedIds.push(event.eventId);
  }

  return { accepted: acceptedIds.length, rejected: rejected.length, duplicates, acceptedIds, rejectedReasons: rejected };
});

async function runAggregationWindow(hours = 26) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const snap = await db().collection("analyticsEvents").where("occurredAt", ">=", since).limit(5000).get();
  const events = snap.docs.map((doc) => doc.data() as AnalyticsEvent);
  const facts = aggregateDailyFacts(events, ANALYTICS_AGGREGATION_VERSION);
  const batch = db().batch();
  for (const fact of facts) {
    const day = calendarDay(fact.periodStart);
    const id = dailyFactId(fact.contextId, day, fact.aggregationVersion);
    batch.set(db().collection("analyticsDaily").doc(id), { ...fact, computedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  await batch.commit();
  return { input: events.length, output: facts.length };
}

export const aggregateAnalyticsHourly = onSchedule(
  { region: "us-central1", schedule: "every 60 minutes", timeoutSeconds: 120 },
  async () => {
    await runAggregationWindow(26);
  },
);

export const runAnalyticsAggregation = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "runAnalyticsAggregation");
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const token = request.auth?.token as { platform_admin?: boolean; role?: string } | undefined;
  if (token?.platform_admin !== true && token?.role !== "super_admin") {
    throw new HttpsError("permission-denied", "Admin only.");
  }
  return runAggregationWindow(24 * 8);
});
