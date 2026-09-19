/** Time-bounded “I’m here” at an event space — never a home address. */

import type { Geo } from "./nearby";

export const HERE_AUDIENCES = ["circle", "person"] as const;
export type HereAudience = (typeof HERE_AUDIENCES)[number];

export const HERE_HOURS = [1, 3, 8] as const;
export type HereHours = (typeof HERE_HOURS)[number];

/** ~110 m — enough to meet at a venue, not a street number. */
export const HERE_GEO_DECIMALS = 3;

export const HERE_MAX_HOURS = 8;

export type HerePin = {
  handle: string;
  uid: string;
  name: string;
  placeKey: string;
  placeName: string;
  planId?: string;
  placeId?: string;
  eventId?: string;
  geo?: Geo;
  audience: HereAudience;
  toHandle?: string;
  pinOnMap: boolean;
  expiresAt: string;
  updatedAt: string;
};

export type ShareHereRequest = {
  placeName: string;
  placeKey?: string;
  planId?: string;
  placeId?: string;
  eventId?: string;
  lat?: number;
  lng?: number;
  audience: HereAudience;
  toHandle?: string;
  hours?: HereHours;
  pinOnMap?: boolean;
};

export function roundHereGeo(geo: Geo): Geo {
  const n = 10 ** HERE_GEO_DECIMALS;
  return { lat: Math.round(geo.lat * n) / n, lng: Math.round(geo.lng * n) / n };
}

export function herePlaceKey(input: { planId?: string; placeId?: string; eventId?: string; geo?: Geo }): string {
  const planId = String(input.planId || "").trim();
  if (planId) return `plan_${planId}`.slice(0, 80);
  const placeId = String(input.placeId || "").trim();
  if (placeId) return `place_${placeId}`.slice(0, 80);
  const eventId = String(input.eventId || "").trim();
  if (eventId) return `event_${eventId}`.slice(0, 80);
  if (input.geo && Number.isFinite(input.geo.lat) && Number.isFinite(input.geo.lng)) {
    const g = roundHereGeo(input.geo);
    return `geo_${g.lat}_${g.lng}`;
  }
  return "";
}

export function herePinLive(pin: { expiresAt?: string } | null | undefined, now = Date.now()): boolean {
  if (!pin?.expiresAt) return false;
  const at = Date.parse(pin.expiresAt);
  return Number.isFinite(at) && at > now;
}

export function validateShareHere(input: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const name = String(input.placeName || "").trim();
  if (name.length < 2) errors.push("Name the place you’re at.");
  if (name.length > 80) errors.push("Place name is too long.");
  const audience = String(input.audience || "");
  if (audience !== "circle" && audience !== "person") errors.push("Choose Circle or one person.");
  if (audience === "person" && !String(input.toHandle || "").trim()) {
    errors.push("Pick someone in your Circle.");
  }
  const hours = Number(input.hours ?? 3);
  if (!HERE_HOURS.includes(hours as HereHours)) errors.push("Choose how long to share.");
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  if (input.lat != null && input.lng != null && (!Number.isFinite(lat) || !Number.isFinite(lng))) {
    errors.push("Location isn’t valid.");
  }
  return errors;
}
