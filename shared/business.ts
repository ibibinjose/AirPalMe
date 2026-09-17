import type { ContentMeta } from "./content-meta";
import type { Geo, NearbyPlace, PlaceCategory, PlaceDeal } from "./nearby";

export const BUSINESS_CATEGORIES = [
  { id: "eat", place: "eat", label: "Eat", line: "Restaurants & dining" },
  { id: "coffee", place: "coffee", label: "Coffee", line: "Cafés & bakeries" },
  { id: "bar", place: "eat", label: "Bar", line: "Pubs & wine" },
  { id: "club", place: "eat", label: "Club", line: "Nights, DJs, guest list" },
  { id: "shops", place: "shops", label: "Shop", line: "Retail & makers" },
  { id: "fashion", place: "shops", label: "Fashion Brand", line: "Designer apparel, drops & rentals" },
  { id: "things", place: "things", label: "See", line: "Parks, museums, walks" },
  { id: "events", place: "events", label: "Events", line: "Nights & tickets" },
  { id: "wellness", place: "services", label: "Wellness", line: "Spa, gym, massage" },
  { id: "services", place: "services", label: "Help", line: "Laundry, pharmacy, money" },
  { id: "parking", place: "parking", label: "Park", line: "Garages & bays" },
  { id: "stay", place: "stay", label: "Stay", line: "Rooms & inns" },
] as const;

export type BusinessCategoryId = (typeof BUSINESS_CATEGORIES)[number]["id"];

export function placeCategoryFor(id: string): PlaceCategory {
  const hit = BUSINESS_CATEGORIES.find((c) => c.id === id);
  return (hit?.place || "eat") as PlaceCategory;
}

/** Reverse map: a place category → the listing category that shelves it. */
export function businessCategoryForPlace(place: string): BusinessCategoryId {
  const hit = BUSINESS_CATEGORIES.find((c) => c.place === place);
  return (hit?.id || "things") as BusinessCategoryId;
}

export type BusinessListing = {
  id: string;
  placeId: string;
  ownerUid?: string;
  ownerEmail?: string;
  name: string;
  category: BusinessCategoryId;
  placeCategory: PlaceCategory;
  address: string;
  geo: Geo;
  hours: string;
  shortWhy: string;
  heroImage?: string;
  phone?: string;
  deal?: PlaceDeal;
  handle?: string;
  status: "active" | "inactive";
  precinctId: string;
  source?: ContentMeta["source"];
  verifiedOwner?: boolean;
  reviewStatus?: ContentMeta["reviewStatus"];
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  /** Last time opening hours were confirmed. Guest Open now hides when this is too old. */
  hoursVerifiedAt?: string;
};

export const DEFAULT_LISTING_GEO: Geo = { lat: -33.85955, lng: 151.20715 };
export const DEFAULT_PRECINCT_ID = "the-rocks";

export function listingToPlace(listing: BusinessListing): NearbyPlace {
  return {
    id: listing.placeId,
    name: listing.name,
    category: listing.placeCategory,
    shortWhy: listing.shortWhy,
    geo: listing.geo,
    hours: listing.hours,
    source: "partner",
    status: listing.status === "active" ? "active" : "inactive",
    precinctId: listing.precinctId,
    address: listing.address,
    heroImage: listing.heroImage,
    deal: listing.deal,
    verifiedPartner: true,
    handle: listing.handle,
    phone: listing.phone,
    hoursVerifiedAt: listing.hoursVerifiedAt || listing.updatedAt,
  };
}

export function isBusinessCategory(id: string): id is BusinessCategoryId {
  return BUSINESS_CATEGORIES.some((c) => c.id === id);
}
