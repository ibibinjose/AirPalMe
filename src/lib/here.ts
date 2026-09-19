import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { CALLABLES } from "@shared/airpal-security";
import { herePinLive, type HerePin, type ShareHereRequest } from "@shared/here";
import { getFirebaseDb, getFirebaseFunctions } from "./firebase";
import { httpsCallable } from "firebase/functions";

export async function shareHereRemote(data: ShareHereRequest) {
  const functions = getFirebaseFunctions();
  if (!functions) throw new Error("Firebase is not configured.");
  const call = httpsCallable<ShareHereRequest, { ok: true; placeKey: string; expiresAt: string; pinOnMap: boolean }>(
    functions,
    CALLABLES.shareHere,
  );
  const res = await call(data);
  return res.data;
}

export async function stopHereRemote() {
  const functions = getFirebaseFunctions();
  if (!functions) throw new Error("Firebase is not configured.");
  const call = httpsCallable<Record<string, never>, { ok: true }>(functions, CALLABLES.stopHere);
  const res = await call({});
  return res.data;
}

function asPin(id: string, data: Record<string, unknown>): HerePin {
  return {
    handle: String(data.handle || id),
    uid: String(data.uid || ""),
    name: String(data.name || data.handle || id),
    placeKey: String(data.placeKey || ""),
    placeName: String(data.placeName || ""),
    planId: data.planId ? String(data.planId) : undefined,
    placeId: data.placeId ? String(data.placeId) : undefined,
    eventId: data.eventId ? String(data.eventId) : undefined,
    geo: (() => {
      if (!data.geo || typeof data.geo !== "object") return undefined;
      const lat = Number((data.geo as { lat?: number }).lat);
      const lng = Number((data.geo as { lng?: number }).lng);
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
    })(),
    audience: data.audience === "person" ? "person" : "circle",
    toHandle: data.toHandle ? String(data.toHandle) : undefined,
    pinOnMap: data.pinOnMap !== false,
    expiresAt: String(data.expiresAt || ""),
    updatedAt: String(data.updatedAt || ""),
  };
}

export async function fetchMyHerePin(handle: string): Promise<HerePin | null> {
  const db = getFirebaseDb();
  if (!db || !handle) return null;
  const snap = await getDoc(doc(db, "here_pins", handle));
  if (!snap.exists()) return null;
  const pin = asPin(snap.id, snap.data() as Record<string, unknown>);
  return herePinLive(pin) ? pin : null;
}

export async function fetchHereAt(placeKey: string): Promise<HerePin[]> {
  const db = getFirebaseDb();
  if (!db || !placeKey) return [];
  const snap = await getDocs(collection(db, "here_at", placeKey, "pins"));
  return snap.docs
    .map((d) => asPin(d.id, d.data() as Record<string, unknown>))
    .filter((p) => herePinLive(p) && p.pinOnMap);
}

export async function fetchHerePinsForHandles(handles: string[]): Promise<HerePin[]> {
  const db = getFirebaseDb();
  if (!db || !handles.length) return [];
  const unique = Array.from(new Set(handles.filter(Boolean))).slice(0, 40);
  const rows = await Promise.all(
    unique.map(async (h) => {
      try {
        const snap = await getDoc(doc(db, "here_pins", h));
        if (!snap.exists()) return null;
        const pin = asPin(snap.id, snap.data() as Record<string, unknown>);
        return herePinLive(pin) ? pin : null;
      } catch {
        return null;
      }
    }),
  );
  return rows.filter((p): p is HerePin => Boolean(p));
}

export async function fetchHereSharesForMe(uid: string): Promise<HerePin[]> {
  const db = getFirebaseDb();
  if (!db || !uid) return [];
  try {
    const snap = await getDocs(query(collection(db, "here_shares"), where("toUid", "==", uid)));
    return snap.docs
      .map((d) => {
        const data = d.data() as Record<string, unknown>;
        return asPin(String(data.fromHandle || d.id), {
          ...data,
          handle: data.fromHandle,
          uid: data.fromUid,
          name: data.fromHandle,
          pinOnMap: false,
          audience: "person",
          updatedAt: data.createdAt,
        });
      })
      .filter((p) => herePinLive(p));
  } catch {
    return [];
  }
}
