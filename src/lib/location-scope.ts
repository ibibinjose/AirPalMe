import type { Geo } from "@shared/nearby";
import { haversineMeters } from "./geo";
import { cityMatches } from "./remote-events";
import { AROUND_YOU_M } from "./catalog";

/** Events/plans people will travel a bit further for than a walk to a cafe. */
export const EVENT_NEAR_M = 15_000;

export function locatedNear(
  item: { geo?: Geo; city?: string },
  here: Geo,
  city: string,
  usingGps: boolean,
  maxMeters = AROUND_YOU_M,
): boolean {
  if (item.geo && Number.isFinite(item.geo.lat) && Number.isFinite(item.geo.lng)) {
    return haversineMeters(here, item.geo) <= maxMeters;
  }
  return cityMatches(item.city, city);
}
