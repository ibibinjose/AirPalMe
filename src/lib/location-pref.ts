import type { Geo } from "@shared/nearby";
import { cityCenter, CITY_OPTIONS } from "./cities";

export type LocationChoice =
  | { mode: "auto" }
  | { mode: "gps" }
  | { mode: "stay" }
  | { mode: "city"; city: string; lat: number; lng: number };

const CHOICE_KEY = "airpal.location.v1";
const SHARE_KEY = "airpal.location.share";

export function loadLocationChoice(): LocationChoice {
  try {
    if (typeof window !== "undefined" && window.location?.search) {
      const urlCity = new URLSearchParams(window.location.search).get("city");
      if (urlCity) {
        const center = cityCenter(urlCity);
        const match = CITY_OPTIONS.find(
          (c) =>
            c.label.toLowerCase() === urlCity.toLowerCase() ||
            c.id.toLowerCase() === urlCity.toLowerCase(),
        );
        const cityLabel = match?.label || urlCity;
        return { mode: "city", city: cityLabel, lat: center.lat, lng: center.lng };
      }
    }
    const raw = localStorage.getItem(CHOICE_KEY);
    if (!raw) return { mode: "auto" };
    const parsed = JSON.parse(raw) as LocationChoice;
    if (!parsed || typeof parsed !== "object") return { mode: "auto" };
    if (parsed.mode === "city" && parsed.city && Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) return parsed;
    if (parsed.mode === "gps" || parsed.mode === "stay" || parsed.mode === "auto") return { mode: parsed.mode };
  } catch {
    /* ignore */
  }
  return { mode: "auto" };
}

export function saveLocationChoice(choice: LocationChoice) {
  try {
    localStorage.setItem(CHOICE_KEY, JSON.stringify(choice));
  } catch {
    /* ignore */
  }
}

export function loadShareLocation(): boolean {
  try {
    return localStorage.getItem(SHARE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveShareLocation(on: boolean) {
  try {
    if (on) localStorage.setItem(SHARE_KEY, "1");
    else localStorage.removeItem(SHARE_KEY);
  } catch {
    /* ignore */
  }
}

export function choiceAsOrigin(
  choice: LocationChoice,
  fallback: Geo & { city?: string; source: "gps" | "stay" | "precinct" | "city" },
): Geo & { city?: string; source: "gps" | "stay" | "precinct" | "city" } {
  if (choice.mode === "city") return { lat: choice.lat, lng: choice.lng, city: choice.city, source: "city" };
  return fallback;
}
