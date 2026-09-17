import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { HANDLE_RE, handleError, normalizeHandle, sanitizeCatalog } from "../../shared/bio";
import type {
  AccessClaims,
  CheckHandleAvailableRequest,
  ClaimBioOfferRequest,
  CreateBusinessProfileRequest,
  RecordBioTapRequest,
  SetBioOfferRequest,
  TransferHandleRequest,
  UpdateBusinessProfileRequest,
} from "../../shared/airpal-security";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import { writeAuthoritativeEvent } from "./analytics";
import { CALLABLE, db, isPlatformAdmin, requireAccount, requireAuth } from "./admin";

export const checkHandleAvailable = onCall(CALLABLE, async (request) => {
  const handle = normalizeHandle(String((request.data as CheckHandleAvailableRequest | undefined)?.handle || ""));
  const err = handleError(handle);
  if (err) return { ok: false as const, reason: err };
  const snap = await db.collection("handles").doc(handle).get();
  if (!snap.exists) return { ok: true as const };
  const owner = String(snap.data()?.ownerUid || "");
  if (request.auth?.uid && owner === request.auth.uid) return { ok: true as const };
  return { ok: false as const, reason: "Taken" };
});

export const createBusinessProfile = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request, "Create an email account.");
  const data = (request.data || {}) as CreateBusinessProfileRequest;
  const handle = normalizeHandle(String(data.handle || ""));
  const err = handleError(handle);
  if (err) throw new HttpsError("invalid-argument", err);
  const name = String(data.name || "").trim();
  if (!name) throw new HttpsError("invalid-argument", "Name is required.");
  const existingHandle = await db.collection("handles").doc(handle).get();
  if (existingHandle.exists && String(existingHandle.data()?.ownerUid) !== uid) {
    throw new HttpsError("already-exists", "Taken");
  }
  const owned = await db.collection("profiles").where("ownerUid", "==", uid).limit(1).get();
  const profileId = existingHandle.exists
    ? String(existingHandle.data()?.profileId)
    : owned.empty
      ? `bio-${randomBytes(4).toString("hex")}`
      : owned.docs[0]!.id;
  const previous = await db.collection("handles").where("ownerUid", "==", uid).get();
  const stale = previous.docs.filter((row) => row.id !== handle);
  await db.collection("handles").doc(handle).set({ handle, profileId, ownerUid: uid });
  await Promise.all(stale.map((row) => row.ref.delete()));
  await db
    .collection("profiles")
    .doc(profileId)
    .set(
      {
        id: profileId,
        handle,
        ownerUid: uid,
        name,
        shortWhy: String(data.shortWhy || "").trim(),
        city: String(data.city || "Sydney").trim(),
        category: String(data.category || "eat"),
        hours: "See bio",
        openNow: true,
        placeId: data.placeId ? String(data.placeId) : null,
        listingId: data.listingId ? String(data.listingId) : null,
        links: [],
        products: [],
        services: [],
        deals: [],
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  return { profileId, handle };
});

export const updateBusinessProfile = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const data = (request.data || {}) as UpdateBusinessProfileRequest;
  const handle = normalizeHandle(String(data.handle || ""));
  const href = await db.collection("handles").doc(handle).get();
  if (!href.exists) throw new HttpsError("not-found", "No handle.");
  if (String(href.data()?.ownerUid) !== uid) throw new HttpsError("permission-denied", "Not yours.");
  const profileId = String(href.data()?.profileId);
  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  for (const key of [
    "name",
    "shortWhy",
    "city",
    "category",
    "hours",
    "phone",
    "avatar",
    "cover",
    "mapsPlaceId",
    "listingId",
    "placeId",
  ] as const) {
    if (data[key] !== undefined) patch[key] = data[key];
  }
  if (typeof data.openNow === "boolean") patch.openNow = data.openNow;
  if (data.links) patch.links = data.links;
  if (data.products) patch.products = sanitizeCatalog("product", data.products);
  if (data.services) patch.services = sanitizeCatalog("service", data.services);
  if (data.deals) {
    patch.deals = sanitizeCatalog("deal", data.deals);
    const first = (patch.deals as ReturnType<typeof sanitizeCatalog>)[0];
    patch.offer = first ? { badge: first.badge || first.title, detail: first.detail } : null;
  }
  await db.collection("profiles").doc(profileId).set(patch, { merge: true });
  return { ok: true as const };
});

export const setBioOffer = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const data = (request.data || {}) as SetBioOfferRequest;
  const handle = normalizeHandle(String(data.handle || ""));
  const href = await db.collection("handles").doc(handle).get();
  if (!href.exists || String(href.data()?.ownerUid) !== uid) throw new HttpsError("permission-denied", "Not yours.");
  const profileId = String(href.data()?.profileId);
  const active = data.active !== false && String(data.badge || "").trim();
  await db
    .collection("profiles")
    .doc(profileId)
    .set(
      {
        offer: active ? { badge: String(data.badge).trim(), detail: String(data.detail || "").trim() } : null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  return { ok: true as const };
});

export const recordBioTap = onCall(CALLABLE, async (request) => {
  if (request.auth?.uid) await enforceRateLimit(request.auth.uid, "bioTap", isAnonymousAuth(request));
  const data = (request.data || {}) as RecordBioTapRequest;
  const handle = normalizeHandle(String(data.handle || ""));
  if (!HANDLE_RE.test(handle)) throw new HttpsError("invalid-argument", "Bad handle.");
  const href = await db.collection("handles").doc(handle).get();
  if (!href.exists) return { ok: true as const };
  const profileId = String(href.data()?.profileId);
  const day = new Date().toISOString().slice(0, 10);
  const ref = db.collection("profiles").doc(profileId).collection("taps").doc(day);
  await ref.set({ day, taps: FieldValue.increment(1), lastKind: String(data.kind || "view") }, { merge: true });
  return { ok: true as const };
});

export const claimBioOffer = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "claimBioOffer");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "claim", isAnonymousAuth(request));
  const data = (request.data || {}) as ClaimBioOfferRequest;
  const handle = normalizeHandle(String(data.handle || ""));
  const dealId = String(data.dealId || "").trim();
  if (!HANDLE_RE.test(handle) || !dealId) throw new HttpsError("invalid-argument", "Handle and deal are required.");
  const href = await db.collection("handles").doc(handle).get();
  if (!href.exists) throw new HttpsError("not-found", "No bio.");
  const profileId = String(href.data()?.profileId);
  const snap = await db.collection("profiles").doc(profileId).get();
  const profile = snap.data() || {};
  const deals = Array.isArray(profile.deals) ? profile.deals : [];
  const offer = profile.offer as { badge?: string; detail?: string } | undefined;
  const deal =
    deals.find((row: { id?: string }) => row.id === dealId) ||
    (dealId === "offer" && offer
      ? { id: "offer", title: offer.badge, detail: offer.detail, badge: offer.badge }
      : null);
  if (!deal) throw new HttpsError("not-found", "No deal.");
  const claimId = `${uid}_${dealId}`;
  const existing = await db.collection("profiles").doc(profileId).collection("claims").doc(claimId).get();
  if (existing.exists && String(existing.data()?.expiresAt || "") > new Date().toISOString()) {
    return {
      code: String(existing.data()?.code),
      badge: String(existing.data()?.badge || deal.badge || deal.title),
      detail: String(existing.data()?.detail || deal.detail || ""),
      expiresAt: String(existing.data()?.expiresAt),
    };
  }
  const code = randomBytes(3).toString("hex").toUpperCase();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const row = {
    uid,
    handle,
    dealId,
    code,
    badge: String(deal.badge || deal.title || "Offer"),
    detail: String(deal.detail || ""),
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
  };
  await db.collection("profiles").doc(profileId).collection("claims").doc(claimId).set(row);
  await writeAuthoritativeEvent({
    uid,
    eventName: "offer_claim",
    contextId: handle,
    contextType: "bio",
    source: "internal",
    anonymous: isAnonymousAuth(request),
    properties: { offerId: dealId, partnerId: handle, claimId, contextId: handle },
  });
  return { code, badge: row.badge, detail: row.detail, expiresAt };
});

export const transferHandle = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const data = (request.data || {}) as TransferHandleRequest;
  const from = normalizeHandle(String(data.from || ""));
  const to = normalizeHandle(String(data.to || ""));
  const err = handleError(to);
  if (err) throw new HttpsError("invalid-argument", err);
  const href = await db.collection("handles").doc(from).get();
  if (!href.exists) throw new HttpsError("not-found", "No handle.");
  const owner = String(href.data()?.ownerUid || "");
  const admin = isPlatformAdmin((request.auth?.token || {}) as AccessClaims);
  if (owner !== uid && !admin) throw new HttpsError("permission-denied", "Not yours.");
  const taken = await db.collection("handles").doc(to).get();
  if (taken.exists) throw new HttpsError("already-exists", "Taken");
  const profileId = String(href.data()?.profileId);
  await db.collection("handles").doc(to).set({ handle: to, profileId, ownerUid: owner });
  await db.collection("handles").doc(from).delete();
  await db
    .collection("profiles")
    .doc(profileId)
    .set({ handle: to, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { handle: to, profileId };
});

export const listBioDirectory = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  if (!isPlatformAdmin((request.auth?.token || {}) as AccessClaims)) {
    throw new HttpsError("permission-denied", "Admin only.");
  }
  void uid;
  const snap = await db.collection("handles").limit(200).get();
  const rows = await Promise.all(
    snap.docs.map(async (row) => {
      const profileId = String(row.data()?.profileId || "");
      const profile = profileId ? await db.collection("profiles").doc(profileId).get() : null;
      const day = new Date().toISOString().slice(0, 10);
      const taps = profileId ? await db.collection("profiles").doc(profileId).collection("taps").doc(day).get() : null;
      return {
        handle: row.id,
        name: String(profile?.data()?.name || row.id),
        ownerUid: row.data()?.ownerUid ? String(row.data()?.ownerUid) : undefined,
        taps: Number(taps?.data()?.taps || 0),
      };
    }),
  );
  return { rows };
});

/**
 * One human, one shelf. When this verified email owns profiles stranded on
 * other sign-ins (old uid, other device), copy them onto this account and
 * mark the orphans. Never deletes — the old rows stay readable for audit.
 */
export const adoptProfilesByEmail = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request, "Sign in to claim your profiles.");
  const token = (request.auth?.token || {}) as AccessClaims & { email?: string; email_verified?: boolean };
  const email = String(token.email || "").toLowerCase();
  if (!email || token.email_verified !== true) {
    throw new HttpsError("failed-precondition", "Verify your email first — unverified addresses can't claim profiles.");
  }
  const orphans = await db
    .collectionGroup("profiles")
    .where("ownerEmail", "==", email)
    .get();
  let adopted = 0;
  const now = new Date().toISOString();
  for (const doc of orphans.docs) {
    const data = doc.data() as { ownerUid?: string; adoptedBy?: string };
    if (String(data.ownerUid || "") === uid || data.adoptedBy) continue;
    const copy = { ...data, ownerUid: uid, adoptedFrom: doc.ref.path, updatedAt: now };
    await db.collection("users").doc(uid).collection("profiles").doc(doc.id).set(copy, { merge: true });
    await doc.ref.set({ adoptedBy: uid, adoptedAt: now }, { merge: true });
    adopted += 1;
  }
  return { ok: true as const, adopted };
});
