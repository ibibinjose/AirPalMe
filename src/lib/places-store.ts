import { collection, getDocs, query, where } from "firebase/firestore";
import {
  PLACE_CATEGORIES,
  type Geo,
  type NearbyPlace,
  type PlaceCategory,
  type PlaceDeal,
} from "@shared/nearby";
import { getFirebaseDb } from "./firebase";

const KEY = "airpal.places.v1";

const PRICE_LEVELS = ["Free", "$", "$$", "$$$"] as const;

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function num(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function geoOf(v: unknown): Geo | null {
  if (!v || typeof v !== "object") return null;
  const g = v as { lat?: unknown; lng?: unknown; latitude?: unknown; longitude?: unknown };
  const lat = num(g.lat ?? g.latitude);
  const lng = num(g.lng ?? g.longitude);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function isCategory(v: unknown): v is PlaceCategory {
  return typeof v === "string" && (PLACE_CATEGORIES as readonly string[]).includes(v);
}

function dealOf(v: unknown): PlaceDeal | undefined {
  if (!v || typeof v !== "object") return undefined;
  const d = v as { badge?: unknown; detail?: unknown; expiry?: unknown; claimHint?: unknown };
  const badge = str(d.badge);
  const detail = str(d.detail);
  if (!badge || !detail) return undefined;
  return {
    badge,
    detail,
    ...(str(d.expiry) ? { expiry: str(d.expiry) } : {}),
    ...(str(d.claimHint) ? { claimHint: str(d.claimHint) } : {}),
  };
}

/** Map a Firestore `places` doc onto NearbyPlace. Skip unnamed or unlocated rows. */
export function parsePlaceDoc(id: string, data: Record<string, unknown>): NearbyPlace | null {
  const name = str(data.name);
  if (!name) return null;
  const geo = geoOf(data.geo);
  if (!geo) return null;
  const status = data.status === "inactive" ? "inactive" : "active";
  if (status !== "active") return null;
  const source = data.source === "host" || data.source === "partner" ? data.source : "seed";
  const category = isCategory(data.category) ? data.category : "things";
  const photos = Array.isArray(data.photos) ? data.photos.filter((p): p is string => typeof p === "string" && Boolean(p)) : undefined;
  const priceLevel = typeof data.priceLevel === "string" && (PRICE_LEVELS as readonly string[]).includes(data.priceLevel)
    ? (data.priceLevel as NearbyPlace["priceLevel"])
    : undefined;
  const bookingAction = data.bookingActionType;
  const bookingActionType =
    bookingAction === "reserve" ||
    bookingAction === "order" ||
    bookingAction === "book" ||
    bookingAction === "ticket" ||
    bookingAction === "visit"
      ? bookingAction
      : undefined;

  return {
    id,
    name,
    category,
    shortWhy: str(data.shortWhy) || name,
    geo,
    source,
    status,
    precinctId: str(data.precinctId) || "local",
    ...(str(data.hours) ? { hours: str(data.hours) } : {}),
    ...(str(data.hoursVerifiedAt) ? { hoursVerifiedAt: str(data.hoursVerifiedAt) } : {}),
    ...(str(data.address) ? { address: str(data.address) } : {}),
    ...(priceLevel ? { priceLevel } : {}),
    ...(num(data.rating) != null ? { rating: num(data.rating) } : {}),
    ...(num(data.reviewCount) != null ? { reviewCount: num(data.reviewCount) } : {}),
    ...(str(data.propertyId) ? { propertyId: str(data.propertyId) } : {}),
    ...(str(data.bookingUrl) ? { bookingUrl: str(data.bookingUrl) } : {}),
    ...(str(data.bookingLabel) ? { bookingLabel: str(data.bookingLabel) } : {}),
    ...(bookingActionType ? { bookingActionType } : {}),
    ...(num(data.avgBookingValue) != null ? { avgBookingValue: num(data.avgBookingValue) } : {}),
    ...(str(data.heroImage) ? { heroImage: str(data.heroImage) } : {}),
    ...(photos?.length ? { photos } : {}),
    ...(dealOf(data.deal) ? { deal: dealOf(data.deal) } : {}),
    ...(str(data.insiderTip) ? { insiderTip: str(data.insiderTip) } : {}),
    ...(str(data.transitNotes) ? { transitNotes: str(data.transitNotes) } : {}),
    ...(typeof data.openNow === "boolean" ? { openNow: data.openNow } : {}),
    ...(typeof data.verifiedPartner === "boolean" ? { verifiedPartner: data.verifiedPartner } : {}),
    ...(str(data.subTitle) ? { subTitle: str(data.subTitle) } : {}),
    ...(str(data.handle) ? { handle: str(data.handle) } : {}),
    ...(str(data.mapsPlaceId) ? { mapsPlaceId: str(data.mapsPlaceId) } : {}),
    ...(str(data.phone) ? { phone: str(data.phone) } : {}),
  };
}

function read(): NearbyPlace[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: NearbyPlace[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const rec = row as Record<string, unknown>;
      const id = str(rec.id);
      if (!id) continue;
      const place = parsePlaceDoc(id, rec);
      if (place) out.push(place);
    }
    return out;
  } catch {
    return [];
  }
}

function write(rows: NearbyPlace[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

/** Cached precinct places (Firestore `places`). Empty until first successful fetch. */
export function loadPlaces(): NearbyPlace[] {
  return read();
}

export function cachePlaces(rows: NearbyPlace[]) {
  write(rows.filter((p) => p.status === "active"));
}

/** Public list of active `places` docs. Listings overlay these in `activePlaces()`. */
export async function fetchPlaces(): Promise<NearbyPlace[]> {
  const db = getFirebaseDb();
  if (!db) return read();
  try {
    const snap = await getDocs(query(collection(db, "places"), where("status", "==", "active")));
    const out: NearbyPlace[] = [];
    for (const row of snap.docs) {
      const place = parsePlaceDoc(row.id, row.data() as Record<string, unknown>);
      if (place) out.push(place);
    }
    write(out);
    return out;
  } catch {
    return read();
  }
}
