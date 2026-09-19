import { FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  CIRCLE_BROADCAST_CAP,
  broadcastNeedsReview,
  isMarketingKind,
  validateBroadcast,
  type BroadcastAudience,
  type BroadcastStatus,
  type CreateBroadcastRequest,
  type ReviewBroadcastRequest,
} from "../../shared/notifications";
import type { AccessClaims } from "../../shared/airpal-security";
import type { NotificationKind, Promotion } from "../../shared/promotions";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import { CALLABLE, db, isPlatformAdmin, requireAccount } from "./admin";

/** Best-effort push. The inbox row is the record; push never blocks it. */
export async function sendPushIfAllowed(uid: string, kind: string, title: string, body: string, promotionId: string) {
  try {
    if (!uid) return;
    const userSnap = await db.collection("users").doc(uid).get();
    const optedOut = userSnap.exists ? Boolean(userSnap.data()?.marketingOptOut) : false;
    if (optedOut && isMarketingKind(kind)) return;
    const tokensSnap = await db.collection("users").doc(uid).collection("fcmTokens").get();
    const tokens = tokensSnap.docs.map((d) => String(d.data()?.token || "")).filter(Boolean);
    if (!tokens.length) return;
    await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: { promotionId, kind },
    });
  } catch {
    /* push unavailable (emulator, no keys) — inbox remains the source of truth */
  }
}

export async function fanOut(input: {
  uids: string[];
  kind: NotificationKind;
  title: string;
  body: string;
  promotionId: string;
  href: string;
}): Promise<number> {
  const seen = new Set<string>();
  let sent = 0;
  const batchSize = 400;
  let batch = db.batch();
  let ops = 0;
  const flush = async () => {
    if (ops > 0) await batch.commit();
    batch = db.batch();
    ops = 0;
  };
  for (const uid of input.uids) {
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);
    batch.set(db.collection("promotion_notifications").doc(), {
      uid,
      kind: input.kind,
      title: input.title,
      body: input.body,
      href: input.href,
      promotionId: input.promotionId,
      read: false,
      at: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
    });
    ops += 1;
    sent += 1;
    if (ops >= batchSize) await flush();
  }
  await flush();
  for (const uid of seen) {
    await sendPushIfAllowed(uid, input.kind, input.title, input.body, input.promotionId);
  }
  return sent;
}

async function ownerHandle(uid: string): Promise<string> {
  const userSnap = await db.collection("users").doc(uid).get();
  const fromUser = String(userSnap.data()?.handle || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  if (fromUser) return fromUser;
  const owned = await db.collection("handles").where("ownerUid", "==", uid).limit(1).get();
  return owned.empty ? "" : owned.docs[0]!.id;
}

async function circleAudienceUids(handle: string): Promise<string[]> {
  const snap = await db.collection("graph").doc(handle).collection("followers").limit(CIRCLE_BROADCAST_CAP).get();
  const uids = snap.docs.map((d) => String(d.data()?.uid || "")).filter(Boolean);
  return Array.from(new Set(uids));
}

export const createBroadcast = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "createBroadcast");
  const uid = requireAccount(request);
  await enforceRateLimit(uid, "broadcast", isAnonymousAuth(request));
  const caller = (request.auth?.token || {}) as AccessClaims;
  const admin = isPlatformAdmin(caller);
  const data = (request.data || {}) as CreateBroadcastRequest;
  const errors = validateBroadcast(data as unknown as Record<string, unknown>);
  if (errors.length) throw new HttpsError("invalid-argument", errors.join(" "));
  const rawAudience = String(data.audience || "circle");
  const audience: BroadcastAudience =
    rawAudience === "everyone" ? "everyone" : rawAudience === "promotion_entrants" ? "promotion_entrants" : "circle";
  const promotionId = String(data.promotionId || "");
  if (audience === "everyone" && !admin) {
    throw new HttpsError("permission-denied", "Only admins can message everyone.");
  }
  if (audience === "promotion_entrants") {
    const promoSnap = await db.collection("promotions").doc(promotionId).get();
    if (!promoSnap.exists) throw new HttpsError("not-found", "Campaign not found.");
    const promo = promoSnap.data() as Promotion;
    if (!admin && promo.ownerUid !== uid) {
      throw new HttpsError("permission-denied", "You can only message your own campaign audience.");
    }
  }
  let handle = "";
  if (audience === "circle") {
    handle = await ownerHandle(uid);
    if (!handle) throw new HttpsError("failed-precondition", "Claim a @handle first so your Circle can find you.");
  }
  const now = new Date().toISOString();
  const href = String(
    data.href || (audience === "circle" ? `/@${handle}` : promotionId ? `/giveaways/${promotionId}` : "/giveaways"),
  );
  const ref = await db.collection("broadcasts").add({
    ownerUid: uid,
    title: String(data.title).trim(),
    body: String(data.body).trim(),
    href,
    audience,
    promotionId,
    handle: handle || "",
    status: "draft" as BroadcastStatus,
    reviewReason: "",
    sentCount: 0,
    createdAt: now,
    updatedAt: now,
    sentAt: "",
  });
  if (broadcastNeedsReview(audience)) {
    await ref.update({ status: "submitted", updatedAt: new Date().toISOString() });
    return { ok: true as const, broadcastId: ref.id, status: "submitted" as const };
  }
  const uids = await circleAudienceUids(handle);
  const sent = await fanOut({
    uids,
    kind: "announcement",
    title: String(data.title).trim(),
    body: String(data.body).trim(),
    promotionId: ref.id,
    href,
  });
  await ref.update({
    status: "sent",
    sentCount: sent,
    sentAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return { ok: true as const, broadcastId: ref.id, status: "sent" as const, sent };
});

export const reviewBroadcast = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const caller = (request.auth?.token || {}) as AccessClaims;
  if (!isPlatformAdmin(caller)) {
    throw new HttpsError("permission-denied", "Only a platform admin can review broadcasts.");
  }
  const data = (request.data || {}) as ReviewBroadcastRequest;
  const broadcastId = String(data.broadcastId || "");
  if (!broadcastId || (data.decision !== "approve" && data.decision !== "reject")) {
    throw new HttpsError("invalid-argument", "broadcastId and decision are required.");
  }
  const ref = db.collection("broadcasts").doc(broadcastId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Broadcast not found.");
  const bc = snap.data() as {
    status?: BroadcastStatus;
    audience?: BroadcastAudience;
    promotionId?: string;
    ownerUid?: string;
    title?: string;
    body?: string;
    href?: string;
  };
  if (bc.status !== "submitted") {
    throw new HttpsError("failed-precondition", `Cannot review from ${bc.status || "unknown"}.`);
  }
  const reason = String(data.reason || "");
  if (data.decision === "reject") {
    await ref.update({ status: "rejected", reviewReason: reason, updatedAt: new Date().toISOString() });
    return { ok: true, status: "rejected" };
  }

  let uids: string[] = [];
  const promotionId = String(bc.promotionId || "");
  if (bc.audience === "everyone") {
    const users = await db.collection("users").limit(1000).get();
    uids = users.docs.map((d) => d.id);
  } else {
    const entries = await db.collection("promotion_entries").where("promotionId", "==", promotionId).get();
    uids = entries.docs.map((d) => String(d.data()?.uid || ""));
  }
  const sent = await fanOut({
    uids,
    kind: "announcement",
    title: String(bc.title || "Update"),
    body: String(bc.body || ""),
    promotionId,
    href: String(bc.href || "/giveaways"),
  });
  await ref.update({
    status: "sent",
    sentCount: sent,
    sentAt: new Date().toISOString(),
    reviewedBy: uid,
    updatedAt: new Date().toISOString(),
  });
  return { ok: true, status: "sent", sent };
});
