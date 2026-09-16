import { doc, getDoc } from "firebase/firestore";
import type { CampusClass, CampusEvent, CampusPlace } from "@shared/campus";
import { getFirebaseDb } from "./firebase";

export type CampusDoc = {
  id: string;
  name: string;
  university?: string;
  tagline?: string;
  city?: string;
  address?: string;
  phone?: string;
  security?: string;
  wifi?: { network?: string; password?: string; speed?: string };
  room?: string;
  dining?: { hours?: string; location?: string; notes?: string };
  checkIn?: string;
  library?: string;
  classes?: CampusClass[];
  places?: CampusPlace[];
  events?: CampusEvent[];
};

const KEY = "airpal.campuses.v1";

function validCampus(data: Record<string, unknown>, id: string): CampusDoc | null {
  if (typeof data.name !== "string" || !data.name.trim()) return null;
  const arr = <T>(v: unknown): T[] | undefined => (Array.isArray(v) ? (v as T[]) : undefined);
  return {
    id,
    name: data.name,
    university: typeof data.university === "string" ? data.university : undefined,
    tagline: typeof data.tagline === "string" ? data.tagline : undefined,
    city: typeof data.city === "string" ? data.city : undefined,
    address: typeof data.address === "string" ? data.address : undefined,
    phone: typeof data.phone === "string" ? data.phone : undefined,
    security: typeof data.security === "string" ? data.security : undefined,
    wifi: typeof data.wifi === "object" && data.wifi !== null ? (data.wifi as CampusDoc["wifi"]) : undefined,
    room: typeof data.room === "string" ? data.room : undefined,
    dining: typeof data.dining === "object" && data.dining !== null ? (data.dining as CampusDoc["dining"]) : undefined,
    checkIn: typeof data.checkIn === "string" ? data.checkIn : undefined,
    library: typeof data.library === "string" ? data.library : undefined,
    classes: arr<CampusClass>(data.classes),
    places: arr<CampusPlace>(data.places),
    events: arr<CampusEvent>(data.events),
  };
}

function read(): Record<string, CampusDoc> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CampusDoc>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function cacheCampus(campus: CampusDoc) {
  const all = read();
  all[campus.id] = campus;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

/** Cached campus docs (Firestore `campuses`). Sync read. */
export function loadCampus(id: string): CampusDoc | undefined {
  if (!id) return undefined;
  const row = read()[id];
  return row && typeof row.name === "string" ? row : undefined;
}

/** Fetch one campus doc (public get), cache on hit. */
export async function fetchCampus(id: string): Promise<CampusDoc | undefined> {
  const cached = loadCampus(id);
  if (cached) return cached;
  const db = getFirebaseDb();
  if (!db) return undefined;
  try {
    const snap = await getDoc(doc(db, "campuses", id));
    if (!snap.exists()) return undefined;
    const campus = validCampus(snap.data() as Record<string, unknown>, snap.id);
    if (!campus) return undefined;
    const all = read();
    all[campus.id] = campus;
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {
      /* ignore */
    }
    return campus;
  } catch {
    return undefined;
  }
}
