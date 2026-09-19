import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { CALLABLES } from "@shared/airpal-security";
import { waveCodeFrom, waveLive, type StartWaveRequest, type WaveSession } from "@shared/wave";
import { getFirebaseDb, getFirebaseFunctions } from "./firebase";

export async function startWaveRemote(data: StartWaveRequest) {
  const functions = getFirebaseFunctions();
  if (!functions) throw new Error("Firebase is not configured.");
  const call = httpsCallable<
    StartWaveRequest,
    { ok: true; code: string; expiresAt: string; placeKey: string; handle: string; name: string; placeName: string }
  >(functions, CALLABLES.startWave);
  return (await call(data)).data;
}

export async function waveAtRemote(code: string) {
  const functions = getFirebaseFunctions();
  if (!functions) throw new Error("Firebase is not configured.");
  const call = httpsCallable<{ code: string }, { ok: true; handle: string; name: string; placeName: string }>(
    functions,
    CALLABLES.waveAt,
  );
  return (await call({ code: waveCodeFrom(code) })).data;
}

export async function stopWaveRemote(code?: string) {
  const functions = getFirebaseFunctions();
  if (!functions) throw new Error("Firebase is not configured.");
  const call = httpsCallable<{ code?: string }, { ok: true }>(functions, CALLABLES.stopWave);
  return (await call({ code })).data;
}

function asSession(data: Record<string, unknown>): WaveSession {
  return {
    code: String(data.code || ""),
    uid: String(data.uid || ""),
    handle: String(data.handle || ""),
    name: String(data.name || ""),
    placeKey: String(data.placeKey || ""),
    placeName: String(data.placeName || ""),
    listingId: data.listingId ? String(data.listingId) : undefined,
    placeId: data.placeId ? String(data.placeId) : undefined,
    hitCount: Number(data.hitCount || 0),
    expiresAt: String(data.expiresAt || ""),
    createdAt: String(data.createdAt || ""),
  };
}

export async function fetchWaveByCode(code: string): Promise<WaveSession | null> {
  const db = getFirebaseDb();
  const id = waveCodeFrom(code);
  if (!db || !id) return null;
  const snap = await getDoc(doc(db, "waves", id));
  if (!snap.exists()) return null;
  const session = asSession(snap.data() as Record<string, unknown>);
  return waveLive(session) ? session : null;
}

export async function fetchWaveHere(placeKey: string): Promise<WaveSession | null> {
  const db = getFirebaseDb();
  if (!db || !placeKey) return null;
  const snap = await getDoc(doc(db, "wave_here", placeKey));
  if (!snap.exists()) return null;
  const session = asSession(snap.data() as Record<string, unknown>);
  return waveLive(session) ? session : null;
}

export function listenWaveByCode(code: string, onSession: (s: WaveSession | null) => void): () => void {
  const db = getFirebaseDb();
  const id = waveCodeFrom(code);
  if (!db || !id) return () => undefined;
  return onSnapshot(
    doc(db, "waves", id),
    (snap) => {
      if (!snap.exists()) {
        onSession(null);
        return;
      }
      const session = asSession(snap.data() as Record<string, unknown>);
      onSession(waveLive(session) ? session : null);
    },
    () => onSession(null),
  );
}

export function listenWaveHere(placeKey: string, onSession: (s: WaveSession | null) => void): () => void {
  const db = getFirebaseDb();
  if (!db || !placeKey) return () => undefined;
  return onSnapshot(
    doc(db, "wave_here", placeKey),
    (snap) => {
      if (!snap.exists()) {
        onSession(null);
        return;
      }
      const session = asSession(snap.data() as Record<string, unknown>);
      onSession(waveLive(session) ? session : null);
    },
    () => onSession(null),
  );
}
