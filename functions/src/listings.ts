import { randomBytes } from "node:crypto";
import { FieldValue, GeoPoint } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { DEFAULT_PRECINCT_ID, isBusinessCategory, placeCategoryFor } from "../../shared/business";
import { clampBusinessPlan } from "../../shared/business-onboarding";
import { demoFlagAllowed, stampContentMeta } from "../../shared/content-meta";
import { emailMatchesWebsite } from "../../shared/google-place";
import type {
  AccessClaims,
  UpsertBusinessDealRequest,
  UpsertBusinessListingRequest,
} from "../../shared/airpal-security";
import { enforceRateLimit, noteAppCheck, writeAudit } from "./abuse";
import { writeAuthoritativeEvent } from "./analytics";
import { CALLABLE, auth, db, isPlatformAdmin, requireAccount } from "./admin";

export const upsertBusinessListing = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "upsertBusinessListing");
  const uid = requireAccount(request, "Create an email account to list a place.");
  await enforceRateLimit(uid, "listingWrite", false);
  const data = (request.data || {}) as UpsertBusinessListingRequest;
  const demo = demoFlagAllowed(isPlatformAdmin((request.auth?.token || {}) as AccessClaims), data.demo);
  const name = String(data.name || "").trim();
  const address = String(data.address || "").trim();
  const shortWhy = String(data.shortWhy || "").trim();
  const category = String(data.category || "eat");
  if (!name || !address || !shortWhy)
    throw new HttpsError("invalid-argument", "Name, address, and a short why are required.");
  if (!isBusinessCategory(category)) throw new HttpsError("invalid-argument", "Unknown category.");

  const authUser = await auth.getUser(uid);
  const email = (authUser.email || "").toLowerCase();
  let listingId = String(data.listingId || "").trim();
  if (!listingId) {
    const existing = await db.collection("listings").where("ownerUid", "==", uid).limit(1).get();
    listingId = existing.empty ? `list-${randomBytes(4).toString("hex")}` : existing.docs[0]!.id;
  } else {
    const snap = await db.collection("listings").doc(listingId).get();
    if (snap.exists && String(snap.data()?.ownerUid) !== uid) {
      throw new HttpsError("permission-denied", "Not your listing.");
    }
  }

  const placeId = listingId.replace(/^list-/, "pl-");
  const lat = Number(data.lat);
  const lng = Number(data.lng);
  const geo = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : { lat: -33.85955, lng: 151.20715 };
  const placeCategory = placeCategoryFor(category);
  const precinctId = String(data.precinctId || "").trim() || DEFAULT_PRECINCT_ID;
  const existingListing = await db.collection("listings").doc(listingId).get();
  const previous = existingListing.exists ? existingListing.data() : undefined;
  const website = String(data.website || "").trim() || String(previous?.website || "");
  const domainProof = emailMatchesWebsite(email, website);
  const abnProof = String(data.abnOrTaxId || "").replace(/\s/g, "").length >= 8 || Boolean(previous?.abnProof);
  const plan = clampBusinessPlan(String(data.plan || previous?.plan || "presence"), {
    domain: domainProof,
    abn: abnProof,
  });
  const meta = stampContentMeta(
    existingListing.exists
      ? (existingListing.data() as Partial<import("../../shared/content-meta").ContentMeta>)
      : undefined,
    {
      ownerUid: uid,
      ownerEmail: email,
      source: "partner",
      verifiedOwner: domainProof,
      reviewStatus: "approved",
    },
  );
  const listing = {
    id: listingId,
    placeId,
    ownerUid: uid,
    ownerEmail: email,
    name,
    category,
    placeCategory,
    address,
    geo,
    hours: String(data.hours || "See venue").trim(),
    shortWhy,
    heroImage: String(data.heroImage || "").trim() || null,
    phone: String(data.phone || "").trim(),
    status: "active" as const,
    precinctId,
    source: meta.source,
    verifiedOwner: meta.verifiedOwner,
    plan,
    abnProof,
    reviewStatus: meta.reviewStatus,
    createdAt: existingListing.exists
      ? existingListing.data()?.createdAt || FieldValue.serverTimestamp()
      : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    hoursVerifiedAt: FieldValue.serverTimestamp(),
    expiresAt: meta.expiresAt || null,
    mapsPlaceId: String(data.mapsPlaceId || "").trim() || String(previous?.mapsPlaceId || "") || null,
    website: website || null,
    ...(demo ? { demo: true as const } : {}),
  };

  await db.collection("listings").doc(listingId).set(listing, { merge: true });
  await db
    .collection("places")
    .doc(placeId)
    .set(
      {
        name,
        category: placeCategory,
        shortWhy,
        geo: new GeoPoint(geo.lat, geo.lng),
        hours: listing.hours,
        hoursVerifiedAt: FieldValue.serverTimestamp(),
        source: meta.source,
        status: "active",
        precinctId,
        address,
        ownerUid: uid,
        heroImage: listing.heroImage,
        verifiedPartner: plan === "featured" || plan === "partner",
        verifiedOwner: domainProof,
        plan,
        reviewStatus: meta.reviewStatus,
        mapsPlaceId: listing.mapsPlaceId,
        website: listing.website,
        phone: listing.phone,
        updatedAt: FieldValue.serverTimestamp(),
        ...(demo ? { demo: true as const } : {}),
      },
      { merge: true },
    );
  await db
    .collection("users")
    .doc(uid)
    .set({ uid, email, role: "host_admin", listingId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await writeAudit({
    collection: "listings",
    docId: listingId,
    action: existingListing.exists ? "update" : "create",
    actorUid: uid,
  });
  if (!existingListing.exists) {
    await writeAuthoritativeEvent({
      uid,
      eventName: "host_activation",
      contextId: listingId,
      contextType: "business",
      source: "internal",
      properties: { tenantId: uid, activationStep: "listing_created", contextId: listingId, actorRole: "host_admin" },
    });
  }
  return { listingId, placeId };
});

export const upsertBusinessDeal = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const data = (request.data || {}) as UpsertBusinessDealRequest;
  const listingId = String(data.listingId || "").trim();
  const badge = String(data.badge || "").trim();
  const detail = String(data.detail || "").trim();
  if (!listingId || !badge || !detail)
    throw new HttpsError("invalid-argument", "Listing, badge, and detail are required.");
  const snap = await db.collection("listings").doc(listingId).get();
  if (!snap.exists) throw new HttpsError("not-found", "Listing not found.");
  if (String(snap.data()?.ownerUid) !== uid) throw new HttpsError("permission-denied", "Not your listing.");
  const active = data.active !== false;
  const deal = active
    ? { badge, detail, expiry: String(data.expiry || "").trim() || null, claimHint: "Show AirPal" }
    : null;
  const placeId = String(snap.data()?.placeId || listingId.replace(/^list-/, "pl-"));
  await db
    .collection("listings")
    .doc(listingId)
    .set({ deal, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await db.collection("places").doc(placeId).set({ deal, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { ok: true as const, deal };
});
