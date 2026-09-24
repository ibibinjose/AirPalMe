import { randomInt } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  adminCanTransition,
  canPublish,
  offerTargetValid,
  ownerCanTransition,
  validatePromotionDraft,
  entryReferenceFor,
  winnerCanTransition,
  ENTRY_POINTS,
  REFERRAL_POINTS,
  type CreatePromotionRequest,
  type DrawWinnersRequest,
  type EnterPromotionRequest,
  type MechanicType,
  type NotificationKind,
  type Promotion,
  type PromotionStatus,
  type RedeemPointsRequest,
  type ReviewPromotionRequest,
  type SetWeeklyCampaignRequest,
  type SetWinnerStatusRequest,
  type WinnerStatus,
} from "../../shared/promotions";
import { enforceRateLimit, noteAppCheck } from "./abuse";
import { CALLABLE, auth, db, isPlatformAdmin, requireAccount, requireAuth } from "./admin";
import { isAnonymousAuth } from "./abuse";
import { sendPushIfAllowed } from "./notifications";
import type { AccessClaims } from "../../shared/airpal-security";

function slugFor(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 48);
  return `${base || "promo"}-${Date.now().toString(36)}`;
}

/** Chance-based mechanics always need human legal review before they can go live. */
function defaultLegalStatus(mechanic: MechanicType): Promotion["legalReviewStatus"] {
  return mechanic === "giveaway" || mechanic === "free_entry" || mechanic === "referral" || mechanic === "challenge"
    ? "pending"
    : "not_required";
}

async function writePromotionAudit(input: {
  promotionId: string;
  actorUid: string;
  action: string;
  from: string;
  to: string;
  reason?: string;
}) {
  await db.collection("promotion_audit_logs").add({
    promotionId: input.promotionId,
    actorUid: input.actorUid,
    action: input.action,
    from: input.from,
    to: input.to,
    reason: input.reason || "",
    at: new Date().toISOString(),
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function notifyUser(uid: string, kind: NotificationKind, title: string, body: string, promotionId: string) {
  if (!uid) return;
  await db.collection("promotion_notifications").add({
    uid,
    kind,
    title,
    body,
    promotionId,
    read: false,
    at: new Date().toISOString(),
    createdAt: FieldValue.serverTimestamp(),
  });
  await sendPushIfAllowed(uid, kind, title, body, promotionId);
}

/** Ledger grant. Points are earned, never bought; deltas may be negative for redemptions. */
async function grantPoints(uid: string, delta: number, reason: string, refId: string) {
  if (!uid || !delta) return;
  const ref = db.collection("rewards").doc(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? Number(snap.data()?.points || 0) : 0;
    tx.set(ref, { uid, points: current + delta, updatedAt: new Date().toISOString() }, { merge: true });
  });
  await db.collection("reward_transactions").add({
    uid,
    delta,
    reason,
    refId,
    at: new Date().toISOString(),
    createdAt: FieldValue.serverTimestamp(),
  });
}

/** D1 — venue-owner check: listings by ownerUid, properties by ownerId/members. */
export async function ownsOfferVenue(uid: string, targetType: string, targetId: string): Promise<boolean> {
  try {
    if (targetType === "place") {
      const byId = await db.collection("listings").doc(targetId).get();
      if (byId.exists && String(byId.data()?.ownerUid || "") === uid) return true;
      const byPlace = await db.collection("listings").where("ownerUid", "==", uid).limit(20).get();
      return byPlace.docs.some(
        (d) => d.id === targetId || String((d.data() as { placeId?: unknown }).placeId || "") === targetId,
      );
    }
    if (targetType === "stay") {
      const snap = await db.collection("properties").doc(targetId).get();
      if (!snap.exists) return false;
      const row = snap.data() as { ownerId?: unknown; members?: Record<string, unknown> };
      if (String(row.ownerId || "") === uid) return true;
      const role = row.members?.[uid];
      return role === "host_admin" || role === "staff";
    }
    return false;
  } catch {
    return false;
  }
}

export const createPromotion = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  await noteAppCheck(request, "createPromotion");
  const data = (request.data || {}) as CreatePromotionRequest;
  const errors = validatePromotionDraft(data as unknown as Record<string, unknown>);
  if (errors.length) throw new HttpsError("invalid-argument", errors.join(" "));
  if (data.kind !== "giveaway" && data.kind !== "promotion") {
    throw new HttpsError("invalid-argument", "kind must be giveaway or promotion.");
  }
  // D1 — offers land on transaction surfaces only, and venue offers belong
  // to the venue's owner. No external ad links, no other owner's venue promos.
  const targetType = String(data.targetType || "").trim();
  const targetId = String(data.targetId || "").trim();
  if (targetType || targetId) {
    if (!offerTargetValid(targetType, targetId)) {
      throw new HttpsError("invalid-argument", "Offer target must be a stay, event, place, mate, experience, or fashion surface.");
    }
    if ((targetType === "place" || targetType === "stay") && !(await ownsOfferVenue(uid, targetType, targetId))) {
      throw new HttpsError("permission-denied", "Offers for a place or stay must come from its owner.");
    }
  }

  const now = new Date().toISOString();
  const ref = await db.collection("promotions").add({
    kind: data.kind,
    type: data.mechanicType,
    title: String(data.title).trim(),
    slug: slugFor(String(data.title)),
    description: String(data.description).trim(),
    status: "draft" as PromotionStatus,
    mechanicType: data.mechanicType,
    legalReviewStatus: defaultLegalStatus(data.mechanicType),
    sponsorId: uid,
    sponsorName: String(data.sponsorName).trim(),
    category: String(data.category || "Local"),
    heroImage: String(data.heroImage || ""),
    gallery: [],
    prize: {
      title: String(data.prizeTitle || data.title).trim(),
      description: String(data.prizeDescription || ""),
      valueText: String(data.prizeValue || ""),
    },
    prizeValue: String(data.prizeValue || ""),
    eligibility: String(data.eligibility || "Open to AirPal members where permitted."),
    entryRules: String(data.entryRules || ""),
    entryMethod: data.entryMethod || "free_online",
    entryLimit: Math.max(1, Math.floor(Number(data.entryLimit ?? 1) || 1)),
    startAt: String(data.startAt),
    endAt: String(data.endAt),
    winnerAnnouncementAt: String(data.winnerAnnouncementAt || ""),
    winnerSelectionMethod: String(data.winnerSelectionMethod || "Random draw from eligible entries."),
    termsText: String(data.termsText).trim(),
    privacyNote: String(data.privacyNote || "Subject to the official promotion terms."),
    jurisdiction: String(data.jurisdiction || ""),
    contactEmail: String(data.contactEmail || ""),
    targetType: String(data.targetType || ""),
    targetId: String(data.targetId || ""),
    locationText: String(data.locationText || ""),
    featured: false,
    createdAt: now,
    updatedAt: now,
    createdBy: uid,
    ownerUid: uid,
  });
  await writePromotionAudit({
    promotionId: ref.id,
    actorUid: uid,
    action: "create",
    from: "",
    to: "draft",
  });
  return { ok: true, promotionId: ref.id };
});

const OWNER_EDITABLE: PromotionStatus[] = ["draft", "submitted", "rejected"];

export const updatePromotion = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const caller = (request.auth?.token || {}) as AccessClaims;
  const admin = isPlatformAdmin(caller);
  const data = (request.data || {}) as { promotionId?: string; patch?: Record<string, unknown> };
  const promotionId = String(data.promotionId || "");
  if (!promotionId) throw new HttpsError("invalid-argument", "promotionId is required.");
  const ref = db.collection("promotions").doc(promotionId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Promotion not found.");
  const promo = snap.data() as Promotion;
  if (!admin) {
    if (promo.ownerUid !== uid) throw new HttpsError("permission-denied", "Not your campaign.");
    if (!OWNER_EDITABLE.includes(promo.status)) {
      throw new HttpsError("failed-precondition", "Live campaigns can only be edited by an admin.");
    }
  }
  const patch = { ...(data.patch || {}) };
  // Never client-settable: ownership, status machine, featuring, legal sign-off.
  for (const k of [
    "ownerUid",
    "createdBy",
    "createdAt",
    "status",
    "featured",
    "legalReviewStatus",
    "sponsorId",
    "id",
    "slug",
  ]) {
    delete patch[k];
  }
  if (!Object.keys(patch).length) throw new HttpsError("invalid-argument", "Nothing to update.");
  // D1 — same target discipline on edits as on creation.
  if ("targetType" in patch || "targetId" in patch) {
    const nextType = String(patch.targetType ?? promo.targetType ?? "").trim();
    const nextId = String(patch.targetId ?? promo.targetId ?? "").trim();
    if ((nextType || nextId) && !offerTargetValid(nextType, nextId)) {
      throw new HttpsError("invalid-argument", "Offer target must be a stay, event, place, mate, experience, or fashion surface.");
    }
    if ((nextType === "place" || nextType === "stay") && !admin && !(await ownsOfferVenue(uid, nextType, nextId))) {
      throw new HttpsError("permission-denied", "Offers for a place or stay must come from its owner.");
    }
    patch.targetType = nextType;
    patch.targetId = nextId;
  }
  await ref.update({ ...patch, updatedAt: new Date().toISOString() });
  await writePromotionAudit({
    promotionId,
    actorUid: uid,
    action: "edit",
    from: promo.status,
    to: promo.status,
  });
  return { ok: true };
});

export const submitPromotion = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const caller = (request.auth?.token || {}) as AccessClaims;
  const admin = isPlatformAdmin(caller);
  const promotionId = String((request.data || {}).promotionId || "");
  if (!promotionId) throw new HttpsError("invalid-argument", "promotionId is required.");
  const ref = db.collection("promotions").doc(promotionId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Promotion not found.");
  const promo = snap.data() as Promotion;
  if (!admin && promo.ownerUid !== uid) {
    throw new HttpsError("permission-denied", "Not your campaign.");
  }
  const from = promo.status;
  const to: PromotionStatus = "submitted";
  const allowed = admin ? adminCanTransition(from, to) : ownerCanTransition(from, to);
  if (!allowed) throw new HttpsError("failed-precondition", `Cannot submit from ${from}.`);
  await ref.update({ status: to, updatedAt: new Date().toISOString() });
  await writePromotionAudit({ promotionId, actorUid: uid, action: "submit", from, to });
  await notifyUser(
    promo.ownerUid,
    "campaign_submitted",
    "Submitted for review",
    `${promo.title} is with the AirPal team.`,
    promotionId,
  );
  return { ok: true, status: to };
});

const DECISION_TO: Record<ReviewPromotionRequest["decision"], PromotionStatus | "featured" | "unfeatured"> = {
  approve: "approved",
  reject: "rejected",
  request_changes: "draft",
  publish: "live",
  pause: "paused",
  resume: "live",
  close: "closed",
  archive: "archived",
  feature: "featured",
  unfeature: "unfeatured",
};

export const reviewPromotion = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const caller = (request.auth?.token || {}) as AccessClaims;
  if (!isPlatformAdmin(caller)) {
    throw new HttpsError("permission-denied", "Only a platform admin can review promotions.");
  }
  const data = (request.data || {}) as ReviewPromotionRequest;
  const promotionId = String(data.promotionId || "");
  const target = DECISION_TO[data.decision];
  if (!promotionId || !target) throw new HttpsError("invalid-argument", "promotionId and decision are required.");
  const ref = db.collection("promotions").doc(promotionId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Promotion not found.");
  const promo = snap.data() as Promotion;

  if (target === "featured" || target === "unfeatured") {
    await ref.update({ featured: target === "featured", updatedAt: new Date().toISOString() });
    await writePromotionAudit({
      promotionId,
      actorUid: uid,
      action: target,
      from: promo.status,
      to: promo.status,
      reason: String(data.reason || ""),
    });
    return { ok: true, featured: target === "featured" };
  }

  const to = target as PromotionStatus;
  if (!adminCanTransition(promo.status, to)) {
    throw new HttpsError("failed-precondition", `Cannot move from ${promo.status} to ${to}.`);
  }
  if (to === "live" && !canPublish({ ...promo, status: promo.status === "scheduled" ? "scheduled" : "approved" })) {
    throw new HttpsError(
      "failed-precondition",
      "Legal review must be approved before publishing. Subject to the official promotion terms.",
    );
  }
  await ref.update({
    status: to,
    reviewedBy: uid,
    reviewedAt: FieldValue.serverTimestamp(),
    reviewReason: String(data.reason || ""),
    updatedAt: new Date().toISOString(),
  });
  if (to === "live") {
    const prior = await db.collection("promotion_terms").where("promotionId", "==", promotionId).get();
    await db.collection("promotion_terms").add({
      promotionId,
      version: prior.size + 1,
      text: String(promo.termsText || ""),
      at: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  const ownerNote = String(data.reason || "");
  if (data.decision === "approve" || data.decision === "publish") {
    await notifyUser(
      promo.ownerUid,
      "promotion_approved",
      "Campaign approved",
      `${promo.title} is ${to === "live" ? "live" : "approved"}.`,
      promotionId,
    );
  } else if (data.decision === "reject") {
    await notifyUser(
      promo.ownerUid,
      "promotion_rejected",
      "Campaign needs work",
      `${promo.title} was not approved. ${ownerNote}`,
      promotionId,
    );
  } else if (data.decision === "request_changes") {
    await notifyUser(
      promo.ownerUid,
      "campaign_changes_requested",
      "Changes requested",
      `${promo.title}: ${ownerNote || "see review notes"}.`,
      promotionId,
    );
  } else if (data.decision === "close") {
    const entrants = await db.collection("promotion_entries").where("promotionId", "==", promotionId).get();
    const seen = new Set<string>();
    for (const doc of entrants.docs) {
      const eu = String(doc.data()?.uid || "");
      if (eu && !seen.has(eu)) {
        seen.add(eu);
        await notifyUser(
          eu,
          "promotion_closed",
          "Giveaway closed",
          `${promo.title} has closed. Winners are announced soon.`,
          promotionId,
        );
      }
    }
  }
  await writePromotionAudit({
    promotionId,
    actorUid: uid,
    action: data.decision,
    from: promo.status,
    to,
    reason: String(data.reason || ""),
  });
  return { ok: true, status: to };
});

export const enterPromotion = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request, "Sign in to enter. Winners need a contactable account.");
  await noteAppCheck(request, "enterPromotion");
  await enforceRateLimit(uid, "enter", false);
  const data = (request.data || {}) as EnterPromotionRequest;
  const promotionId = String(data.promotionId || "");
  if (!promotionId) throw new HttpsError("invalid-argument", "promotionId is required.");

  const promoSnap = await db.collection("promotions").doc(promotionId).get();
  if (!promoSnap.exists) throw new HttpsError("not-found", "That giveaway does not exist.");
  const promo = promoSnap.data() as Promotion;
  const now = Date.now();
  if (promo.status !== "live") throw new HttpsError("failed-precondition", "This giveaway is not open.");
  if (promo.startAt && Date.parse(promo.startAt) > now) {
    throw new HttpsError("failed-precondition", "This giveaway has not started yet.");
  }
  if (promo.endAt && Date.parse(promo.endAt) <= now) {
    throw new HttpsError("failed-precondition", "This giveaway has closed.");
  }
  if (promo.kind !== "giveaway") {
    throw new HttpsError("failed-precondition", "This promotion does not take entries.");
  }
  if (promo.promoCode && String(data.code || "") !== promo.promoCode) {
    throw new HttpsError("failed-precondition", "A valid promotional code is required to enter.");
  }
  let referrerUid = "";
  const ref = String(data.ref || "").trim();
  if (ref && ref !== uid) {
    try {
      await auth.getUser(ref);
      referrerUid = ref;
    } catch {
      referrerUid = "";
    }
  }

  const entriesRef = db.collection("promotion_entries");
  const existing = await entriesRef.where("promotionId", "==", promotionId).where("uid", "==", uid).get();
  const limit = Math.max(1, Number(promo.entryLimit || 1));
  if (existing.size >= limit) {
    // Idempotent: re-entry returns the existing reference, never a duplicate.
    const first = existing.docs[0].data() as { reference?: string };
    return { ok: true, duplicate: true, reference: String(first.reference || "") };
  }

  const reference = entryReferenceFor(promotionId);
  await entriesRef.add({
    promotionId,
    uid,
    reference,
    referrerUid,
    status: "entered",
    createdAt: new Date().toISOString(),
  });
  await db
    .collection("promotions")
    .doc(promotionId)
    .update({
      entriesCount: FieldValue.increment(1),
      updatedAt: new Date().toISOString(),
    });
  await grantPoints(uid, ENTRY_POINTS, "giveaway_entry", promotionId);
  await notifyUser(
    uid,
    "entry_confirmed",
    "Entry confirmed",
    `You're in: ${promo.title}. Reference ${reference}.`,
    promotionId,
  );
  if (referrerUid) {
    await grantPoints(referrerUid, REFERRAL_POINTS, "referral_bonus", promotionId);
    await notifyUser(
      referrerUid,
      "referral_bonus",
      "A mate entered",
      `Someone joined ${promo.title} with your link. +${REFERRAL_POINTS} points.`,
      promotionId,
    );
  }
  return { ok: true, duplicate: false, reference };
});

function maskReference(reference: string): string {
  const r = String(reference || "");
  if (r.length < 6) return "••••";
  return `${r.slice(0, 8)}••${r.slice(-2)}`;
}

export const closeAndDraw = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const caller = (request.auth?.token || {}) as AccessClaims;
  if (!isPlatformAdmin(caller)) {
    throw new HttpsError("permission-denied", "Only a platform admin can run the draw.");
  }
  const data = (request.data || {}) as DrawWinnersRequest;
  const promotionId = String(data.promotionId || "");
  const winnerCount = Math.max(1, Math.min(10, Math.floor(Number(data.winnerCount) || 1)));
  if (!promotionId) throw new HttpsError("invalid-argument", "promotionId is required.");

  const ref = db.collection("promotions").doc(promotionId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Promotion not found.");
  const promo = snap.data() as Promotion;
  if (promo.kind !== "giveaway") throw new HttpsError("failed-precondition", "Only giveaways can be drawn.");
  if (promo.status !== "live" && promo.status !== "paused") {
    throw new HttpsError("failed-precondition", `Cannot draw from ${promo.status}.`);
  }

  const entriesSnap = await db.collection("promotion_entries").where("promotionId", "==", promotionId).get();
  if (entriesSnap.empty) throw new HttpsError("failed-precondition", "No entries to draw from.");
  const priorWinners = await db.collection("promotion_winners").where("promotionId", "==", promotionId).get();
  const drawnUids = new Set(priorWinners.docs.map((d) => String(d.data()?.uid || "")));
  const pool = entriesSnap.docs.filter((d) => !drawnUids.has(String(d.data()?.uid || "")));
  if (!pool.length) throw new HttpsError("failed-precondition", "Every entrant already has a draw result.");

  // Fisher–Yates with cryptographic randomness; full audit trail below.
  const order = [...pool];
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const picked = order.slice(0, winnerCount);
  const drawnAt = new Date().toISOString();
  const batch = db.batch();
  picked.forEach((doc, index) => {
    const entry = doc.data() as { uid?: string; reference?: string };
    batch.set(db.collection("promotion_winners").doc(), {
      promotionId,
      uid: String(entry.uid || ""),
      reference: String(entry.reference || ""),
      status: "selected" as WinnerStatus,
      drawIndex: priorWinners.size + index,
      drawnAt,
      note: "",
      updatedAt: drawnAt,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();

  const firstRef = String((picked[0].data() as { reference?: string }).reference || "");
  await ref.update({
    status: "closed" as PromotionStatus,
    entriesFrozenAt: drawnAt,
    entriesFrozenCount: entriesSnap.size,
    winnerNote: `Won by entry ${maskReference(firstRef)}`,
    updatedAt: drawnAt,
  });
  await writePromotionAudit({
    promotionId,
    actorUid: uid,
    action: "draw",
    from: promo.status,
    to: "closed",
    reason: `${picked.length} winner(s) from ${entriesSnap.size} entries (${pool.length} eligible)`,
  });
  for (const doc of picked) {
    const entry = doc.data() as { uid?: string };
    await notifyUser(
      String(entry.uid || ""),
      "winner_selected",
      "You've been selected",
      `${promo.title}: your entry was drawn. Verification is next — watch your inbox.`,
      promotionId,
    );
  }
  return { ok: true, winners: picked.length, entries: entriesSnap.size };
});

export const setWinnerStatus = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const caller = (request.auth?.token || {}) as AccessClaims;
  if (!isPlatformAdmin(caller)) {
    throw new HttpsError("permission-denied", "Only a platform admin can manage winners.");
  }
  const data = (request.data || {}) as SetWinnerStatusRequest;
  const winnerId = String(data.winnerId || "");
  const to = data.to;
  if (!winnerId || !to) throw new HttpsError("invalid-argument", "winnerId and status are required.");
  const ref = db.collection("promotion_winners").doc(winnerId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Winner not found.");
  const winner = snap.data() as { status?: WinnerStatus; promotionId?: string; uid?: string };
  const from = (winner.status || "selected") as WinnerStatus;
  if (!winnerCanTransition(from, to)) {
    throw new HttpsError("failed-precondition", `Cannot move winner from ${from} to ${to}.`);
  }
  await ref.update({ status: to, note: String(data.note || ""), updatedAt: new Date().toISOString() });
  const promotionId = String(winner.promotionId || "");
  await writePromotionAudit({
    promotionId,
    actorUid: uid,
    action: `winner:${to}`,
    from,
    to,
    reason: String(data.note || ""),
  });
  const wuid = String(winner.uid || "");
  if (to === "verified") {
    await notifyUser(
      wuid,
      "winner_verification",
      "Entry verified",
      "Your winning entry checks out. We'll be in touch about the prize.",
      promotionId,
    );
  } else if (to === "accepted") {
    await notifyUser(
      wuid,
      "prize_available",
      "Prize accepted",
      "Your prize is being arranged. Congratulations.",
      promotionId,
    );
  } else if (to === "disqualified" || to === "declined") {
    await notifyUser(
      wuid,
      "winner_update",
      "Draw update",
      `Your selected entry was ${to}. An alternate may be drawn.`,
      promotionId,
    );
  }
  return { ok: true, status: to };
});

export const recordPromotionView = onCall(CALLABLE, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "analytics", isAnonymousAuth(request));
  const promotionId = String((request.data || {}).promotionId || "");
  if (!promotionId) throw new HttpsError("invalid-argument", "promotionId is required.");
  await db
    .collection("promotions")
    .doc(promotionId)
    .update({
      viewsCount: FieldValue.increment(1),
      updatedAt: new Date().toISOString(),
    });
  return { ok: true };
});

export const recordPromotionClick = onCall(CALLABLE, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "analytics", isAnonymousAuth(request));
  const promotionId = String((request.data || {}).promotionId || "");
  if (!promotionId) throw new HttpsError("invalid-argument", "promotionId is required.");
  await db
    .collection("promotions")
    .doc(promotionId)
    .update({
      clicksCount: FieldValue.increment(1),
      updatedAt: new Date().toISOString(),
    });
  return { ok: true };
});

export const setWeeklyCampaign = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const caller = (request.auth?.token || {}) as AccessClaims;
  if (!isPlatformAdmin(caller)) {
    throw new HttpsError("permission-denied", "Only a platform admin can configure AirPal Weekly.");
  }
  const data = (request.data || {}) as SetWeeklyCampaignRequest;
  const weekId = String(data.weekId || "").trim();
  if (!weekId) throw new HttpsError("invalid-argument", "weekId is required.");
  await db
    .collection("promotion_weeks")
    .doc(weekId)
    .set(
      {
        weekId,
        giveawayId: String(data.giveawayId || ""),
        promotionId: String(data.promotionId || ""),
        experienceId: String(data.experienceId || ""),
        businessId: String(data.businessId || ""),
        destination: String(data.destination || ""),
        note: String(data.note || ""),
        updatedAt: new Date().toISOString(),
        updatedBy: uid,
      },
      { merge: true },
    );
  return { ok: true, weekId };
});

export const redeemPoints = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request, "Sign in to redeem member offers.");
  const data = (request.data || {}) as RedeemPointsRequest;
  const promotionId = String(data.promotionId || "");
  if (!promotionId) throw new HttpsError("invalid-argument", "promotionId is required.");
  const promoSnap = await db.collection("promotions").doc(promotionId).get();
  if (!promoSnap.exists) throw new HttpsError("not-found", "Offer not found.");
  const promo = promoSnap.data() as Promotion;
  if (promo.status !== "live") throw new HttpsError("failed-precondition", "This offer is not live.");
  if (promo.mechanicType !== "member")
    throw new HttpsError("failed-precondition", "This offer is not redeemable with points.");
  const cost = Math.max(1, Math.floor(Number(promo.pointsCost) || 0));
  if (!cost) throw new HttpsError("failed-precondition", "This offer has no points price.");

  const rewardRef = db.collection("rewards").doc(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(rewardRef);
    const balance = snap.exists ? Number(snap.data()?.points || 0) : 0;
    if (balance < cost) throw new HttpsError("failed-precondition", `You need ${cost} points (balance ${balance}).`);
    tx.set(rewardRef, { uid, points: balance - cost, updatedAt: new Date().toISOString() }, { merge: true });
  });
  const code = `RDM-${
    promotionId
      .replace(/[^a-zA-Z]/g, "")
      .substring(0, 4)
      .toUpperCase() || "AP"
  }-${1000 + randomInt(9000)}`;
  await db.collection("reward_transactions").add({
    uid,
    delta: -cost,
    reason: "member_offer_redeem",
    refId: promotionId,
    at: new Date().toISOString(),
    createdAt: FieldValue.serverTimestamp(),
  });
  await db.collection("promotion_redemptions").add({
    uid,
    promotionId,
    pointsSpent: cost,
    code,
    status: "active",
    at: new Date().toISOString(),
    createdAt: FieldValue.serverTimestamp(),
  });
  await notifyUser(
    uid,
    "points_redeemed",
    "Offer redeemed",
    `${promo.title} — show code ${code} in-store.`,
    promotionId,
  );
  return { ok: true, code };
});

/** Daily: nudge entrants of giveaways closing within 24h. Marketing mail, not transactional. */
export const promotionEndingSoon = onSchedule(
  { region: "us-central1", schedule: "every 24 hours", timeoutSeconds: 180 },
  async () => {
    const now = Date.now();
    const horizon = now + 24 * 3600000;
    const live = await db.collection("promotions").where("status", "==", "live").get();
    for (const doc of live.docs) {
      const promo = doc.data() as Promotion;
      const end = promo.endAt ? Date.parse(promo.endAt) : NaN;
      if (!Number.isFinite(end) || end <= now || end > horizon) continue;
      if (promo.kind !== "giveaway") continue;
      const remindedAt = promo.remindedAt ? Date.parse(String(promo.remindedAt)) : 0;
      if (remindedAt && now - remindedAt < 20 * 3600000) continue;
      const entries = await db.collection("promotion_entries").where("promotionId", "==", doc.id).limit(500).get();
      const seen = new Set<string>();
      for (const entry of entries.docs) {
        const eu = String(entry.data()?.uid || "");
        if (eu && !seen.has(eu)) {
          seen.add(eu);
          await notifyUser(
            eu,
            "promotion_ending_soon",
            "Closing soon",
            `${promo.title} closes in under 24 hours.`,
            doc.id,
          );
        }
      }
      await doc.ref.update({ remindedAt: new Date().toISOString() });
    }
  },
);

export const seedPromotionDemo = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const caller = (request.auth?.token || {}) as AccessClaims;
  if (!isPlatformAdmin(caller)) {
    throw new HttpsError("permission-denied", "Only a platform admin can seed demo campaigns.");
  }
  const now = Date.now();
  const start = new Date(now - 86400000).toISOString();
  const end = new Date(now + 6 * 86400000).toISOString();
  const announce = new Date(now + 7 * 86400000).toISOString();
  const demos: Array<Partial<Promotion> & { slug: string }> = [
    {
      slug: "airpal-weekend-demo",
      kind: "giveaway",
      type: "giveaway",
      title: "AirPal Weekend",
      description: "Win an AirPal Weekend experience: a stay, a dinner, and a local experience on us.",
      status: "live",
      mechanicType: "giveaway",
      legalReviewStatus: "approved",
      sponsorName: "AirPal",
      category: "AirPal",
      heroImage: "/media/harbour.jpg",
      prize: {
        title: "AirPal Weekend for two",
        description: "One-night stay, dinner for two, and a guided local experience.",
        valueText: "₹25,000 approx.",
        included: ["Accommodation", "Dining experience", "Local experience", "Event access"],
      },
      prizeValue: "₹25,000 approx.",
      eligibility: "Open to AirPal members aged 18+ where permitted.",
      entryRules: "One free entry per member. No purchase necessary.",
      entryMethod: "free_online",
      entryLimit: 1,
      startAt: start,
      endAt: end,
      winnerAnnouncementAt: announce,
      winnerSelectionMethod: "Random draw from eligible entries.",
      termsText: "Subject to the official promotion terms. No purchase necessary. Entry does not guarantee winning.",
      privacyNote: "Entry details are used only to run this giveaway.",
      jurisdiction: "Kerala, India",
      contactEmail: "hello@airpal.me",
      featured: true,
    },
    {
      slug: "kovalam-eats-week-demo",
      kind: "promotion",
      type: "discount",
      title: "Kovalam Eats Week",
      description: "20% off at participating Kovalam cafés, all week. Show this page in-store.",
      status: "live",
      mechanicType: "discount",
      legalReviewStatus: "not_required",
      sponsorName: "Kovalam Café Partners",
      category: "Food",
      heroImage: "/media/laneway.jpg",
      prize: { title: "20% off", description: "Dine-in discount at partner cafés.", valueText: "20% off" },
      prizeValue: "20% off",
      eligibility: "Open to all AirPal members.",
      entryRules: "",
      entryMethod: "free_online",
      entryLimit: 1,
      startAt: start,
      endAt: end,
      winnerAnnouncementAt: "",
      winnerSelectionMethod: "",
      termsText: "Subject to the official promotion terms. Valid for dine-in at participating venues.",
      privacyNote: "Subject to the official promotion terms.",
      jurisdiction: "Kerala, India",
      contactEmail: "hello@airpal.me",
      featured: false,
    },
  ];
  let created = 0;
  for (const demo of demos) {
    const dupe = await db.collection("promotions").where("slug", "==", demo.slug).limit(1).get();
    if (!dupe.empty) continue;
    const nowIso = new Date().toISOString();
    await db.collection("promotions").add({
      ...demo,
      sponsorId: uid,
      gallery: [],
      targetType: "",
      targetId: "",
      locationText: "Kovalam, Kerala",
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: uid,
      ownerUid: uid,
    });
    created += 1;
  }
  return { ok: true, created };
});
