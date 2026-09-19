import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  HERE_MAX_HOURS,
  herePlaceKey,
  roundHereGeo,
  validateShareHere,
  type ShareHereRequest,
} from "../../shared/here";
import { CIRCLE_BROADCAST_CAP } from "../../shared/notifications";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import { CALLABLE, db, requireAccount } from "./admin";
import { fanOut } from "./notifications";

async function resolveHandle(uid: string): Promise<string> {
  const userSnap = await db.collection("users").doc(uid).get();
  const fromUser = String(userSnap.data()?.handle || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  if (fromUser) return fromUser;
  const owned = await db.collection("handles").where("ownerUid", "==", uid).limit(1).get();
  return owned.empty ? "" : owned.docs[0]!.id;
}

async function uidForHandle(handle: string): Promise<string> {
  const snap = await db.collection("handles").doc(handle).get();
  return String(snap.data()?.ownerUid || "");
}

async function circleUids(handle: string): Promise<string[]> {
  const snap = await db.collection("graph").doc(handle).collection("followers").limit(CIRCLE_BROADCAST_CAP).get();
  return Array.from(new Set(snap.docs.map((d) => String(d.data()?.uid || "")).filter(Boolean)));
}

export const shareHere = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "shareHere");
  const uid = requireAccount(request, "Sign in to share where you are.");
  await enforceRateLimit(uid, "hereShare", isAnonymousAuth(request));
  const data = (request.data || {}) as ShareHereRequest;
  const errors = validateShareHere(data as unknown as Record<string, unknown>);
  if (errors.length) throw new HttpsError("invalid-argument", errors.join(" "));

  const handle = await resolveHandle(uid);
  if (!handle) throw new HttpsError("failed-precondition", "Claim a @handle first.");

  const userSnap = await db.collection("users").doc(uid).get();
  const name = String(userSnap.data()?.displayName || handle);
  const placeName = String(data.placeName).trim();
  const hours = Math.min(HERE_MAX_HOURS, Number(data.hours || 3) || 3);
  const geo =
    Number.isFinite(Number(data.lat)) && Number.isFinite(Number(data.lng))
      ? roundHereGeo({ lat: Number(data.lat), lng: Number(data.lng) })
      : undefined;
  const placeKey =
    String(data.placeKey || "").trim() ||
    herePlaceKey({
      planId: data.planId,
      placeId: data.placeId,
      eventId: data.eventId,
      geo,
    });
  if (!placeKey) throw new HttpsError("invalid-argument", "Name the place you’re at.");

  const audience = data.audience === "person" ? "person" : "circle";
  const toHandle = String(data.toHandle || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  let toUid = "";
  if (audience === "person") {
    toUid = await uidForHandle(toHandle);
    if (!toUid) throw new HttpsError("not-found", "That person isn’t on AirPal yet.");
  }

  const pinOnMap = data.pinOnMap !== false && audience === "circle" ? true : Boolean(data.pinOnMap);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
  const updatedAt = now.toISOString();
  const previous = await db.collection("here_pins").doc(handle).get();
  const previousKey = String(previous.data()?.placeKey || "");

  const pin = {
    handle,
    uid,
    name,
    placeKey,
    placeName,
    planId: String(data.planId || "").trim() || null,
    placeId: String(data.placeId || "").trim() || null,
    eventId: String(data.eventId || "").trim() || null,
    geo: geo || null,
    audience,
    toHandle: audience === "person" ? toHandle : null,
    pinOnMap,
    expiresAt,
    updatedAt,
  };

  const href = data.planId
    ? `/plan/${data.planId}`
    : data.placeId
      ? `/p/${data.placeId}`
      : data.eventId
        ? `/e/${data.eventId}`
        : `/circle?here=${encodeURIComponent(placeKey)}`;

  await db.collection("here_pins").doc(handle).set(pin);
  if (previousKey && previousKey !== placeKey) {
    await db
      .collection("here_at")
      .doc(previousKey)
      .collection("pins")
      .doc(handle)
      .delete()
      .catch(() => undefined);
  }
  if (pinOnMap) {
    await db.collection("here_at").doc(placeKey).collection("pins").doc(handle).set(pin);
  } else {
    await db
      .collection("here_at")
      .doc(placeKey)
      .collection("pins")
      .doc(handle)
      .delete()
      .catch(() => undefined);
  }

  const title = `${name} is at ${placeName}`;
  const body = "Open AirPal to meet them there.";
  if (audience === "person" && toUid) {
    await db.collection("here_shares").add({
      fromUid: uid,
      fromHandle: handle,
      toUid,
      toHandle,
      placeKey,
      placeName,
      geo: geo || null,
      href,
      expiresAt,
      createdAt: FieldValue.serverTimestamp(),
    });
    await fanOut({
      uids: [toUid],
      kind: "here",
      title,
      body,
      promotionId: handle,
      href,
    });
  } else {
    const uids = (await circleUids(handle)).filter((id) => id !== uid);
    if (uids.length) {
      await fanOut({
        uids,
        kind: "here",
        title,
        body,
        promotionId: handle,
        href,
      });
    }
  }

  return { ok: true as const, placeKey, expiresAt, pinOnMap };
});

export const stopHere = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "stopHere");
  const uid = requireAccount(request);
  const handle = await resolveHandle(uid);
  if (!handle) return { ok: true as const };
  const snap = await db.collection("here_pins").doc(handle).get();
  const placeKey = String(snap.data()?.placeKey || "");
  await db
    .collection("here_pins")
    .doc(handle)
    .delete()
    .catch(() => undefined);
  if (placeKey) {
    await db
      .collection("here_at")
      .doc(placeKey)
      .collection("pins")
      .doc(handle)
      .delete()
      .catch(() => undefined);
  }
  return { ok: true as const };
});
