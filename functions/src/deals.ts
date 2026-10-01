import { randomBytes } from "node:crypto";
import { FieldValue, GeoPoint } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  guessPrecinctIdFromCityText,
  isPlaceCategory,
  resolveCompetitorPolicy,
  type PlaceCategory,
} from "../../shared/nearby";
import { generateMarkerId, slugifyHandle } from "../../shared/airpal-urls";
import {
  canClaimDeal,
  pinIsWellFormed,
  type AccessClaims,
  type ClaimDealRequest,
  type ClaimFreeVenuePresenceRequest,
  type ProvidePartnerDealRequest,
  type RedeemVoucherRequest,
  type ReviewPartnerClaimRequest,
  type StayContextPayload,
  type SubmitPartnerClaimRequest,
} from "../../shared/airpal-security";
import { clampBusinessPlan } from "../../shared/business-onboarding";
import { demoFlagAllowed } from "../../shared/content-meta";
import { DEMO_VENUE_ID, DEMO_VENUE_MARKER_ID, DEMO_VENUE_PLACE_ID } from "../../shared/demo-business";
import { emailMatchesWebsite } from "../../shared/google-place";
import { CATALOG_DEALS, CATALOG_VENUE_IDS } from "./catalog";
import { hashPin, verifyPin } from "./pin";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import { writeAuthoritativeEvent } from "./analytics";
import { CALLABLE, db, isPlatformAdmin, requireAccount, requireAuth } from "./admin";

function voucherIdFor(venueName: string): string {
  const prefix =
    venueName
      .replace(/[^a-zA-Z]/g, "")
      .substring(0, 4)
      .toUpperCase() || "AP";
  const suffix = String(10000 + (randomBytes(2).readUInt16BE(0) % 90000));
  return `CLM-${prefix}-${suffix}`;
}

function publicDealFromCatalog(dealId: string, extra: Record<string, unknown> | object = {}) {
  const catalog = CATALOG_DEALS[dealId];
  if (!catalog) return extra;
  return {
    ...catalog,
    claimsCount: 0,
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

export const claimDeal = onCall(CALLABLE, async (request) => {
  // Anonymous sessions are intentionally allowed: QR guests claim deals without email signup.
  await noteAppCheck(request, "claimDeal");
  const uid = requireAuth(request.auth?.uid);
  const anonymous = isAnonymousAuth(request);
  await enforceRateLimit(uid, "claim", anonymous);
  const data = (request.data || {}) as ClaimDealRequest;
  const dealId = String(data.dealId || "");
  const stayContext = data.stayContext as StayContextPayload | undefined;
  if (!dealId || !stayContext?.guestName) {
    throw new HttpsError("invalid-argument", "dealId and stay context are required.");
  }

  const dealRef = db.collection("businessDeals").doc(dealId);
  const userClaimRef = db.collection("users").doc(uid).collection("dealClaims").doc(dealId);
  const catalogHint = CATALOG_DEALS[dealId];
  const voucherId = voucherIdFor(String(catalogHint?.venueName || stayContext.title || dealId)).toUpperCase();
  const voucherRef = db.collection("vouchers").doc(voucherId);
  const userVoucherRef = db.collection("users").doc(uid).collection("vouchers").doc(voucherId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const voucher = await db.runTransaction(async (tx) => {
    const [dealSnap, claimSnap] = await Promise.all([tx.get(dealRef), tx.get(userClaimRef)]);
    const catalog = CATALOG_DEALS[dealId];
    const deal = (dealSnap.exists ? dealSnap.data() : catalog) as
      (typeof catalog & { claimsCount?: number; active?: boolean; claimLimit?: number }) | undefined;
    if (!deal) throw new HttpsError("not-found", "That deal does not exist.");

    const existingActive = claimSnap.exists && claimSnap.data()?.status === "active";
    if (existingActive) {
      const existingId = String(claimSnap.data()?.voucherId || "");
      const existingVoucher = await tx.get(db.collection("vouchers").doc(existingId));
      if (existingVoucher.exists) return existingVoucher.data();
    }

    const gate = canClaimDeal({
      active: deal.active !== false,
      claimLimit: deal.claimLimit,
      claimsCount: Number(deal.claimsCount || 0),
      existingActiveForUser: false,
    });
    if (!gate.ok) throw new HttpsError("failed-precondition", gate.reason);

    const record = {
      id: voucherId,
      uid,
      dealId,
      venueId: deal.venueId,
      venueName: deal.venueName,
      venueAddress: deal.venueAddress,
      category: deal.category,
      dealTitle: deal.title,
      guestPerk: deal.guestPerk,
      userContext: stayContext,
      claimedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: "active" as const,
      discountSummary: deal.discountBadge || deal.guestPerk,
    };

    const publicDeal = {
      ...publicDealFromCatalog(dealId, deal),
      claimsCount: Number(deal.claimsCount || 0) + 1,
      active: deal.active !== false,
      updatedAt: FieldValue.serverTimestamp(),
    };
    tx.set(dealRef, publicDeal, { merge: true });
    tx.set(voucherRef, record);
    tx.set(userVoucherRef, record);
    tx.set(userClaimRef, { voucherId, status: "active", dealId, updatedAt: now.toISOString() });
    return record;
  });

  await writeAuthoritativeEvent({
    uid,
    eventName: "offer_claim",
    contextId: String((voucher as { venueId?: string }).venueId || dealId),
    contextType: "business",
    source: "qr",
    anonymous,
    properties: {
      offerId: dealId,
      partnerId: String((voucher as { venueId?: string }).venueId || "unknown"),
      claimId: String((voucher as { id?: string }).id || dealId),
      contextId: String((voucher as { venueId?: string }).venueId || dealId),
    },
  });
  return { voucher };
});

export const redeemVoucher = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "redeemVoucher");
  const uid = requireAccount(request);
  await enforceRateLimit(uid, "redeem", false);
  const data = (request.data || {}) as RedeemVoucherRequest;
  const voucherId = String(data.voucherId || "")
    .trim()
    .toUpperCase();
  const staffPin = String(data.staffPin || "").trim();
  if (!voucherId || !pinIsWellFormed(staffPin)) {
    throw new HttpsError("invalid-argument", "Voucher code and a 4-8 digit staff PIN are required.");
  }

  const voucherRef = db.collection("vouchers").doc(voucherId);
  const now = new Date().toISOString();

  await db.runTransaction(async (tx) => {
    const voucherSnap = await tx.get(voucherRef);
    if (!voucherSnap.exists) throw new HttpsError("not-found", "Voucher code not found.");
    const voucher = voucherSnap.data() || {};
    if (voucher.status === "redeemed") {
      throw new HttpsError("failed-precondition", "This voucher has already been redeemed.");
    }
    if (new Date(String(voucher.expiresAt || 0)).getTime() <= Date.now()) {
      tx.update(voucherRef, { status: "expired" });
      throw new HttpsError("failed-precondition", "This voucher has expired.");
    }

    const secretSnap = await tx.get(db.collection("businessDealSecrets").doc(String(voucher.dealId)));
    if (!secretSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "This venue has not activated AirPal redemption yet. Ask the host to set a staff PIN.",
      );
    }
    if (!verifyPin(staffPin, String(secretSnap.data()?.pinHash || ""))) {
      throw new HttpsError("permission-denied", "Incorrect staff PIN.");
    }

    tx.update(voucherRef, {
      status: "redeemed",
      redeemedAt: now,
      redeemedByStaff: "venue-staff",
    });
    const ownerUid = String(voucher.uid || "");
    if (ownerUid) {
      tx.set(
        db.collection("users").doc(ownerUid).collection("vouchers").doc(voucherId),
        { status: "redeemed", redeemedAt: now, redeemedByStaff: "venue-staff" },
        { merge: true },
      );
      tx.set(
        db.collection("users").doc(ownerUid).collection("dealClaims").doc(String(voucher.dealId)),
        { status: "redeemed", updatedAt: now },
        { merge: true },
      );
    }
  });

  await writeAuthoritativeEvent({
    uid,
    eventName: "offer_redeem",
    source: "internal",
    properties: { offerId: voucherId, partnerId: "venue", claimId: voucherId, redemptionChannel: "staff_pin" },
  });
  return {
    ok: true as const,
    success: true as const,
    message: `Voucher ${voucherId} verified and redeemed.`,
    redeemedAt: now,
  };
});

export const providePartnerDeal = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request, "Sign in with a business account to publish a deal.");
  const caller = (request.auth?.token || {}) as AccessClaims;
  const data = (request.data || {}) as ProvidePartnerDealRequest;
  if (
    !data.venueName?.trim() ||
    !data.title?.trim() ||
    !data.guestPerk?.trim() ||
    !pinIsWellFormed(data.staffPin || "")
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Business name, deal title, guest perk, and a 4-8 digit staff PIN are required.",
    );
  }

  const allowed = await canProvidePartnerDeal(uid, caller, data.venueId);
  if (!allowed) {
    throw new HttpsError(
      "permission-denied",
      "Only an approved partner, property host, or platform admin can publish a partner deal.",
    );
  }

  const dealId = `deal-${randomBytes(6).toString("hex")}`;
  const publicDeal = {
    id: dealId,
    venueId: data.venueId || `venue-${randomBytes(3).toString("hex")}`,
    venueName: data.venueName.trim(),
    venueAddress: data.venueAddress?.trim() || "",
    category: data.category,
    categoryLabel: data.categoryLabel,
    title: data.title.trim(),
    description: data.description?.trim() || "",
    guestPerk: data.guestPerk.trim(),
    dealType: data.dealType || "all",
    discountBadge: data.discountBadge || "Special Offer",
    targetAudiences: data.targetAudiences || ["hotel"],
    terms: data.terms || "",
    claimLimit: data.claimLimit,
    claimsCount: 0,
    active: true,
    expiresAt: data.expiresAt,
    createdAt: new Date().toISOString(),
    createdBy: uid,
    priceLevel: data.priceLevel,
  };

  await db.collection("businessDeals").doc(dealId).set(publicDeal);
  await db
    .collection("businessDealSecrets")
    .doc(dealId)
    .set({
      pinHash: hashPin(data.staffPin),
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
    });

  return { deal: publicDeal };
});

export const submitPartnerClaim = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request, "Sign in to claim a business.");
  const data = (request.data || {}) as SubmitPartnerClaimRequest;
  const venueId = String(data.venueId || "");
  if (!venueId || !data.name?.trim() || !data.email?.trim() || !data.phone?.trim()) {
    throw new HttpsError("invalid-argument", "Venue, name, email, and phone are required.");
  }
  if (!CATALOG_VENUE_IDS.has(venueId) && !venueId.startsWith("partner-") && !venueId.startsWith("venue-")) {
    const venueSnap = await db.collection("partnerVenues").doc(venueId).get();
    if (!venueSnap.exists) throw new HttpsError("not-found", "That venue is not in the AirPal directory.");
  }

  const claimRef = db.collection("partnerClaims").doc();
  const claim = {
    id: claimRef.id,
    venueId,
    uid,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone.trim(),
    role: data.role?.trim() || "Owner",
    customPerk: data.customPerk?.trim() || "",
    abnOrTaxId: data.abnOrTaxId?.trim() || "",
    plan: clampBusinessPlan(String(data.plan || "presence"), {
      domain: false,
      abn: String(data.abnOrTaxId || "").replace(/\s/g, "").length >= 8,
    }),
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  };
  await claimRef.set({
    ...claim,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { claimId: claim.id, status: claim.status };
});

export const claimFreeVenuePresence = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request, "Sign in to claim a free venue presence.");
  const data = (request.data || {}) as ClaimFreeVenuePresenceRequest;
  const venueName = String(data.venueName || "").trim();
  const address = String(data.address || "").trim();
  const shortWhy = String(data.shortWhy || "").trim();
  if (!venueName || !address || !shortWhy) {
    throw new HttpsError("invalid-argument", "Venue name, address, and a short why are required.");
  }
  const demo = demoFlagAllowed(isPlatformAdmin((request.auth?.token || {}) as AccessClaims), data.demo);
  if (!demo) {
    const existing = await db.collection("markers").where("ownerUid", "==", uid).limit(1).get();
    if (!existing.empty) {
      const marker = existing.docs[0]!;
      return {
        venueId: String(marker.data()?.venueId || ""),
        markerId: marker.id,
        placeId: String(marker.data()?.placeId || ""),
        markerPath: `/q/${marker.id}`,
      };
    }
  }

  const ownerEmail = String(request.auth?.token?.email || "").toLowerCase();
  const website = String(data.website || "").trim();
  const plan = clampBusinessPlan(String(data.plan || "presence"), {
    domain: emailMatchesWebsite(ownerEmail, website),
    abn: String(data.abnOrTaxId || "").replace(/\s/g, "").length >= 8,
  });
  const precinctId = String(data.precinctId || "").trim() || guessPrecinctIdFromCityText(address) || "local";
  const rawCategory = String(data.category || "eat");
  const category: PlaceCategory = isPlaceCategory(rawCategory) ? rawCategory : "eat";
  const baseSlug = `${slugifyHandle(venueName)}-${randomBytes(2).toString("hex")}`;
  const placeId = demo ? DEMO_VENUE_PLACE_ID : baseSlug;
  const venueId = demo ? DEMO_VENUE_ID : `venue-${baseSlug}`;
  const markerId = demo ? DEMO_VENUE_MARKER_ID : generateMarkerId();
  const lat = Number(data.lat);
  const lng = Number(data.lng);
  const geo =
    Number.isFinite(lat) && Number.isFinite(lng) ? new GeoPoint(lat, lng) : new GeoPoint(-33.85945, 151.20835);

  await db
    .collection("partnerVenues")
    .doc(venueId)
    .set({
      id: venueId,
      name: venueName,
      address,
      phone: String(data.phone || ""),
      guestPerk: String(data.guestPerk || ""),
      status: "verified",
      claimedByOwner: true,
      ownerUid: uid,
      precinctId,
      markerId,
      placeId,
      plan,
      mapsPlaceId: String(data.mapsPlaceId || "").trim() || null,
      website: String(data.website || "").trim() || null,
      heroImage: String(data.heroImage || "").trim() || null,
      ...(demo ? { demo: true as const } : {}),
      createdAt: FieldValue.serverTimestamp(),
    });
  await db
    .collection("places")
    .doc(placeId)
    .set({
      name: venueName,
      category,
      shortWhy,
      geo,
      hours: String(data.hours || "See venue"),
      source: "partner",
      status: "active",
      precinctId,
      address,
      propertyId: "",
      mapsPlaceId: String(data.mapsPlaceId || "").trim() || null,
      website: String(data.website || "").trim() || null,
      heroImage: String(data.heroImage || "").trim() || null,
      phone: String(data.phone || "").trim() || null,
      ...(demo ? { demo: true as const } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
  const venuePolicy = resolveCompetitorPolicy({
    kind: "venue",
    venueCategory: category,
    allowCompetitors: false,
  });
  await db
    .collection("markers")
    .doc(markerId)
    .set({
      id: markerId,
      kind: "venue",
      status: "active",
      label: venueName,
      geo,
      precinctId,
      ownerUid: uid,
      placeId,
      venueId,
      venueCategory: venuePolicy.trade || category,
      allowCompetitors: false,
      suppressCategories: venuePolicy.suppressCategories,
      ...(demo ? { demo: true as const } : {}),
      createdAt: FieldValue.serverTimestamp(),
    });
  return { venueId, markerId, placeId, markerPath: `/q/${markerId}` };
});

export const reviewPartnerClaim = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const caller = (request.auth?.token || {}) as AccessClaims;
  if (!isPlatformAdmin(caller)) {
    throw new HttpsError("permission-denied", "Only a platform admin can review partner claims.");
  }
  const data = (request.data || {}) as ReviewPartnerClaimRequest;
  const claimId = String(data.claimId || "");
  if (!claimId || (data.decision !== "approved" && data.decision !== "rejected")) {
    throw new HttpsError("invalid-argument", "claimId and decision are required.");
  }

  const claimRef = db.collection("partnerClaims").doc(claimId);
  const snap = await claimRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Claim not found.");
  const claim = snap.data() || {};
  await claimRef.update({
    status: data.decision,
    reviewedBy: uid,
    reviewedAt: FieldValue.serverTimestamp(),
  });

  if (data.decision === "approved") {
    await db
      .collection("partnerVenues")
      .doc(String(claim.venueId))
      .set(
        {
          id: claim.venueId,
          claimedByOwner: true,
          claimedAt: new Date().toISOString(),
          claimedContact: {
            name: claim.name,
            email: claim.email,
            phone: claim.phone,
            role: claim.role,
          },
          guestPerk: claim.customPerk || "",
          status: "verified",
          ownerUid: claim.uid,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  }

  return { ok: true, status: data.decision };
});

async function canProvidePartnerDeal(
  uid: string,
  claims: AccessClaims | undefined,
  venueId?: string,
): Promise<boolean> {
  if (isPlatformAdmin(claims)) return true;
  const roles = Object.values(claims?.properties || {});
  if (roles.includes("host_admin")) return true;

  if (venueId) {
    const venueSnap = await db.collection("partnerVenues").doc(venueId).get();
    if (venueSnap.exists && String(venueSnap.data()?.ownerUid || "") === uid) return true;
  }

  const ownedVenues = await db.collection("partnerVenues").where("ownerUid", "==", uid).limit(1).get();
  if (!ownedVenues.empty) return true;

  const approvedClaim = await db
    .collection("partnerClaims")
    .where("uid", "==", uid)
    .where("status", "==", "approved")
    .limit(1)
    .get();
  return !approvedClaim.empty;
}
