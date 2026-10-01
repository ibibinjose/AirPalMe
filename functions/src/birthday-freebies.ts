import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  BIRTHDAY_OFFER_STATUSES,
  offerVisibleFor,
  validateBirthdayOfferDraft,
  type AdminSetBirthdayOfferStatusRequest,
  type BirthdayOffer,
  type BirthdayOfferStatus,
  type CreateBirthdayOfferRequest,
  type ListBirthdayOffersRequest,
  type UpdateBirthdayOfferRequest,
} from "../../shared/birthday-freebies";
import { BIRTHDAY_FREEBIES_SEED } from "../../shared/birthday-freebies-seed";
import type { AccessClaims } from "../../shared/airpal-security";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import { CALLABLE, db, isPlatformAdmin, requireAccount } from "./admin";

const COLLECTION = "birthday_offers";

function normalizeRegions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(new Set(raw.map((r) => String(r).trim().toLowerCase()).filter(Boolean)));
}

function normalizeMonths(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(new Set(raw.map((m) => Number(m)).filter((m) => Number.isInteger(m) && m >= 1 && m <= 12))).sort(
    (a, b) => a - b,
  );
}

function toOffer(id: string, data: Record<string, unknown>): BirthdayOffer {
  return {
    id,
    brand: String(data.brand || ""),
    title: String(data.title || ""),
    description: String(data.description || ""),
    rewardText: String(data.rewardText || ""),
    category: data.category as BirthdayOffer["category"],
    regions: Array.isArray(data.regions) ? data.regions.map(String) : [],
    birthdayMonths: Array.isArray(data.birthdayMonths) ? data.birthdayMonths.map(Number) : [],
    howToClaim: String(data.howToClaim || ""),
    claimUrl: data.claimUrl ? String(data.claimUrl) : undefined,
    status: data.status as BirthdayOffer["status"],
    ownerUid: String(data.ownerUid || ""),
    ownerType: data.ownerType === "business" ? "business" : "admin",
    businessId: data.businessId ? String(data.businessId) : undefined,
    placeId: data.placeId ? String(data.placeId) : undefined,
    featured: Boolean(data.featured),
    adultOnly: data.adultOnly !== false,
    createdAt: String(data.createdAt || ""),
    updatedAt: String(data.updatedAt || ""),
    createdBy: String(data.createdBy || ""),
    editorial: Boolean(data.editorial),
    seedKey: data.seedKey ? String(data.seedKey) : undefined,
  };
}

export const createBirthdayOffer = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  await noteAppCheck(request, "createBirthdayOffer");
  await enforceRateLimit(uid, "listingWrite", isAnonymousAuth(request));
  const data = (request.data || {}) as CreateBirthdayOfferRequest;
  const draft = {
    brand: String(data.brand || "").trim(),
    title: String(data.title || "").trim(),
    description: String(data.description || "").trim(),
    rewardText: String(data.rewardText || "").trim(),
    category: data.category,
    regions: normalizeRegions(data.regions),
    birthdayMonths: normalizeMonths(data.birthdayMonths),
    howToClaim: String(data.howToClaim || "").trim(),
    claimUrl: String(data.claimUrl || "").trim(),
    status: data.status || "draft",
  };
  const errors = validateBirthdayOfferDraft(draft as unknown as Record<string, unknown>);
  if (errors.length) throw new HttpsError("invalid-argument", errors.join(" "));

  const claims = (request.auth?.token || {}) as AccessClaims;
  const admin = isPlatformAdmin(claims);
  const ownerType = admin && data.status === "live" ? "admin" : admin ? "admin" : "business";
  let status: BirthdayOfferStatus = "draft";
  if (admin && (data.status === "live" || data.status === "draft" || data.status === "archived")) {
    status = data.status;
  }

  const now = new Date().toISOString();
  const ref = await db.collection(COLLECTION).add({
    brand: draft.brand,
    title: draft.title,
    description: draft.description,
    rewardText: draft.rewardText,
    category: draft.category,
    regions: draft.regions,
    birthdayMonths: draft.birthdayMonths,
    howToClaim: draft.howToClaim,
    claimUrl: draft.claimUrl || "",
    status,
    ownerUid: uid,
    ownerType,
    businessId: String(data.businessId || "").trim(),
    placeId: String(data.placeId || "").trim(),
    featured: admin ? Boolean(data.featured) : false,
    adultOnly: data.adultOnly !== false,
    editorial: false,
    createdAt: now,
    updatedAt: now,
    createdBy: uid,
  });
  return { ok: true as const, offerId: ref.id };
});

export const updateBirthdayOffer = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  await noteAppCheck(request, "updateBirthdayOffer");
  await enforceRateLimit(uid, "listingWrite", isAnonymousAuth(request));
  const body = (request.data || {}) as UpdateBirthdayOfferRequest;
  const offerId = String(body.offerId || "").trim();
  if (!offerId) throw new HttpsError("invalid-argument", "offerId is required.");
  const ref = db.collection(COLLECTION).doc(offerId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Offer not found.");
  const existing = snap.data() || {};
  const claims = (request.auth?.token || {}) as AccessClaims;
  const admin = isPlatformAdmin(claims);
  if (!admin && String(existing.ownerUid) !== uid) {
    throw new HttpsError("permission-denied", "Only the owner or an admin can update this offer.");
  }

  const patch = body.patch || {};
  const next = {
    brand: patch.brand != null ? String(patch.brand).trim() : String(existing.brand || ""),
    title: patch.title != null ? String(patch.title).trim() : String(existing.title || ""),
    description: patch.description != null ? String(patch.description).trim() : String(existing.description || ""),
    rewardText: patch.rewardText != null ? String(patch.rewardText).trim() : String(existing.rewardText || ""),
    category: patch.category != null ? patch.category : existing.category,
    regions: patch.regions != null ? normalizeRegions(patch.regions) : normalizeRegions(existing.regions),
    birthdayMonths:
      patch.birthdayMonths != null ? normalizeMonths(patch.birthdayMonths) : normalizeMonths(existing.birthdayMonths),
    howToClaim: patch.howToClaim != null ? String(patch.howToClaim).trim() : String(existing.howToClaim || ""),
    claimUrl: patch.claimUrl != null ? String(patch.claimUrl).trim() : String(existing.claimUrl || ""),
    status: existing.status,
  };

  if (patch.status != null) {
    const want = String(patch.status) as BirthdayOfferStatus;
    if (!(BIRTHDAY_OFFER_STATUSES as readonly string[]).includes(want)) {
      throw new HttpsError("invalid-argument", "Invalid status.");
    }
    if (!admin && want === "live") {
      throw new HttpsError("permission-denied", "Only an admin can set an offer live.");
    }
    if (!admin && want === "archived" && String(existing.ownerUid) !== uid) {
      throw new HttpsError("permission-denied", "Cannot archive this offer.");
    }
    next.status = want;
  }

  const errors = validateBirthdayOfferDraft(next as unknown as Record<string, unknown>);
  if (errors.length) throw new HttpsError("invalid-argument", errors.join(" "));

  const update: Record<string, unknown> = {
    brand: next.brand,
    title: next.title,
    description: next.description,
    rewardText: next.rewardText,
    category: next.category,
    regions: next.regions,
    birthdayMonths: next.birthdayMonths,
    howToClaim: next.howToClaim,
    claimUrl: next.claimUrl,
    status: next.status,
    updatedAt: new Date().toISOString(),
  };
  if (patch.businessId != null) update.businessId = String(patch.businessId).trim();
  if (patch.placeId != null) update.placeId = String(patch.placeId).trim();
  if (patch.adultOnly != null) update.adultOnly = Boolean(patch.adultOnly);
  if (admin && patch.featured != null) update.featured = Boolean(patch.featured);

  await ref.set(update, { merge: true });
  return { ok: true as const };
});

export const listBirthdayOffers = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "listBirthdayOffers");
  const uid = request.auth?.uid || "";
  if (uid) await enforceRateLimit(uid, "analytics", isAnonymousAuth(request));
  else await enforceRateLimit("anon-birthday", "analytics", true);

  const q = (request.data || {}) as ListBirthdayOffersRequest;
  const region = String(q.region || "").trim().toLowerCase();
  const month = q.month != null ? Number(q.month) : undefined;
  const statusFilter = q.status || "live";

  const claims = (request.auth?.token || {}) as AccessClaims;
  const admin = uid ? isPlatformAdmin(claims) : false;

  // Admin "any": full catalog. Otherwise live public list; signed-in users also get own drafts.
  if (admin && statusFilter === "any") {
    const snap = await db.collection(COLLECTION).limit(500).get();
    const offers = snap.docs.map((d) => toOffer(d.id, d.data() as Record<string, unknown>));
    return { ok: true as const, offers: filterClientSide(offers, region, month, statusFilter, uid, admin) };
  }

  if (admin && statusFilter !== "live") {
    const snap = await db.collection(COLLECTION).where("status", "==", statusFilter).limit(400).get();
    const offers = snap.docs.map((d) => toOffer(d.id, d.data() as Record<string, unknown>));
    return { ok: true as const, offers: filterClientSide(offers, region, month, statusFilter, uid, admin) };
  }

  const liveSnap = await db.collection(COLLECTION).where("status", "==", "live").limit(400).get();
  const byId = new Map<string, Record<string, unknown>>();
  const idOrder: string[] = [];
  for (const d of liveSnap.docs) {
    byId.set(d.id, d.data() as Record<string, unknown>);
    idOrder.push(d.id);
  }
  if (uid) {
    const ownSnap = await db.collection(COLLECTION).where("ownerUid", "==", uid).limit(100).get();
    for (const d of ownSnap.docs) {
      if (!byId.has(d.id)) idOrder.push(d.id);
      byId.set(d.id, d.data() as Record<string, unknown>);
    }
  }
  const offers = idOrder.map((id) => toOffer(id, byId.get(id)!));
  return { ok: true as const, offers: filterClientSide(offers, region, month, statusFilter, uid, admin) };
});

function filterClientSide(
  offers: BirthdayOffer[],
  region: string,
  month: number | undefined,
  statusFilter: string,
  uid: string,
  admin: boolean,
): BirthdayOffer[] {
  return offers
    .filter((o) => {
      if (admin && statusFilter === "any") return true;
      if (o.status === "live") {
        if (region && month != null) return offerVisibleFor(o, month, region);
        if (region) return o.regions.map((r) => r.toLowerCase()).includes(region);
        if (month != null) return !o.birthdayMonths.length || o.birthdayMonths.includes(month);
        return true;
      }
      if (admin) return statusFilter === "any" || o.status === statusFilter;
      return uid && o.ownerUid === uid;
    })
    .sort((a, b) => {
      if (Boolean(b.featured) !== Boolean(a.featured)) return b.featured ? 1 : -1;
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });
}

export const adminSetBirthdayOfferStatus = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  await noteAppCheck(request, "adminSetBirthdayOfferStatus");
  const claims = (request.auth?.token || {}) as AccessClaims;
  if (!isPlatformAdmin(claims)) {
    throw new HttpsError("permission-denied", "Only a platform admin can set offer status.");
  }
  const body = (request.data || {}) as AdminSetBirthdayOfferStatusRequest;
  const offerId = String(body.offerId || "").trim();
  const status = String(body.status || "") as BirthdayOfferStatus;
  if (!offerId) throw new HttpsError("invalid-argument", "offerId is required.");
  if (!(BIRTHDAY_OFFER_STATUSES as readonly string[]).includes(status)) {
    throw new HttpsError("invalid-argument", "status must be draft, live, or archived.");
  }
  const ref = db.collection(COLLECTION).doc(offerId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Offer not found.");
  await ref.set({ status, updatedAt: new Date().toISOString() }, { merge: true });
  return { ok: true as const, status };
});

/** Admin-only upsert of editorial seed offers (idempotent by seedKey). */
export const seedBirthdayFreebies = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  await noteAppCheck(request, "seedBirthdayFreebies");
  const claims = (request.auth?.token || {}) as AccessClaims;
  if (!isPlatformAdmin(claims)) {
    throw new HttpsError("permission-denied", "Only a platform admin can seed birthday freebies.");
  }
  let created = 0;
  let updated = 0;
  const now = new Date().toISOString();
  for (const row of BIRTHDAY_FREEBIES_SEED) {
    const existing = await db.collection(COLLECTION).where("seedKey", "==", row.seedKey).limit(1).get();
    const payload = {
      ...row,
      ownerUid: uid,
      createdBy: uid,
      updatedAt: now,
    };
    if (existing.empty) {
      await db.collection(COLLECTION).add({ ...payload, createdAt: now });
      created += 1;
    } else {
      await existing.docs[0].ref.set(
        { ...payload, createdAt: String(existing.docs[0].data()?.createdAt || now) },
        { merge: true },
      );
      updated += 1;
    }
  }
  return { ok: true as const, created, updated, total: BIRTHDAY_FREEBIES_SEED.length };
});
