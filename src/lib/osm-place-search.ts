import { isOsmBusiness, osmHitToImport, parseOsmPlaceId, type OsmSearchHit } from "@shared/osm-place";
import type { GooglePlaceImport } from "@shared/google-place";
import type { Geo } from "@shared/nearby";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const cache = new Map<string, GooglePlaceImport>();

type NominatimRow = {
  osm_type?: string;
  osm_id?: number | string;
  name?: string;
  display_name?: string;
  category?: string;
  class?: string;
  type?: string;
  lat?: string;
  lon?: string;
  address?: Record<string, string>;
  extratags?: Record<string, string>;
};

function asAddressHit(row: NominatimRow): OsmSearchHit | null {
  const osmType = String(row.osm_type || "").toLowerCase();
  const osmId = String(row.osm_id || "");
  const name =
    String(row.name || "").trim() ||
    String(row.display_name || "")
      .split(",")[0]
      ?.trim() ||
    "";
  const lat = Number(row.lat);
  const lng = Number(row.lon);
  if (!osmType || !osmId || !name) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    osmType,
    osmId,
    name,
    displayName: String(row.display_name || name),
    category: String(row.category || row.class || "").toLowerCase(),
    type: String(row.type || "").toLowerCase(),
    lat,
    lng,
    address: row.address || {},
    extra: row.extratags || {},
  };
}

function asHit(row: NominatimRow): OsmSearchHit | null {
  const osmType = String(row.osm_type || "").toLowerCase();
  const osmId = String(row.osm_id || "");
  const name = String(row.name || "").trim();
  const category = String(row.category || row.class || "").toLowerCase();
  const type = String(row.type || "").toLowerCase();
  const lat = Number(row.lat);
  const lng = Number(row.lon);
  if (!osmType || !osmId || !isOsmBusiness(category, type, name)) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    osmType,
    osmId,
    name,
    displayName: String(row.display_name || name),
    category,
    type,
    lat,
    lng,
    address: row.address || {},
    extra: row.extratags || {},
  };
}

async function nominatim(path: string): Promise<NominatimRow[]> {
  const res = await fetch(`${NOMINATIM}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Couldn’t search listings.");
  const json = (await res.json()) as NominatimRow | NominatimRow[];
  return Array.isArray(json) ? json : [json];
}

export async function searchOsmPlaces(
  input: string,
  bias?: Geo,
  includeAddresses = false,
): Promise<Array<{ placeId: string; title: string; subtitle: string }>> {
  const needle = input.trim();
  if (needle.length < 2) return [];
  const params = new URLSearchParams({
    format: "jsonv2",
    q: needle,
    addressdetails: "1",
    extratags: "1",
    namedetails: "1",
    limit: "8",
  });
  if (bias && Number.isFinite(bias.lat) && Number.isFinite(bias.lng)) {
    const d = 0.35;
    params.set("viewbox", `${bias.lng - d},${bias.lat + d},${bias.lng + d},${bias.lat - d}`);
  }
  const rows = await nominatim(`/search?${params.toString()}`);
  const hits: Array<{ placeId: string; title: string; subtitle: string }> = [];
  for (const row of rows) {
    const hit = includeAddresses ? asAddressHit(row) || asHit(row) : asHit(row);
    if (!hit) continue;
    const place = osmHitToImport(hit);
    cache.set(place.placeId, place);
    hits.push({
      placeId: place.placeId,
      title: place.name,
      subtitle: place.address,
    });
  }
  return hits;
}

export async function fetchOsmPlace(placeId: string): Promise<GooglePlaceImport> {
  const cached = cache.get(placeId);
  if (cached) return cached;
  const parsed = parseOsmPlaceId(placeId);
  if (!parsed) throw new Error("Couldn’t load that listing.");
  const prefix = parsed.osmType === "way" ? "W" : parsed.osmType === "relation" ? "R" : "N";
  const params = new URLSearchParams({
    format: "jsonv2",
    osm_ids: `${prefix}${parsed.osmId}`,
    addressdetails: "1",
    extratags: "1",
  });
  const rows = await nominatim(`/lookup?${params.toString()}`);
  const hit = rows.map(asHit).find(Boolean);
  if (!hit) throw new Error("Couldn’t load that listing.");
  const place = osmHitToImport(hit);
  cache.set(place.placeId, place);
  return place;
}

/** Resolve a typed suburb/city to coordinates. Does not fall back to Sydney. */
export async function geocodePlaceName(query: string): Promise<{ name: string; lat: number; lng: number } | null> {
  const needle = query.trim();
  if (needle.length < 2) return null;
  const params = new URLSearchParams({
    format: "jsonv2",
    q: needle,
    addressdetails: "1",
    limit: "1",
  });
  const rows = await nominatim(`/search?${params.toString()}`);
  const row = rows[0];
  if (!row) return null;
  const lat = Number(row.lat);
  const lng = Number(row.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const name = row.name || row.address?.suburb || row.address?.city || row.address?.town || needle;
  return { name, lat, lng };
}
