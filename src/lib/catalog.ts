import { CURRENT_PROPERTY, IN_ROOM_DINING_MENU, INITIAL_STAFF_TICKETS, SAFETY_AND_EMERGENCY_DATA } from "@shared/airpal-data";
import { THE_ROCKS_PRECINCT } from "@shared/the-rocks-data";
import { HARBOUR_COLLEGE } from "@shared/campus";
import { handleFromPlaceId } from "@shared/bio";
import type { WalkingTour } from "@shared/tours";
import {
  resolveCompetitorPolicy,
  type Geo,
  type MarkerDoc,
  type NearbyPlace,
  type PlaceCategory,
} from "@shared/nearby";
import { haversineMeters, walkLabel } from "./geo";
import { CITY_RADIUS_KM, knownCityCenter } from "./cities";
import { listedPlaces } from "./listings";
import { getStoredMarker } from "./markers-store";
import { loadPlaces } from "./places-store";
import { loadTours } from "./tours-store";

export const PRECINCT = THE_ROCKS_PRECINCT;

/**
 * Walks for the guest's city from live `tours` docs. A named city with no
 * match returns [] (honest empty) instead of another precinct's walks.
 * Empty city returns every tour, labelled by city (used by global search).
 * Empty DB → empty list.
 */
export function toursForPrecinct(city = PRECINCT.city, pool: WalkingTour[] = loadTours()) {
  const key = city.trim().toLowerCase();
  if (!key) return pool;
  return pool.filter((t) => {
    const tc = (t.city || "").trim().toLowerCase();
    return tc === key || key.includes(tc) || tc.includes(key);
  });
}

function cityKey(value?: string): string {
  return (value || "").trim().toLowerCase();
}

function isSydneyKey(key: string): boolean {
  return !key || key.includes("sydney") || key.includes("rock");
}

/**
 * Places for the guest's city. Place geography is precinct + geo (rows carry
 * no city name): Sydney shows the bundled Rocks stock (precinct the-rocks,
 * local, or legacy empty); any other known city shows rows within 60 km of
 * its center; unknown cities show non-Sydney stock only. Melbourne never
 * renders The Rocks.
 */
export function placesInCity<T extends { precinctId?: string; geo?: { lat: number; lng: number } }>(
  rows: T[],
  city?: string,
): T[] {
  const key = cityKey(city);
  if (isSydneyKey(key)) {
    return rows.filter((p) => {
      const precinct = cityKey(p.precinctId);
      return !precinct || precinct === "local" || precinct === "the-rocks";
    });
  }
  const center = knownCityCenter(city);
  if (!center) {
    return rows.filter((p) => {
      const precinct = cityKey(p.precinctId);
      return Boolean(precinct) && precinct !== "local" && precinct !== "the-rocks";
    });
  }
  const maxMeters = CITY_RADIUS_KM * 1000;
  return rows.filter((p) => {
    if (!p.geo || !Number.isFinite(p.geo.lat) || !Number.isFinite(p.geo.lng)) return false;
    return haversineMeters(center, p.geo) <= maxMeters;
  });
}

export const STAY = CURRENT_PROPERTY;
export const MENU = IN_ROOM_DINING_MENU;
export const TICKETS = INITIAL_STAFF_TICKETS;
export const SAFETY = SAFETY_AND_EMERGENCY_DATA;
export const CAMPUS = HARBOUR_COLLEGE;

export const DISCOVER_CHIPS: Array<{ id: "all" | PlaceCategory | "tonight" | "deals"; label: string }> = [
  { id: "all", label: "All" },
  { id: "eat", label: "Eat" },
  { id: "coffee", label: "Coffee" },
  { id: "things", label: "See" },
  { id: "shops", label: "Shop" },
  { id: "deals", label: "Deals" },
  { id: "tonight", label: "Tonight" },
];

/**
 * DB-backed places only: Firestore `listings` (via ListingsContext cache) and
 * `places` docs migrated by seed-database. Empty DB → empty list, honestly.
 * Curated bundle content is migration source in @shared/the-rocks-data, never
 * rendered directly.
 */
export function activePlaces(): NearbyPlace[] {
  const map = new Map<string, NearbyPlace>();
  // Precinct catalog from live `places` docs (The Rocks venues, etc.).
  for (const p of loadPlaces()) {
    if (p.status === "active") map.set(p.id, p);
  }
  // Host-owned `listings` overlay the same id when a business claimed the page.
  for (const p of listedPlaces()) map.set(p.id, p);
  return Array.from(map.values()).map(withHandle);
}

export function getPlace(id: string) {
  const norm = id.trim().toLowerCase();
  const withoutList = norm.replace(/^list-/, "");
  return activePlaces().find(
    (p) =>
      p.id.toLowerCase() === norm ||
      p.handle?.toLowerCase() === norm ||
      p.id.toLowerCase() === withoutList ||
      p.id.toLowerCase() === `pl-${withoutList}`,
  );
}

export function placeByHandle(handle: string) {
  const h = handle.trim().toLowerCase();
  return activePlaces().find((p) => p.handle === h);
}

export function getTour(id: string, pool: WalkingTour[] = loadTours()) {
  return pool.find((t) => t.id === id);
}

/** Sync cache lookup — Firestore `markers` via markers-store fetch. */
export function getMarker(id: string) {
  return getStoredMarker(id);
}

export function originFor(marker?: MarkerDoc) {
  return marker?.geo || STAY.geo || STAY.coordinates || PRECINCT.geo || { lat: -33.85945, lng: 151.20835 };
}

export function withHandle<T extends NearbyPlace>(place: T): T {
  const handle = place.handle || handleFromPlaceId(place.id) || undefined;
  return handle ? { ...place, handle } : place;
}

export function withWalk<T extends NearbyPlace>(place: T, from = originFor()) {
  const meters = haversineMeters(from, place.geo);
  return { ...withHandle(place), meters, walk: walkLabel(meters) };
}

export function nearbyForMarker(marker?: MarkerDoc) {
  const policy = marker ? resolveCompetitorPolicy(marker) : { suppressCategories: [] as PlaceCategory[] };
  const from = originFor(marker);
  return activePlaces()
    .filter((p) => !policy.suppressCategories.includes(p.category))
    .map((p) => withWalk(p, from))
    .sort((a, b) => a.meters - b.meters);
}

function discoverRank(place: NearbyPlace) {
  if (place.deal) return 0;
  if (place.category === "eat" || place.category === "coffee") return 1;
  if (place.category === "shops" || place.category === "things") return 2;
  if (place.category === "parking" || place.category === "facilities") return 8;
  return 3;
}

/** Nearby for Discover: no car parks first, deals and food lead. Pass the guest's city to keep other cities honest. */
export function discoverPlaces(from: Geo = originFor(), city?: string) {
  return placesInCity(
    activePlaces().filter((p) => p.category !== "parking" && p.category !== "facilities"),
    city,
  )
    .map((p) => withWalk(p, from))
    .sort((a, b) => {
      const rank = discoverRank(a) - discoverRank(b);
      return rank !== 0 ? rank : a.meters - b.meters;
    });
}

export function featuredPlaces(from: Geo = originFor(), city?: string) {
  return discoverPlaces(from, city)
    .filter((p) => p.deal || p.verifiedPartner || p.category === "eat")
    .slice(0, 8);
}

export function nearbyParking(from = originFor()) {
  return activePlaces()
    .filter((p) => p.category === "parking")
    .map((p) => withWalk(p, from))
    .sort((a, b) => a.meters - b.meters);
}
