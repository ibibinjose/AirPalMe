import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { generateRoomToken } from "../../shared/airpal-urls";
import {
  canReadPropertyWifi,
  type AccessClaims,
  type GetPropertyWifiRequest,
  type GetPropertyWifiResponse,
} from "../../shared/airpal-security";
import { noteAppCheck } from "./abuse";
import { CALLABLE, db, isPlatformAdmin, requireAccount, requireAuth } from "./admin";

/** Guests (incl. anonymous QR sessions) reveal Wi-Fi via this callable — not the public property doc. */
export const getPropertyWifi = onCall(CALLABLE, async (request): Promise<GetPropertyWifiResponse> => {
  await noteAppCheck(request, "getPropertyWifi");
  const uid = requireAuth(request.auth?.uid);
  const data = (request.data || {}) as GetPropertyWifiRequest;
  const propertyId = String(data.propertyId || "").trim();
  if (!propertyId) throw new HttpsError("invalid-argument", "propertyId is required.");

  const propRef = db.collection("properties").doc(propertyId);
  const propSnap = await propRef.get();
  if (!propSnap.exists) throw new HttpsError("not-found", "Property not found.");
  const prop = propSnap.data() || {};
  const caller = (request.auth?.token || {}) as AccessClaims;
  const role = caller.properties?.[propertyId];
  const isHost = isPlatformAdmin(caller) || prop.ownerId === uid || role === "host_admin" || role === "staff";
  const roomToken = String(data.roomToken || "").trim();
  const markerId = String(data.markerId || "").trim();
  let markerBelongsToProperty = false;
  if (!isHost && markerId) {
    const markerSnap = await db.collection("markers").doc(markerId).get();
    markerBelongsToProperty = markerSnap.exists && String(markerSnap.data()?.propertyId || "") === propertyId;
  }
  if (
    !canReadPropertyWifi({
      isHost,
      roomTokens: (prop.roomTokens || null) as Record<string, string> | null,
      lobbyMarkerId: String(prop.lobbyMarkerId || "") || null,
      roomToken,
      markerId,
      markerBelongsToProperty,
    })
  ) {
    throw new HttpsError("permission-denied", "Scan the room or lobby QR for Wi-Fi.");
  }
  const wifi = (prop.wifi || {}) as { network?: string; password?: string; speed?: string };

  const secretsRef = propRef.collection("private").doc("hostSecrets");
  const secretsSnap = await secretsRef.get();
  const secrets = secretsSnap.data() || {};

  let password = String(secrets.wifiPassword || "");
  const network = String(wifi.network || secrets.wifiNetwork || "");
  const speed = String(wifi.speed || "");

  // Lazy migrate legacy public wifi.password into private/hostSecrets.
  if (!password && wifi.password) {
    password = String(wifi.password);
    await secretsRef.set(
      {
        wifiPassword: password,
        wifiNetwork: network,
        migratedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await propRef.set(
      {
        wifi: { network, password: "", speed },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  return { network, password, speed };
});

export const updatePropertyWifi = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const propertyId = String(request.data?.propertyId || "").trim();
  const network = String(request.data?.network || "").trim();
  const password = String(request.data?.password || "");
  const speed = String(request.data?.speed || "").trim();
  if (!propertyId || !network || !password.trim()) {
    throw new HttpsError("invalid-argument", "propertyId, network, and password are required.");
  }

  const caller = (request.auth?.token || {}) as AccessClaims;
  const propertyRef = db.collection("properties").doc(propertyId);
  const propertySnap = await propertyRef.get();
  if (!propertySnap.exists) throw new HttpsError("not-found", "Property not found.");
  const property = propertySnap.data() || {};
  const role = caller.properties?.[propertyId];
  if (!isPlatformAdmin(caller) && property.ownerId !== uid && role !== "host_admin") {
    throw new HttpsError("permission-denied", "Only a property host can rotate Wi-Fi credentials.");
  }

  const updatedAt = new Date().toISOString();
  await propertyRef.set(
    {
      wifi: { network, password: "", speed },
      wifiUpdatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await propertyRef.collection("private").doc("hostSecrets").set(
    {
      wifiNetwork: network,
      wifiPassword: password,
      wifiUpdatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { ok: true as const, updatedAt };
});

/** Hosts save guest-facing stay facts (hours, breakfast, facilities) without touching ACL or Wi-Fi secrets. */
export const updatePropertyProfile = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const propertyId = String(request.data?.propertyId || "").trim();
  if (!propertyId) throw new HttpsError("invalid-argument", "propertyId is required.");

  const caller = (request.auth?.token || {}) as AccessClaims;
  const propertyRef = db.collection("properties").doc(propertyId);
  const propertySnap = await propertyRef.get();
  if (!propertySnap.exists) throw new HttpsError("not-found", "Property not found.");
  const property = propertySnap.data() || {};
  const role = caller.properties?.[propertyId];
  if (!isPlatformAdmin(caller) && property.ownerId !== uid && role !== "host_admin") {
    throw new HttpsError("permission-denied", "Only a property host can update this stay.");
  }

  const str = (value: unknown, max = 240) => String(value || "").trim().slice(0, max);
  const breakfastIn = (request.data?.breakfast || {}) as Record<string, unknown>;
  const facilitiesIn = Array.isArray(request.data?.facilities)
    ? (request.data.facilities as Array<Record<string, unknown>>)
    : undefined;
  const patch: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (request.data?.name !== undefined) patch.name = str(request.data.name, 120);
  if (request.data?.tagline !== undefined) patch.tagline = str(request.data.tagline, 160);
  if (request.data?.address !== undefined) patch.address = str(request.data.address, 200);
  if (request.data?.phone !== undefined) patch.phone = str(request.data.phone, 40);
  if (request.data?.city !== undefined) patch.city = str(request.data.city, 80);
  if (request.data?.checkIn !== undefined) patch.checkIn = str(request.data.checkIn, 40);
  if (request.data?.checkOut !== undefined) patch.checkOut = str(request.data.checkOut, 40);
  if (request.data?.heroImage !== undefined) patch.heroImage = str(request.data.heroImage, 500);
  if (request.data?.breakfast) {
    patch.breakfast = {
      hours: str(breakfastIn.hours, 80),
      location: str(breakfastIn.location, 120),
      type: str(breakfastIn.type, 120),
      price: str(breakfastIn.price, 80),
    };
  }
  if (facilitiesIn) {
    patch.facilities = facilitiesIn.slice(0, 20).map((row: Record<string, unknown>) => ({
      name: str(row.name, 80),
      hours: str(row.hours, 80),
      floor: str(row.floor, 80),
      details: str(row.details, 200),
      icon: str(row.icon, 40) || "Sparkles",
    }));
  }
  const roomTypesIn = Array.isArray(request.data?.roomTypes)
    ? (request.data.roomTypes as Array<Record<string, unknown>>)
    : undefined;
  if (roomTypesIn) {
    const num = (value: unknown, fallback = 0) => {
      const n = Number(value);
      return Number.isFinite(n) && n >= 0 ? n : fallback;
    };
    patch.roomTypes = roomTypesIn.slice(0, 30).map((row: Record<string, unknown>) => ({
      id: str(row.id, 60) || `rt_${Date.now().toString(36)}`,
      name: str(row.name, 120),
      category: ["Standard", "Deluxe", "Suite", "Penthouse", "Villa"].includes(String(row.category))
        ? String(row.category)
        : "Standard",
      capacity: Math.max(1, Math.min(Math.floor(num(row.capacity, 1)) || 1, 12)),
      sizeSqm: row.sizeSqm === undefined || row.sizeSqm === null ? null : num(row.sizeSqm),
      bedConfig: str(row.bedConfig, 120),
      totalRooms: Math.max(0, Math.min(Math.floor(num(row.totalRooms)) || 0, 500)),
      startingPrice:
        row.startingPrice === undefined || row.startingPrice === null ? null : Math.max(0, num(row.startingPrice)),
      features: Array.isArray(row.features)
        ? (row.features as unknown[]).map((f) => str(f, 80)).filter(Boolean).slice(0, 12)
        : [],
      roomNumbers: Array.isArray(row.roomNumbers)
        ? (row.roomNumbers as unknown[]).map((n) => str(n, 20)).filter(Boolean).slice(0, 500)
        : [],
    }));
  }
  const roomStatusesIn =
    request.data?.roomStatuses && typeof request.data.roomStatuses === "object"
      ? (request.data.roomStatuses as Record<string, unknown>)
      : undefined;
  if (roomStatusesIn) {
    const clean: Record<string, string> = {};
    for (const [number, status] of Object.entries(roomStatusesIn).slice(0, 500)) {
      const key = str(number, 20);
      if (!key) continue;
      clean[key] = ["occupied", "vacant", "maintenance", "cleaning"].includes(String(status))
        ? String(status)
        : "vacant";
    }
    patch.roomStatuses = clean;
  }
  if (request.data?.confirmHours === true) {
    patch.hoursVerifiedAt = FieldValue.serverTimestamp();
  }

  await propertyRef.set(patch, { merge: true });
  return { ok: true as const, updatedAt: new Date().toISOString() };
});

export const rotateRoomToken = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const propertyId = String(request.data?.propertyId || "").trim();
  const roomNumber = String(request.data?.roomNumber || "").trim();
  if (!propertyId || !roomNumber) {
    throw new HttpsError("invalid-argument", "propertyId and roomNumber are required.");
  }

  const caller = (request.auth?.token || {}) as AccessClaims;
  const propertyRef = db.collection("properties").doc(propertyId);
  const propertySnap = await propertyRef.get();
  if (!propertySnap.exists) throw new HttpsError("not-found", "Property not found.");
  const property = propertySnap.data() || {};
  const role = caller.properties?.[propertyId];
  if (!isPlatformAdmin(caller) && property.ownerId !== uid && role !== "host_admin") {
    throw new HttpsError("permission-denied", "Only a property host can rotate a room token.");
  }

  const roomTokens = { ...((property.roomTokens || {}) as Record<string, string>) };
  let oldToken: string | undefined;
  for (const [token, number] of Object.entries(roomTokens)) {
    if (number === roomNumber) {
      oldToken = token;
      break;
    }
  }
  const newToken = generateRoomToken();
  if (oldToken) delete roomTokens[oldToken];
  roomTokens[newToken] = roomNumber;

  const byNumber: Record<string, string> = {};
  for (const [token, number] of Object.entries(roomTokens)) byNumber[number] = token;

  await propertyRef.set(
    {
      roomTokens,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await propertyRef.collection("private").doc("roomMap").set(
    {
      byToken: roomTokens,
      byNumber,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  if (oldToken) {
    await propertyRef
      .collection("qrCodes")
      .doc(oldToken)
      .delete()
      .catch(() => undefined);
  }
  await propertyRef
    .collection("qrCodes")
    .doc(newToken)
    .set({
      type: roomNumber === "lobby" ? "lobby" : "room",
      roomNumber,
      roomToken: newToken,
      propertyId,
      rotatedFrom: oldToken || null,
      createdAt: FieldValue.serverTimestamp(),
    });
  if (oldToken) {
    const markerSnap = await db.collection("markers").where("roomToken", "==", oldToken).limit(20).get();
    await Promise.all(markerSnap.docs.map((item) => item.ref.set({ roomToken: newToken }, { merge: true })));
  }

  return {
    ok: true as const,
    roomNumber,
    roomToken: newToken,
    previousToken: oldToken || null,
  };
});
