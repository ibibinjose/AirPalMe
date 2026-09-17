import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  buildWaveCopy,
  normalizeWaveHandle,
  validateWaveRequest,
  waveCooldownRemainingMs,
  type SendWaveRequest,
  type SendWaveResponse,
} from "../../shared/waves";
import { enforceRateLimit, isAnonymousAuth } from "./abuse";
import { CALLABLE, db, requireAccount } from "./admin";
import { sendPushIfAllowed } from "./notifications";

/**
 * Named nearby signal. The recipient always sees who waved (name + @handle),
 * gets an inbox row plus push, and can only respond by waving back — there is
 * no reply channel. One wave per person per 24h, max 20 waves a day.
 */
export const sendWave = onCall(CALLABLE, async (request): Promise<SendWaveResponse> => {
  const uid = requireAccount(request, "Sign in to wave at people — your waves belong to your account.");
  await enforceRateLimit(uid, "wave", isAnonymousAuth(request));
  const data = (request.data || {}) as SendWaveRequest;
  const toHandle = normalizeWaveHandle(String(data.toHandle || ""));
  const errors = validateWaveRequest({ toHandle });
  if (errors.length) throw new HttpsError("invalid-argument", errors.join(" "));

  const targetRef = await db.collection("handles").doc(toHandle).get();
  const toUid = targetRef.exists ? String(targetRef.data()?.ownerUid || "") : "";
  if (!targetRef.exists || !toUid) {
    throw new HttpsError("not-found", "No claimed bio with that handle — waves need someone to land on.");
  }
  if (toUid === uid) {
    throw new HttpsError("failed-precondition", "That's you — no need to wave at yourself.");
  }

  const senderRows = await db.collection("handles").where("ownerUid", "==", uid).limit(1).get();
  if (senderRows.empty) {
    throw new HttpsError("failed-precondition", "Create a bio @handle first — waves are always named.");
  }
  const fromHandle = senderRows.docs[0]!.id;
  const senderProfile = await db.collection("profiles").where("ownerUid", "==", uid).limit(1).get();
  const senderData = senderProfile.empty ? {} : (senderProfile.docs[0]!.data() as { name?: string; city?: string });
  const fromName = String(senderData.name || fromHandle);
  const city = String(senderData.city || "");

  const cooldownRef = db.collection("wave_state").doc(`${uid}_${toHandle}`);
  let waveBack = false;
  const wavedAt = new Date().toISOString();
  await db.runTransaction(async (tx) => {
    const cooldownSnap = await tx.get(cooldownRef);
    const lastSentAt = cooldownSnap.exists ? String(cooldownSnap.data()?.lastSentAt || "") : "";
    if (waveCooldownRemainingMs(lastSentAt) > 0) {
      throw new HttpsError("failed-precondition", `You already waved at @${toHandle} — try again tomorrow.`);
    }
    const backSnap = await tx.get(
      db.collection("waves").where("fromUid", "==", toUid).where("toHandle", "==", fromHandle).limit(1),
    );
    waveBack = !backSnap.empty;
    const copy = buildWaveCopy({ fromName, fromHandle, city, waveBack });
    tx.set(cooldownRef, { fromUid: uid, toHandle, lastSentAt: wavedAt, updatedAt: FieldValue.serverTimestamp() });
    tx.set(db.collection("waves").doc(), {
      fromUid: uid,
      fromHandle,
      fromName,
      toUid,
      toHandle,
      city,
      sentAt: wavedAt,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.collection("promotion_notifications").doc(), {
      uid: toUid,
      kind: "wave_received",
      title: copy.title,
      body: copy.body,
      href: copy.href,
      promotionId: "",
      read: false,
      at: wavedAt,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  const copy = buildWaveCopy({ fromName, fromHandle, city, waveBack });
  await sendPushIfAllowed(toUid, "wave_received", copy.title, copy.body, "");
  return { ok: true, wavedAt, waveBack };
});
