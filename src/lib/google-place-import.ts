import {
  categoryFromGoogleTypes,
  cityFromAddressComponents,
  hoursFromWeekdayDescriptions,
  isGoogleBusinessPrediction,
  shortWhyFromGoogle,
  socialsAndMenuFromWebsite,
  type GooglePlaceImport,
} from "@shared/google-place";
import type { Geo } from "@shared/nearby";
import { mapsKey } from "./maps";
import { fetchOsmPlace, searchOsmPlaces } from "./osm-place-search";
import { parseOsmPlaceId } from "@shared/osm-place";

const PLACES = "https://places.googleapis.com/v1";

export type GooglePlaceSuggestion = {
  placeId: string;
  title: string;
  subtitle: string;
};

const SYDNEY: Geo = { lat: -33.8688, lng: 151.2093 };

export function googleSearchErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : "Search failed.";
  if (/api key|maps key|REQUEST_DENIED|API_KEY|PERMISSION_DENIED/i.test(raw)) {
    return "Couldn’t search listings. Type the name.";
  }
  return raw;
}

type AutocompleteJson = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      types?: string[];
      structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
    };
  }>;
  error?: { message?: string };
};

type PlaceDetailsJson = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  photos?: Array<{ name?: string }>;
  types?: string[];
  primaryType?: string;
  editorialSummary?: { text?: string };
  addressComponents?: Array<{ longText?: string; types?: string[] }>;
  error?: { message?: string };
};

export function newPlacesSessionToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function googlePhotoUrl(photoName: string, maxPx = 800): string {
  const key = mapsKey();
  if (!photoName || !key) return "";
  const path = photoName.replace(/^\//, "");
  return `${PLACES}/${path}/media?maxHeightPx=${maxPx}&key=${encodeURIComponent(key)}`;
}

async function placesFetch(path: string, init: RequestInit, fieldMask: string): Promise<Response> {
  const key = mapsKey();
  if (!key) throw new Error("Add a Google Maps key to import a listing.");
  return fetch(`${PLACES}/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": fieldMask,
      ...(init.headers || {}),
    },
  });
}

export async function searchGooglePlaces(
  input: string,
  sessionToken: string,
  bias?: Geo,
  includeAddresses = false,
): Promise<GooglePlaceSuggestion[]> {
  const needle = input.trim();
  if (needle.length < 2) return [];
  const center = bias && Number.isFinite(bias.lat) && Number.isFinite(bias.lng) ? bias : SYDNEY;
  const res = await placesFetch(
    "places:autocomplete",
    {
      method: "POST",
      body: JSON.stringify({
        input: needle,
        languageCode: "en",
        includedRegionCodes: ["au", "in", "ae", "gb", "us", "ca", "fr", "de", "es", "it", "nl", "ie"],
        includePureServiceAreaBusinesses: false,
        sessionToken,
        locationBias: {
          circle: { center: { latitude: center.lat, longitude: center.lng }, radius: 40000 },
        },
      }),
    },
    "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types",
  );
  const json = (await res.json()) as AutocompleteJson;
  if (!res.ok) throw new Error(json.error?.message || "Google search failed.");
  return (json.suggestions || [])
    .map((row) => {
      const p = row.placePrediction;
      if (!p?.placeId) return null;
      if (!includeAddresses && !isGoogleBusinessPrediction(p.types)) return null;
      return {
        placeId: p.placeId,
        title: p.structuredFormat?.mainText?.text || p.text?.text || "Place",
        subtitle: p.structuredFormat?.secondaryText?.text || "",
      } satisfies GooglePlaceSuggestion;
    })
    .filter((row): row is GooglePlaceSuggestion => Boolean(row));
}

export async function searchPlaces(input: string, sessionToken: string, bias?: Geo): Promise<GooglePlaceSuggestion[]> {
  if (canImportGooglePlaces()) return searchGooglePlaces(input, sessionToken, bias, false);
  return searchOsmPlaces(input, bias);
}

/** Venues and street addresses for plan/event “Where” fields. */
export async function searchAddressPlaces(
  input: string,
  sessionToken: string,
  bias?: Geo,
): Promise<GooglePlaceSuggestion[]> {
  if (canImportGooglePlaces()) return searchGooglePlaces(input, sessionToken, bias, true);
  return searchOsmPlaces(input, bias, true);
}

/** Localities, suburbs, cities and regions for "City / Suburb & Region" fields. */
export async function searchCityRegions(
  input: string,
  sessionToken: string,
  bias?: Geo,
): Promise<GooglePlaceSuggestion[]> {
  const needle = input.trim();
  if (needle.length < 2) return [];
  if (!canImportGooglePlaces()) {
    return searchOsmPlaces(needle, bias, true);
  }
  const center = bias && Number.isFinite(bias.lat) && Number.isFinite(bias.lng) ? bias : SYDNEY;
  try {
    const res = await placesFetch(
      "places:autocomplete",
      {
        method: "POST",
        body: JSON.stringify({
          input: needle,
          languageCode: "en",
          includedPrimaryTypes: [
            "locality",
            "sublocality",
            "sublocality_level_1",
            "administrative_area_level_1",
            "administrative_area_level_2",
            "postal_code",
            "neighborhood",
          ],
          includedRegionCodes: ["au", "in", "ae", "gb", "us", "ca", "fr", "de", "es", "it", "nl", "ie", "nz", "sg", "my", "th", "ph", "id", "jp", "kr", "vn"],
          sessionToken,
          locationBias: {
            circle: { center: { latitude: center.lat, longitude: center.lng }, radius: 50000 },
          },
        }),
      },
      "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types",
    );
    const json = (await res.json()) as AutocompleteJson;
    if (res.ok && json.suggestions && json.suggestions.length > 0) {
      return json.suggestions
        .map((row) => {
          const p = row.placePrediction;
          if (!p?.placeId) return null;
          return {
            placeId: p.placeId,
            title: p.structuredFormat?.mainText?.text || p.text?.text || "Place",
            subtitle: p.structuredFormat?.secondaryText?.text || "",
          } satisfies GooglePlaceSuggestion;
        })
        .filter((row): row is GooglePlaceSuggestion => Boolean(row));
    }
  } catch {
    // Fallback if specific types are not accepted
  }
  return searchGooglePlaces(needle, sessionToken, bias, true);
}

export async function fetchPlace(placeId: string, sessionToken: string): Promise<GooglePlaceImport> {
  if (parseOsmPlaceId(placeId)) return fetchOsmPlace(placeId);
  return fetchGooglePlace(placeId, sessionToken);
}

export async function fetchGooglePlace(placeId: string, sessionToken: string): Promise<GooglePlaceImport> {
  const id = placeId.replace(/^places\//, "");
  const res = await placesFetch(
    `places/${encodeURIComponent(id)}?sessionToken=${encodeURIComponent(sessionToken)}&languageCode=en`,
    { method: "GET" },
    [
      "id",
      "displayName",
      "formattedAddress",
      "shortFormattedAddress",
      "location",
      "nationalPhoneNumber",
      "internationalPhoneNumber",
      "websiteUri",
      "googleMapsUri",
      "regularOpeningHours",
      "photos",
      "types",
      "primaryType",
      "editorialSummary",
      "addressComponents",
    ].join(","),
  );
  const json = (await res.json()) as PlaceDetailsJson;
  if (!res.ok) throw new Error(json.error?.message || "Could not load that Google listing.");
  const website = String(json.websiteUri || "").trim();
  const extras = socialsAndMenuFromWebsite(website);
  const lat = Number(json.location?.latitude);
  const lng = Number(json.location?.longitude);
  const address = String(json.formattedAddress || json.shortFormattedAddress || "").trim();
  return {
    placeId: json.id || id,
    name: String(json.displayName?.text || "").trim(),
    address,
    city: cityFromAddressComponents(json.addressComponents, address),
    geo: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined,
    phone: String(json.internationalPhoneNumber || json.nationalPhoneNumber || "").trim(),
    website,
    googleMapsUri: String(json.googleMapsUri || "").trim(),
    hours: hoursFromWeekdayDescriptions(json.regularOpeningHours?.weekdayDescriptions),
    shortWhy: shortWhyFromGoogle(json.editorialSummary?.text, json.primaryType),
    category: categoryFromGoogleTypes(json.types || [], json.primaryType),
    photoNames: (json.photos || [])
      .map((p) => String(p.name || ""))
      .filter(Boolean)
      .slice(0, 4),
    menuUrl: extras.menuUrl,
    socials: extras.socials,
  };
}

export function canImportGooglePlaces(): boolean {
  return Boolean(mapsKey());
}

/** Resolves a Places photo resource to a durable googleusercontent URL (no API key in the src). */
export async function fetchGooglePhotoUri(photoName: string, maxPx = 800): Promise<string> {
  const key = mapsKey();
  const path = photoName.replace(/^\//, "");
  if (!key || !path) return "";
  const res = await fetch(`${PLACES}/${path}/media?maxHeightPx=${maxPx}&skipHttpRedirect=true`, {
    headers: { "X-Goog-Api-Key": key },
  });
  if (!res.ok) return googlePhotoUrl(photoName, maxPx);
  const json = (await res.json()) as { photoUri?: string };
  return String(json.photoUri || "") || googlePhotoUrl(photoName, maxPx);
}

export async function resolveGooglePlacePhotos(place: GooglePlaceImport): Promise<GooglePlaceImport> {
  const urls: string[] = [];
  for (const name of place.photoNames.slice(0, 2)) {
    const uri = await fetchGooglePhotoUri(name);
    if (uri) urls.push(uri);
  }
  return { ...place, photoNames: urls };
}
