import { doc, getDoc } from "firebase/firestore";
import type { MarkerDoc } from "@shared/nearby";
import { getFirebaseDb } from "./firebase";

const KEY = "airpal.markers.v1";

function read(): MarkerDoc[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is MarkerDoc =>
        !!m && typeof m.id === "string" && typeof m.kind === "string" && (m.status === "active" || m.status === "inactive"),
    );
  } catch {
    return [];
  }
}

function write(rows: MarkerDoc[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

/** Cached marker docs (Firestore `markers` + migrated curated markers). Sync read. */
export function loadMarkers(): MarkerDoc[] {
  return read();
}

/** Sync cache lookup for Stay sessions and marker pages. */
export function getStoredMarker(id: string): MarkerDoc | undefined {
  if (!id) return undefined;
  return read().find((m) => m.id === id);
}

export function upsertStoredMarker(marker: MarkerDoc) {
  const rows = read().filter((m) => m.id !== marker.id);
  write([marker, ...rows]);
}

function validMarker(data: Record<string, unknown>, id: string): MarkerDoc | null {
  if (typeof data.kind !== "string") return null;
  const status = data.status === "inactive" ? "inactive" : "active";
  return { id, kind: data.kind, status, ...(data as Partial<MarkerDoc>) } as MarkerDoc;
}

/** Fetch one marker doc (public get per firestore.rules), cache on hit. */
export async function fetchMarker(id: string): Promise<MarkerDoc | undefined> {
  const cached = getStoredMarker(id);
  if (cached) return cached;
  const db = getFirebaseDb();
  if (!db) return undefined;
  try {
    const snap = await getDoc(doc(db, "markers", id));
    if (!snap.exists()) return undefined;
    const marker = validMarker(snap.data() as Record<string, unknown>, snap.id);
    if (!marker) return undefined;
    const rows = read().filter((m) => m.id !== marker.id);
    write([marker, ...rows]);
    return marker;
  } catch {
    return undefined;
  }
}
