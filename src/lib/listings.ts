import { DEFAULT_LISTING_GEO, DEFAULT_PRECINCT_ID, listingToPlace, type BusinessListing } from "@shared/business";
import { isContentLive, isDemoContent, stampContentMeta } from "@shared/content-meta";
import type { NearbyPlace } from "@shared/nearby";

const KEY = "airpal.listings.v1";

let cache: BusinessListing[] = [];

function read(): BusinessListing[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BusinessListing[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const listeners = new Set<() => void>();

export function subscribeListings(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function write(rows: BusinessListing[]) {
  cache = rows;
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

export function hydrateListings() {
  cache = read();
  return cache;
}

export function getCachedListings() {
  return cache.length ? cache : read();
}

export function listedPlaces(): NearbyPlace[] {
  return getCachedListings()
    .filter((row) => isContentLive(row) && !isDemoContent(row))
    .map(listingToPlace);
}

export function upsertCachedListing(listing: BusinessListing) {
  const rows = getCachedListings();
  const next = [listing, ...rows.filter((row) => row.id !== listing.id && row.placeId !== listing.placeId)];
  write(next);
  return listing;
}

export function removeCachedListing(listingId: string) {
  const rows = getCachedListings();
  const next = rows.filter((row) => row.id !== listingId && row.placeId !== listingId);
  write(next);
  return next;
}

export function listingDefaults(
  partial: Partial<BusinessListing> &
    Pick<BusinessListing, "id" | "name" | "category" | "placeCategory" | "address" | "shortWhy">,
): BusinessListing {
  const meta = stampContentMeta(partial, {
    ownerUid: partial.ownerUid,
    ownerEmail: partial.ownerEmail,
    source: partial.source || "partner",
    verifiedOwner: partial.verifiedOwner ?? false,
    reviewStatus: partial.reviewStatus,
    createdAt: partial.createdAt,
    updatedAt: partial.updatedAt,
    expiresAt: partial.expiresAt,
  });
  return {
    hours: "See venue",
    geo: DEFAULT_LISTING_GEO,
    status: "active",
    precinctId: DEFAULT_PRECINCT_ID,
    placeId: partial.placeId || partial.id.replace(/^list-/, "pl-"),
    ...partial,
    ...meta,
  };
}
