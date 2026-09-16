import { collection, getDocs } from "firebase/firestore";
import type { WalkingTour } from "@shared/tours";
import { getFirebaseDb } from "./firebase";

const KEY = "airpal.tours.v1";

function validTour(data: Record<string, unknown>): WalkingTour | null {
  if (typeof data.id !== "string" || typeof data.title !== "string" || !Array.isArray(data.stops)) return null;
  return data as unknown as WalkingTour;
}

function read(): WalkingTour[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: WalkingTour[] = [];
    for (const row of parsed) {
      const tour = validTour(row as Record<string, unknown>);
      if (tour) out.push(tour);
    }
    return out;
  } catch {
    return [];
  }
}

/** Cached tours (Firestore `tours`). Empty when nothing was ever published. */
export function loadTours(): WalkingTour[] {
  return read();
}

export function cacheTours(rows: WalkingTour[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

/** Fetch all tour docs (public list), refresh the cache. */
export async function fetchTours(): Promise<WalkingTour[]> {
  const db = getFirebaseDb();
  if (!db) return read();
  try {
    const snap = await getDocs(collection(db, "tours"));
    const out: WalkingTour[] = [];
    for (const row of snap.docs) {
      const tour = validTour({ id: row.id, ...(row.data() as Record<string, unknown>) });
      if (tour) out.push(tour);
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(out));
    } catch {
      /* ignore */
    }
    return out;
  } catch {
    return read();
  }
}
