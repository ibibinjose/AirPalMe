export interface CityRegionPreset {
  id: string;
  label: string;
  region: string;
}

export const POPULAR_CITY_PRESETS: CityRegionPreset[] = [
  { id: "sydney_cbd", label: "Sydney, NSW", region: "NSW" },
  { id: "bondi_beach", label: "Bondi Beach, NSW", region: "NSW" },
  { id: "manly", label: "Manly, NSW", region: "NSW" },
  { id: "surry_hills", label: "Surry Hills, NSW", region: "NSW" },
  { id: "parramatta", label: "Parramatta, NSW", region: "NSW" },
  { id: "byron_bay", label: "Byron Bay, NSW", region: "NSW" },
  { id: "melbourne_cbd", label: "Melbourne, VIC", region: "VIC" },
  { id: "st_kilda", label: "St Kilda, VIC", region: "VIC" },
  { id: "brisbane", label: "Brisbane, QLD", region: "QLD" },
  { id: "gold_coast", label: "Gold Coast, QLD", region: "QLD" },
  { id: "perth", label: "Perth, WA", region: "WA" },
  { id: "adelaide", label: "Adelaide, SA", region: "SA" },
  { id: "hobart", label: "Hobart, TAS", region: "TAS" },
  { id: "auckland", label: "Auckland, NZ", region: "NZ" },
  { id: "london", label: "London, UK", region: "UK" },
  { id: "new_york", label: "New York, NY", region: "US" },
  { id: "singapore", label: "Singapore", region: "SG" },
  { id: "tokyo", label: "Tokyo, Japan", region: "JP" },
];

/**
 * Cleanly formats a City / Suburb & Region string from Google Places title/subtitle
 * or address components.
 * Examples:
 * - title: "Bondi Beach", subtitle: "NSW, Australia" -> "Bondi Beach, NSW"
 * - title: "Surry Hills", subtitle: "Sydney NSW, Australia" -> "Surry Hills, NSW"
 * - title: "Melbourne", subtitle: "Victoria, Australia" -> "Melbourne, VIC"
 * - title: "Brooklyn", subtitle: "NY, USA" -> "Brooklyn, NY"
 */
export function formatCitySuburbRegion(
  title: string,
  subtitle?: string,
  addressComponents?: Array<{ longText?: string; types?: string[] }>,
): string {
  const t = (title || "").trim();
  const sub = (subtitle || "").trim();

  // If address components are provided, extract locality/sublocality and administrative area
  if (addressComponents && addressComponents.length > 0) {
    const locality =
      addressComponents.find((c) => c.types?.includes("sublocality") || c.types?.includes("sublocality_level_1"))
        ?.longText ||
      addressComponents.find((c) => c.types?.includes("locality"))?.longText ||
      addressComponents.find((c) => c.types?.includes("postal_town"))?.longText ||
      t;

    const state =
      addressComponents.find((c) => c.types?.includes("administrative_area_level_1"))?.longText ||
      addressComponents.find((c) => c.types?.includes("administrative_area_level_2"))?.longText ||
      "";

    const country = addressComponents.find((c) => c.types?.includes("country"))?.longText || "";

    const cleanLocality = locality.trim();
    const cleanState = cleanStateName(state.trim());

    if (cleanLocality && cleanState) {
      if (cleanLocality.toLowerCase().includes(cleanState.toLowerCase())) {
        return cleanLocality;
      }
      return `${cleanLocality}, ${cleanState}`;
    }

    if (cleanLocality && country && country !== "Australia") {
      return `${cleanLocality}, ${country}`;
    }

    if (cleanLocality) return cleanLocality;
  }

  if (!sub) return t;

  // Australian State match in subtitle
  const auStateMatch = sub.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/i);
  if (auStateMatch) {
    const state = auStateMatch[1].toUpperCase();
    if (t.toUpperCase().endsWith(state)) return t;
    return `${t}, ${state}`;
  }

  // General state / region parsing: take first element of subtitle
  const subParts = sub
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (subParts.length > 0) {
    const firstPart = subParts[0];
    const secondPart = subParts.length > 1 ? subParts[1] : "";

    // If firstPart contains state like "Sydney NSW" -> extract NSW
    const partState = firstPart.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/i);
    if (partState) {
      return `${t}, ${partState[1].toUpperCase()}`;
    }

    // e.g. "Victoria" -> "VIC"
    const cleanedFirst = cleanStateName(firstPart);
    if (cleanedFirst !== firstPart || /^[A-Z]{2,3}$/.test(cleanedFirst)) {
      return `${t}, ${cleanedFirst}`;
    }

    // For US states or international
    if (secondPart && (secondPart === "USA" || secondPart === "United States")) {
      return `${t}, ${firstPart}`;
    }

    if (firstPart && firstPart.toLowerCase() !== "australia") {
      return `${t}, ${firstPart}`;
    }
  }

  return t;
}

/** Standardizes Australian state names to short abbreviations */
export function cleanStateName(state: string): string {
  const s = state.trim().toLowerCase();
  switch (s) {
    case "new south wales":
      return "NSW";
    case "victoria":
      return "VIC";
    case "queensland":
      return "QLD";
    case "western australia":
      return "WA";
    case "south australia":
      return "SA";
    case "tasmania":
      return "TAS";
    case "australian capital territory":
      return "ACT";
    case "northern territory":
      return "NT";
    default:
      return state;
  }
}
