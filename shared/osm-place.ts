import { categoryFromGoogleTypes, socialsAndMenuFromWebsite, type GooglePlaceImport } from "./google-place";
import type { BusinessCategoryId } from "./business";

export type OsmSearchHit = {
  osmType: string;
  osmId: string;
  name: string;
  displayName: string;
  category: string;
  type: string;
  lat: number;
  lng: number;
  address: Record<string, string>;
  extra: Record<string, string>;
};

const OSM_POI = new Set(["amenity", "tourism", "shop", "leisure", "craft", "office", "club", "healthcare", "historic"]);

const OSM_SKIP_TYPES = new Set(["yes", "residential", "apartments", "house", "garage"]);

export function osmPlaceId(osmType: string, osmId: string | number): string {
  return `osm:${String(osmType).toLowerCase()}:${String(osmId)}`;
}

export function parseOsmPlaceId(id: string): { osmType: string; osmId: string } | null {
  const m = /^osm:(node|way|relation):(\d+)$/i.exec(id.trim());
  if (!m) return null;
  return { osmType: m[1]!.toLowerCase(), osmId: m[2]! };
}

export function isOsmBusiness(category: string, type: string, name: string): boolean {
  if (!name.trim()) return false;
  if (!OSM_POI.has(category.toLowerCase())) return false;
  return !OSM_SKIP_TYPES.has(type.toLowerCase());
}

export function categoryFromOsm(category: string, type: string): BusinessCategoryId {
  const t = type.toLowerCase();
  if (t === "pub" || t === "biergarten") return "bar";
  if (t === "fast_food" || t === "food_court") return "eat";
  if (t === "guest_house" || t === "hostel" || t === "motel" || t === "apartment") return "stay";
  if (t === "clothes" || t === "fashion") return "fashion";
  if (t === "fitness_centre" || t === "fitness_center" || t === "hairdresser") return "wellness";
  return categoryFromGoogleTypes([type, category], type);
}

export function formatOsmAddress(address: Record<string, string>, displayName: string): string {
  const line = [address.house_number, address.road].filter(Boolean).join(" ");
  const locality = address.suburb || address.quarter || "";
  const city = address.city || address.town || address.village || "";
  const region = [address.state, address.postcode].filter(Boolean).join(" ");
  const parts = [line, locality, city, region].map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.join(", ");
  const cleaned = displayName
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && p.toLowerCase() !== "australia");
  return cleaned.slice(0, 4).join(", ") || displayName;
}

export function osmHitToImport(hit: OsmSearchHit): GooglePlaceImport {
  const website = String(hit.extra.website || hit.extra["contact:website"] || "").trim();
  const phone = String(hit.extra.phone || hit.extra["contact:phone"] || hit.extra["contact:mobile"] || "").trim();
  const hours = String(hit.extra.opening_hours || "").trim();
  const extras = socialsAndMenuFromWebsite(website);
  const address = formatOsmAddress(hit.address, hit.displayName);
  const city = hit.address.city || hit.address.town || hit.address.suburb || "Sydney";
  const kind = hit.type.replace(/_/g, " ");
  return {
    placeId: osmPlaceId(hit.osmType, hit.osmId),
    name: hit.name.trim() || hit.displayName.split(",")[0]!.trim(),
    address,
    city,
    geo: Number.isFinite(hit.lat) && Number.isFinite(hit.lng) ? { lat: hit.lat, lng: hit.lng } : undefined,
    phone,
    website,
    googleMapsUri: `https://www.openstreetmap.org/${hit.osmType}/${hit.osmId}`,
    hours,
    shortWhy: `A ${kind} in ${city}.`,
    category: categoryFromOsm(hit.category, hit.type),
    photoNames: [],
    menuUrl: extras.menuUrl,
    socials: extras.socials,
  };
}
