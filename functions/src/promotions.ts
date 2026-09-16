import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  adminCanTransition,
  canPublish,
  ownerCanTransition,
  validatePromotionDraft,
  entryReferenceFor,
  type CreatePromotionRequest,
  type EnterPromotionRequest,
  type MechanicType,
  type Promotion,
  type PromotionStatus,
  type ReviewPromotionRequest,
} from "../../shared/promotions";
import { enforceRateLimit, noteAppCheck } from "./abuse";
import { CALLABLE, db, isPlatformAdmin, requireAccount } from "./admin";
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
  return mechanic === "giveaway" || mechanic === "free_entry" ||
    mechanic === "referral" || mechanic === "challenge"
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

export const createPromotion = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  await noteAppCheck(request, "createPromotion");
  const data = (request.data || {}) as CreatePromotionRequest;
  const errors = validatePromotionDraft(data as unknown as Record<string, unknown>);
  if (errors.length) throw new HttpsError("invalid-argument", errors.join(" "));
  if (data.kind !== "giveaway" && data.kind !== "promotion") {
    throw new HttpsError("invalid-argument", "kind must be giveaway or promotion.");
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
  for (const k of ["ownerUid", "createdBy", "createdAt", "status", "featured", "legalReviewStatus", "sponsorId", "id", "slug"]) {
    delete patch[k];
  }
  if (!Object.keys(patch).length) throw new HttpsError("invalid-argument", "Nothing to update.");
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

  const entriesRef = db.collection("promotion_entries");
  const existing = await entriesRef
    .where("promotionId", "==", promotionId)
    .where("uid", "==", uid)
    .get();
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
    status: "entered",
    createdAt: new Date().toISOString(),
  });
  return { ok: true, duplicate: false, reference };
});

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
      heroImage: "",
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
      contactEmail: "bibin.inc@gmail.com",
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
      heroImage: "",
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
      contactEmail: "bibin.inc@gmail.com",
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
