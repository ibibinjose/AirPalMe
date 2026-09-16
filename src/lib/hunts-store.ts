import { collection, getDocs } from "firebase/firestore";
import type { ZooHunt } from "@shared/zoo";
import { getFirebaseDb } from "./firebase";

const KEY = "airpal.zoohunts.v1";

function validHunt(data: Record<string, unknown>): ZooHunt | null {
  if (typeof data.id !== "string" || typeof data.name !== "string" || !Array.isArray(data.stops)) return null;
  return data as ZooHunt;
}

function read(): ZooHunt[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: ZooHunt[] = [];
    for (const row of parsed) {
      const hunt = validHunt(row as Record<string, unknown>);
      if (hunt) out.push(hunt);
    }
    return out;
  } catch {
    return [];
  }
}

/** Cached hunts (Firestore `zooHunts`). Empty when none published. */
export function loadHunts(): ZooHunt[] {
  return read();
}

export function cacheHunts(rows: ZooHunt[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

/** Fetch all hunt docs (public list), refresh the cache. */
export async function fetchHunts(): Promise<ZooHunt[]> {
  const db = getFirebaseDb();
  if (!db) return read();
  try {
    const snap = await getDocs(collection(db, "zooHunts"));
    const out: ZooHunt[] = [];
    for (const row of snap.docs) {
      const hunt = validHunt({ id: row.id, ...(row.data() as Record<string, unknown>) });
      if (hunt) out.push(hunt);
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
