import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { automatedActivityScore, RATE_LIMITS, rateLimitAllows, type RateLimitAction } from "../../shared/abuse";
import type { ContentAudit } from "../../shared/content-meta";

function db(): Firestore {
  return getFirestore();
}

type CallableLike = {
  auth?: { uid?: string; token?: { firebase?: { sign_in_provider?: string } } };
  app?: unknown;
  data?: unknown;
};

export function isAnonymousAuth(request: CallableLike): boolean {
  return request.auth?.token?.firebase?.sign_in_provider === "anonymous";
}

export async function enforceRateLimit(uid: string, action: RateLimitAction, anonymous: boolean) {
  const firestore = db();
  const spec = RATE_LIMITS[action];
  const ref = firestore.collection("rateLimits").doc(`${uid}_${action}`);
  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const now = Date.now();
    const gate = rateLimitAllows({
      action,
      anonymous,
      count: Number(data.count || 0),
      windowStart: Number(data.windowStart || 0),
      now,
    });
    if (!gate.ok) {
      throw new HttpsError("resource-exhausted", "Too many requests. Try again shortly.");
    }
    tx.set(
      ref,
      {
        uid,
        action,
        count: gate.nextCount,
        windowStart: gate.windowStart,
        windowMs: spec.windowMs,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export async function noteAppCheck(request: CallableLike, action: string) {
  if (request.app) return;
  const uid = request.auth?.uid || "anonymous";
  try {
    await db()
      .collection("abuseSignals")
      .add({
        kind: "missing_app_check",
        action,
        uid,
        anonymous: isAnonymousAuth(request),
        at: FieldValue.serverTimestamp(),
      });
  } catch {
    /* monitoring must not fail the request */
  }
}

export async function flagAutomation(input: {
  uid: string;
  action: string;
  anonymous: boolean;
  eventsInWindow: number;
  identicalPayloads?: number;
  missingAppCheck?: boolean;
}) {
  const signal = automatedActivityScore({
    eventsInWindow: input.eventsInWindow,
    windowMs: 60_000,
    uniqueActions: 1,
    identicalPayloads: input.identicalPayloads || 0,
    missingAppCheck: input.missingAppCheck,
  });
  if (!signal.automated) return;
  await db().collection("abuseSignals").add({
    kind: "automated_activity",
    action: input.action,
    uid: input.uid,
    anonymous: input.anonymous,
    flags: signal.flags,
    score: signal.score,
    at: FieldValue.serverTimestamp(),
  });
}

export async function writeAudit(row: Omit<ContentAudit, "id" | "at"> & { at?: string }) {
  await db()
    .collection("contentAudits")
    .add({
      ...row,
      at: row.at || new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
    });
}
