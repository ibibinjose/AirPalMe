import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { randomBytes } from "node:crypto";
import { WAVE_CODE_LEN, WAVE_TTL_MS, validateStartWave, waveCodeFrom, waveLive } from "../../shared/wave";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import { CALLABLE, db, requireAccount } from "./admin";
import { fanOut } from "./notifications";

function newWaveCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(WAVE_CODE_LEN);
  let out = "";
  for (let i = 0; i < WAVE_CODE_LEN; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}

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

export const startWave = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "startWave");
  const uid = requireAccount(request, "Sign in to wave.");
  await enforceRateLimit(uid, "wave", isAnonymousAuth(request));
  const data = (request.data || {}) as { placeName?: string; placeKey?: string; listingId?: string; placeId?: string };
  const errors = validateStartWave(data as Record<string, unknown>);
  if (errors.length) throw new HttpsError("invalid-argument", errors.join(" "));
  const handle = await resolveHandle(uid);
  if (!handle) throw new HttpsError("failed-precondition", "Claim a @handle first.");
  const userSnap = await db.collection("users").doc(uid).get();
  const name = String(userSnap.data()?.displayName || handle);
  const placeName = String(data.placeName || "").trim();
  const placeKey = String(data.placeKey || data.placeId || handle)
    .trim()
    .slice(0, 80);
  const listingId = String(data.listingId || "").trim();
  const placeId = String(data.placeId || "").trim();
  const previous = await db.collection("wave_owners").doc(uid).get();
  const previousCode = String(previous.data()?.code || "");
  const previousKey = String(previous.data()?.placeKey || "");
  if (previousCode)
    await db
      .collection("waves")
      .doc(previousCode)
      .delete()
      .catch(() => undefined);
  if (previousKey)
    await db
      .collection("wave_here")
      .doc(previousKey)
      .delete()
      .catch(() => undefined);

  const code = newWaveCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + WAVE_TTL_MS).toISOString();
  const session = {
    code,
    uid,
    handle,
    name,
    placeKey,
    placeName,
    listingId: listingId || null,
    placeId: placeId || null,
    hitCount: 0,
    expiresAt,
    createdAt: now.toISOString(),
  };
  await db.collection("waves").doc(code).set(session);
  await db.collection("wave_owners").doc(uid).set({ code, placeKey, updatedAt: now.toISOString() });
  await db
    .collection("wave_here")
    .doc(placeKey)
    .set({
      code,
      uid,
      handle,
      name,
      placeName,
      listingId: listingId || null,
      placeId: placeId || null,
      expiresAt,
      updatedAt: now.toISOString(),
    });
  return { ok: true as const, code, expiresAt, placeKey, handle, name, placeName };
});

export const waveAt = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "waveAt");
  const uid = requireAccount(request, "Sign in to wave back.");
  await enforceRateLimit(uid, "wave", isAnonymousAuth(request));
  const code = waveCodeFrom(String((request.data as { code?: string })?.code || ""));
  if (code.length < 4) throw new HttpsError("invalid-argument", "Need a Wave code.");
  const snap = await db.collection("waves").doc(code).get();
  if (!snap.exists) throw new HttpsError("not-found", "That Wave ended.");
  const session = snap.data() as {
    uid?: string;
    handle?: string;
    name?: string;
    placeName?: string;
    expiresAt?: string;
    hitCount?: number;
  };
  if (!waveLive(session)) throw new HttpsError("failed-precondition", "That Wave ended.");
  const toUid = String(session.uid || "");
  if (toUid === uid) throw new HttpsError("failed-precondition", "That’s your own Wave.");
  const fromHandle = await resolveHandle(uid);
  const fromSnap = await db.collection("users").doc(uid).get();
  const fromName = String(fromSnap.data()?.displayName || fromHandle || "An AirPal");
  await db.collection("wave_hits").add({
    code,
    fromUid: uid,
    fromHandle,
    fromName,
    toUid,
    toHandle: session.handle || "",
    placeName: session.placeName || "",
    createdAt: FieldValue.serverTimestamp(),
  });
  await db
    .collection("waves")
    .doc(code)
    .set({ hitCount: Number(session.hitCount || 0) + 1 }, { merge: true });
  if (toUid) {
    await fanOut({
      uids: [toUid],
      kind: "wave",
      title: `${fromName} waved`,
      body: fromHandle ? `@${fromHandle} is here.` : "A fellow AirPal is here.",
      promotionId: code,
      href: fromHandle ? `/@${fromHandle}` : "/circle",
    });
  }
  return {
    ok: true as const,
    handle: String(session.handle || ""),
    name: String(session.name || ""),
    placeName: String(session.placeName || ""),
  };
});

export const stopWave = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "stopWave");
  const uid = requireAccount(request);
  const owner = await db.collection("wave_owners").doc(uid).get();
  const code =
    waveCodeFrom(String((request.data as { code?: string })?.code || "")) ||
    waveCodeFrom(String(owner.data()?.code || ""));
  const placeKey = String(owner.data()?.placeKey || "");
  if (code) {
    const snap = await db.collection("waves").doc(code).get();
    if (snap.exists && String(snap.data()?.uid) === uid) {
      const key = String(snap.data()?.placeKey || placeKey);
      await snap.ref.delete();
      if (key)
        await db
          .collection("wave_here")
          .doc(key)
          .delete()
          .catch(() => undefined);
    }
  }
  await db
    .collection("wave_owners")
    .doc(uid)
    .delete()
    .catch(() => undefined);
  return { ok: true as const };
});
