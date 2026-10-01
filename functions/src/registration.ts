import { FieldValue, GeoPoint } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  buildHostProperty,
  hostSecretsFromProperty,
  parseHostPropertyKind,
  toPublicPropertyDoc,
} from "../../shared/host-property";
import { resolveCompetitorPolicy } from "../../shared/nearby";
import {
  buildDefaultRoomTokens,
  generateMarkerId,
  generatePropertyId,
  slugifyCity,
  slugifyHandle,
} from "../../shared/airpal-urls";
import {
  resolveRegistrationRole,
  type AccessClaims,
  type CompleteRegistrationRequest,
  type PropertyMemberRole,
} from "../../shared/airpal-security";
import { demoFlagAllowed } from "../../shared/content-meta";
import { DEMO_PROPERTY_ID, DEMO_PROPERTY_MARKER_ID, isDemoDocId } from "../../shared/demo-business";
import { enforceRateLimit, noteAppCheck } from "./abuse";
import { writeAuthoritativeEvent } from "./analytics";
import { writeAudit } from "./abuse";
import { CALLABLE, auth, db, isPlatformAdmin, platformAdminEmails, requireAccount, writeAccessClaims } from "./admin";

export const completeRegistration = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "completeRegistration");
  const uid = requireAccount(request, "Create an email account before opening a workspace.");
  await enforceRateLimit(uid, "listingWrite", false);

  const data = (request.data || {}) as CompleteRegistrationRequest;
  const authUser = await auth.getUser(uid);
  const email = (authUser.email || "").toLowerCase();
  if (!email) throw new HttpsError("failed-precondition", "An email address is required.");

  const existing = await db.collection("users").doc(uid).get();
  const propertyName = String(data.propertyName || "").trim();

  async function provisionProperty(): Promise<{
    propertyId: string;
    defaultRoomToken?: string;
    defaultRoomNumber?: string;
    lobbyMarkerId: string;
    handle: string;
    city: string;
  }> {
    const kind = parseHostPropertyKind(data.kind);
    const demo = demoFlagAllowed(isPlatformAdmin((request.auth?.token || {}) as AccessClaims), data.demo);
    const requestedPropertyId = String(data.propertyId || "").trim();
    const propertyId = demo
      ? isDemoDocId(requestedPropertyId)
        ? requestedPropertyId
        : DEMO_PROPERTY_ID
      : generatePropertyId();
    const handle = slugifyHandle(propertyName);
    const cityRaw = String(data.city || "").trim() || "Your city";
    const citySlug = slugifyCity(cityRaw);
    const geoLat = Number(data.geoLat);
    const geoLng = Number(data.geoLng);
    const geo = Number.isFinite(geoLat) && Number.isFinite(geoLng) ? { lat: geoLat, lng: geoLng } : undefined;
    const lobbyMarkerId = demo ? DEMO_PROPERTY_MARKER_ID : generateMarkerId();
    const { roomTokens, defaultRoomNumber, defaultRoomToken } = buildDefaultRoomTokens(kind, data.roomsCount);
    const property = buildHostProperty({
      propertyName,
      ownerEmail: email,
      ownerId: uid,
      kind,
      city: cityRaw,
      country: data.country,
      countryCode: data.countryCode,
      state: data.state,
      postalCode: data.postalCode,
      phoneCountryCode: data.phoneCountryCode,
      geo,
      wifiNetwork: data.wifiNetwork,
      wifiPassword: data.wifiPassword,
      tagline: data.tagline,
      address: data.address,
      phone: data.phone,
      roomsCount: data.roomsCount,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      breakfastHours: data.breakfastHours,
      breakfastLocation: data.breakfastLocation,
      breakfastType: data.breakfastType,
      breakfastPrice: data.breakfastPrice,
      id: propertyId,
    });
    property.handle = handle;
    property.slug = handle;
    property.citySlug = citySlug;
    property.vanityKey = `${citySlug}/${handle}`;
    property.roomTokens = roomTokens;
    property.lobbyMarkerId = lobbyMarkerId;
    const publicProperty = toPublicPropertyDoc(property);
    const secrets = hostSecretsFromProperty(property);
    await db
      .collection("properties")
      .doc(property.id)
      .set({
        ...publicProperty,
        ...(demo ? { demo: true as const } : {}),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    await db
      .collection("properties")
      .doc(property.id)
      .collection("private")
      .doc("hostSecrets")
      .set({
        ...secrets,
        updatedAt: FieldValue.serverTimestamp(),
      });
    // Host-only bidirectional room map (number ↔ token).
    const byNumber: Record<string, string> = {};
    for (const [token, number] of Object.entries(roomTokens)) byNumber[number] = token;
    await db.collection("properties").doc(property.id).collection("private").doc("roomMap").set({
      byToken: roomTokens,
      byNumber,
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (demo) {
      // Rebuilds mint fresh room tokens — clear stale qrCodes first so old
      // room scans stop resolving. Real properties never hit this path.
      const stale = await db.collection("properties").doc(property.id).collection("qrCodes").get();
      if (!stale.empty) {
        const sweep = db.batch();
        stale.docs.forEach((d) => {
          sweep.delete(d.ref);
        });
        await sweep.commit();
      }
    }
    // Public get-by-id room token docs (avoid guessing from room number alone).
    const batch = db.batch();
    for (const [token, number] of Object.entries(roomTokens)) {
      batch.set(db.collection("properties").doc(property.id).collection("qrCodes").doc(token), {
        type: "room",
        roomNumber: number,
        roomToken: token,
        propertyId: property.id,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    // Default lobby / entrance marker for /q/{markerHex}.
    const lobbyPolicy = resolveCompetitorPolicy({
      kind: "lobby",
      propertyKind: property.kind,
      allowCompetitors: false,
    });
    await db
      .collection("markers")
      .doc(lobbyMarkerId)
      .set({
        id: lobbyMarkerId,
        propertyId: property.id,
        propertyName: property.name,
        kind: "lobby",
        status: "active",
        label: `${property.name} · Lobby`,
        city: cityRaw,
        citySlug,
        handle,
        propertyKind: property.kind,
        allowCompetitors: lobbyPolicy.allowCompetitors,
        suppressCategories: lobbyPolicy.suppressCategories,
        ...(lobbyPolicy.trade ? { venueCategory: lobbyPolicy.trade } : {}),
        ...(geo ? { geo: new GeoPoint(geo.lat, geo.lng) } : {}),
        state: property.state || "",
        country: property.country || "",
        countryCode: property.countryCode || "",
        ...(demo ? { demo: true as const } : {}),
        createdAt: FieldValue.serverTimestamp(),
      });
    return {
      propertyId: property.id,
      defaultRoomToken,
      defaultRoomNumber,
      lobbyMarkerId,
      handle,
      city: cityRaw,
    };
  }

  if (existing.exists) {
    const profile = existing.data() || {};
    const propertyIds = Array.isArray(profile.propertyIds) ? [...profile.propertyIds] : [];
    const role = resolveRegistrationRole(email, String(data.role || profile.role || "guest"), platformAdminEmails());
    if (role === "super_admin") {
      await writeAccessClaims(uid, { platformAdmin: true });
      await existing.ref.set({ role: "super_admin", email, uid }, { merge: true });
    }
    let propertyId = propertyIds[0] || "";
    let provisioned: Awaited<ReturnType<typeof provisionProperty>> | null = null;
    if (propertyName && (role === "host_admin" || role === "super_admin")) {
      provisioned = await provisionProperty();
      propertyId = provisioned.propertyId;
      if (!propertyIds.includes(propertyId)) propertyIds.push(propertyId);
      await writeAccessClaims(uid, {
        platformAdmin: role === "super_admin",
        propertyId,
        memberRole: "host_admin",
      });
      await existing.ref.set(
        { propertyIds, role, displayName: data.displayName || profile.displayName },
        { merge: true },
      );
      await writeAuthoritativeEvent({
        uid,
        eventName: "host_activation",
        contextId: propertyId,
        contextType: "property",
        source: "internal",
        properties: {
          tenantId: uid,
          activationStep: "property_created",
          contextId: propertyId,
          actorRole: "host_admin",
        },
      });
      await writeAudit({ collection: "properties", docId: propertyId, action: "create", actorUid: uid });
    }
    return {
      uid,
      role,
      propertyId,
      propertyIds,
      defaultRoomToken: provisioned?.defaultRoomToken,
      defaultRoomNumber: provisioned?.defaultRoomNumber,
      lobbyMarkerId: provisioned?.lobbyMarkerId,
      handle: provisioned?.handle,
      city: provisioned?.city,
    };
  }

  const role = resolveRegistrationRole(email, data.role, platformAdminEmails());
  const displayName = String(data.displayName || "").trim() || (role === "guest" ? "Traveller" : "Host");
  let propertyId = "";
  const propertyIds: string[] = [];
  let provisioned: Awaited<ReturnType<typeof provisionProperty>> | null = null;

  if ((role === "host_admin" || role === "super_admin") && propertyName) {
    provisioned = await provisionProperty();
    propertyId = provisioned.propertyId;
    propertyIds.push(propertyId);
  }

  await writeAccessClaims(uid, {
    platformAdmin: role === "super_admin",
    propertyId: propertyId || undefined,
    memberRole: propertyId ? "host_admin" : undefined,
    role,
  });

  await db.collection("users").doc(uid).set({
    uid,
    email,
    displayName,
    role,
    propertyIds,
    createdAt: FieldValue.serverTimestamp(),
  });

  if (propertyId) {
    await writeAuthoritativeEvent({
      uid,
      eventName: "host_activation",
      contextId: propertyId,
      contextType: "property",
      source: "internal",
      properties: { tenantId: uid, activationStep: "property_created", contextId: propertyId, actorRole: "host_admin" },
    });
    await writeAudit({ collection: "properties", docId: propertyId, action: "create", actorUid: uid });
  }

  return {
    uid,
    role,
    propertyId,
    propertyIds,
    defaultRoomToken: provisioned?.defaultRoomToken,
    defaultRoomNumber: provisioned?.defaultRoomNumber,
    lobbyMarkerId: provisioned?.lobbyMarkerId,
    handle: provisioned?.handle,
    city: provisioned?.city,
  };
});

export const ensurePlatformAdmin = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const authUser = await auth.getUser(uid);
  const email = (authUser.email || "").toLowerCase();
  if (!platformAdminEmails().includes(email)) {
    throw new HttpsError("permission-denied", "This account is not on the platform admin allowlist.");
  }

  await writeAccessClaims(uid, { platformAdmin: true });
  const existing = await db.collection("users").doc(uid).get();
  const propertyIds = Array.isArray(existing.data()?.propertyIds) ? existing.data()?.propertyIds : [];
  await db
    .collection("users")
    .doc(uid)
    .set(
      {
        uid,
        email,
        displayName: existing.data()?.displayName || "Bibin Jose",
        role: "super_admin",
        propertyIds,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  return { uid, role: "super_admin" as const, propertyIds };
});

export const setPropertyMember = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const propertyId = String(request.data?.propertyId || "");
  const memberUid = String(request.data?.memberUid || "");
  const memberRole = request.data?.role as PropertyMemberRole;
  if (!propertyId || !memberUid || (memberRole !== "host_admin" && memberRole !== "staff")) {
    throw new HttpsError("invalid-argument", "propertyId, memberUid, and role are required.");
  }

  const caller = (request.auth?.token || {}) as AccessClaims;
  const propertySnap = await db.collection("properties").doc(propertyId).get();
  if (!propertySnap.exists) throw new HttpsError("not-found", "Property not found.");
  const property = propertySnap.data() || {};
  const callerManages = isPlatformAdmin(caller) || property.ownerId === uid || property.members?.[uid] === "host_admin";
  if (!callerManages) throw new HttpsError("permission-denied", "Only a host or platform admin can add staff.");

  const members = { ...(property.members || {}), [memberUid]: memberRole };
  await propertySnap.ref.update({ members, updatedAt: FieldValue.serverTimestamp() });

  const memberProfile = db.collection("users").doc(memberUid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(memberProfile);
    const ids: string[] = snap.exists ? [...(snap.data()?.propertyIds || [])] : [];
    if (!ids.includes(propertyId)) ids.push(propertyId);
    tx.set(
      memberProfile,
      {
        uid: memberUid,
        propertyIds: ids,
        role: memberRole === "host_admin" ? "host_admin" : snap.data()?.role === "host_admin" ? "host_admin" : "staff",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  const claims = await writeAccessClaims(memberUid, { propertyId, memberRole });
  return { ok: true, role: claims.role, propertyId, memberUid };
});

export const backfillOwnerClaims = onCall(CALLABLE, async (request) => {
  requireAccount(request);
  const caller = (request.auth?.token || {}) as AccessClaims;
  if (!isPlatformAdmin(caller)) {
    throw new HttpsError("permission-denied", "Only a platform admin can backfill ownership claims.");
  }

  const snapshot = await db.collection("properties").get();
  let updated = 0;
  for (const propertyDoc of snapshot.docs) {
    const data = propertyDoc.data() || {};
    const ownerId = String(data.ownerId || "");
    if (!ownerId) continue;
    const members = { ...(data.members || {}), [ownerId]: "host_admin" as const };
    await propertyDoc.ref.set({ members }, { merge: true });
    await writeAccessClaims(ownerId, { propertyId: propertyDoc.id, memberRole: "host_admin" });
    const userRef = db.collection("users").doc(ownerId);
    const userSnap = await userRef.get();
    const ids: string[] = userSnap.exists ? [...(userSnap.data()?.propertyIds || [])] : [];
    if (!ids.includes(propertyDoc.id)) ids.push(propertyDoc.id);
    await userRef.set(
      {
        uid: ownerId,
        propertyIds: ids,
        role: userSnap.data()?.role === "super_admin" ? "super_admin" : "host_admin",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    updated += 1;
  }
  return { updated };
});
