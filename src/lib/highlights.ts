import type { PropertyInfo } from "@shared/airpal-data";
import type { Geo, NearbyPlace } from "@shared/nearby";
import { activePlaces, getPlace, originFor, withWalk } from "./catalog";

export type HighlightKind = "cafe" | "park" | "see";

export type Highlight = NearbyPlace & {
  kind: HighlightKind;
  meters: number;
  walk: string;
};

const PARK_IDS = new Set(["foundation-park", "first-fleet-park", "dawes-point"]);

export function highlightKind(place: NearbyPlace): HighlightKind | null {
  if (place.category === "coffee") return "cafe";
  if (place.category === "things") {
    if (PARK_IDS.has(place.id) || /park|reserve|lawn/i.test(place.name)) return "park";
    return "see";
  }
  return null;
}

export function stayOrigin(property: PropertyInfo, markerGeo?: Geo): Geo {
  return property.geo || property.coordinates || markerGeo || originFor();
}

export function hostHighlights(property: PropertyInfo, from: Geo): Highlight[] {
  const ids = property.recommendedPlaceIds || [];
  const picked = ids.map((id) => getPlace(id)).filter((p): p is NearbyPlace => Boolean(p));
  const pool = picked.length ? picked : activePlaces();
  return pool
    .map((place) => {
      const kind = highlightKind(place);
      if (!kind) return null;
      const walked = withWalk(place, from);
      return { ...walked, kind };
    })
    .filter((row): row is Highlight => Boolean(row))
    .sort((a, b) => a.meters - b.meters);
}
