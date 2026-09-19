export type LatLng = { lat: number; lng: number };

export interface CityOption extends LatLng {
  id: string;
  label: string;
  region?: string;
  country?: string;
  flag?: string;
}

export interface PrecinctOption extends LatLng {
  id: string;
  name: string;
  tagline: string;
  icon?: string;
}

export const SYDNEY_PRECINCTS: PrecinctOption[] = [
  { id: "therocks", name: "The Rocks", tagline: "Historic Harbour & Pubs", icon: "🏛️", lat: -33.8599, lng: 151.209 },
  { id: "cbd", name: "Sydney CBD", tagline: "Shopping & Dining", icon: "🏙️", lat: -33.8688, lng: 151.2093 },
  { id: "bondi", name: "Bondi & Beaches", tagline: "Coastal Walk & Surf", icon: "🏖️", lat: -33.8915, lng: 151.2767 },
  { id: "surryhills", name: "Surry Hills", tagline: "Café Culture & Design", icon: "☕", lat: -33.8867, lng: 151.2117 },
  {
    id: "darlingharbour",
    name: "Darling Harbour",
    tagline: "Waterfront & Entertainment",
    icon: "🎡",
    lat: -33.8748,
    lng: 151.2009,
  },
  { id: "barangaroo", name: "Barangaroo", tagline: "Dining & Harbour Walk", icon: "🍸", lat: -33.8634, lng: 151.2014 },
  { id: "manly", name: "Manly Beach", tagline: "Ferry & Ocean Beach", icon: "🌊", lat: -33.7971, lng: 151.2881 },
  { id: "paddington", name: "Paddington", tagline: "Boutiques & Heritage", icon: "🛍️", lat: -33.8833, lng: 151.2264 },
];

export const CITY_OPTIONS: CityOption[] = [
  { id: "sydney", label: "Sydney", region: "NSW", country: "Australia", flag: "🇦🇺", lat: -33.8688, lng: 151.2093 },
  {
    id: "melbourne",
    label: "Melbourne",
    region: "VIC",
    country: "Australia",
    flag: "🇦🇺",
    lat: -37.8136,
    lng: 144.9631,
  },
  { id: "brisbane", label: "Brisbane", region: "QLD", country: "Australia", flag: "🇦🇺", lat: -27.4698, lng: 153.0251 },
  { id: "goldcoast", label: "Gold Coast", region: "QLD", country: "Australia", flag: "🇦🇺", lat: -28.0167, lng: 153.4 },
  { id: "byronbay", label: "Byron Bay", region: "NSW", country: "Australia", flag: "🇦🇺", lat: -28.6474, lng: 153.612 },
  { id: "perth", label: "Perth", region: "WA", country: "Australia", flag: "🇦🇺", lat: -31.9505, lng: 115.8605 },
  { id: "adelaide", label: "Adelaide", region: "SA", country: "Australia", flag: "🇦🇺", lat: -34.9285, lng: 138.6007 },
  { id: "hobart", label: "Hobart", region: "TAS", country: "Australia", flag: "🇦🇺", lat: -42.8821, lng: 147.3272 },
  { id: "cairns", label: "Cairns", region: "QLD", country: "Australia", flag: "🇦🇺", lat: -16.9186, lng: 145.7781 },
  { id: "canberra", label: "Canberra", region: "ACT", country: "Australia", flag: "🇦🇺", lat: -35.2809, lng: 149.13 },
  {
    id: "auckland",
    label: "Auckland",
    region: "North Island",
    country: "New Zealand",
    flag: "🇳🇿",
    lat: -36.8485,
    lng: 174.7633,
  },
  {
    id: "queenstown",
    label: "Queenstown",
    region: "Otago",
    country: "New Zealand",
    flag: "🇳🇿",
    lat: -45.0312,
    lng: 168.6626,
  },
  { id: "bali", label: "Bali", region: "Denpasar", country: "Indonesia", flag: "🇮🇩", lat: -8.4095, lng: 115.1889 },
  {
    id: "singapore",
    label: "Singapore",
    region: "Central",
    country: "Singapore",
    flag: "🇸🇬",
    lat: 1.3521,
    lng: 103.8198,
  },
  { id: "tokyo", label: "Tokyo", region: "Kanto", country: "Japan", flag: "🇯🇵", lat: 35.6762, lng: 139.6503 },
  {
    id: "london",
    label: "London",
    region: "Greater London",
    country: "United Kingdom",
    flag: "🇬🇧",
    lat: 51.5074,
    lng: -0.1278,
  },
  { id: "newyork", label: "New York", region: "NY", country: "United States", flag: "🇺🇸", lat: 40.7128, lng: -74.006 },
  { id: "delhi", label: "Delhi", region: "NCR", country: "India", flag: "🇮🇳", lat: 28.6139, lng: 77.209 },
  { id: "mumbai", label: "Mumbai", region: "Maharashtra", country: "India", flag: "🇮🇳", lat: 19.076, lng: 72.8777 },
  {
    id: "bengaluru",
    label: "Bengaluru",
    region: "Karnataka",
    country: "India",
    flag: "🇮🇳",
    lat: 12.9716,
    lng: 77.5946,
  },
  { id: "hyderabad", label: "Hyderabad", region: "Telangana", country: "India", flag: "🇮🇳", lat: 17.385, lng: 78.4867 },
  { id: "chennai", label: "Chennai", region: "Tamil Nadu", country: "India", flag: "🇮🇳", lat: 13.0827, lng: 80.2707 },
  { id: "kolkata", label: "Kolkata", region: "West Bengal", country: "India", flag: "🇮🇳", lat: 22.5726, lng: 88.3639 },
  { id: "pune", label: "Pune", region: "Maharashtra", country: "India", flag: "🇮🇳", lat: 18.5204, lng: 73.8567 },
  { id: "ahmedabad", label: "Ahmedabad", region: "Gujarat", country: "India", flag: "🇮🇳", lat: 23.0225, lng: 72.5714 },
  { id: "jaipur", label: "Jaipur", region: "Rajasthan", country: "India", flag: "🇮🇳", lat: 26.9124, lng: 75.7873 },
  { id: "goa", label: "Goa", region: "Panaji", country: "India", flag: "🇮🇳", lat: 15.4909, lng: 73.8278 },
  { id: "kochi", label: "Kochi", region: "Kerala", country: "India", flag: "🇮🇳", lat: 9.93, lng: 76.27 },
  { id: "kovalam", label: "Kovalam", region: "Kerala", country: "India", flag: "🇮🇳", lat: 8.4, lng: 76.98 },
  { id: "trivandrum", label: "Trivandrum", region: "Kerala", country: "India", flag: "🇮🇳", lat: 8.52, lng: 76.94 },
  { id: "munnar", label: "Munnar", region: "Kerala", country: "India", flag: "🇮🇳", lat: 10.09, lng: 77.06 },
  { id: "alleppey", label: "Alleppey", region: "Kerala", country: "India", flag: "🇮🇳", lat: 9.5, lng: 76.34 },
  { id: "varkala", label: "Varkala", region: "Kerala", country: "India", flag: "🇮🇳", lat: 8.74, lng: 76.7 },
  { id: "wayanad", label: "Wayanad", region: "Kerala", country: "India", flag: "🇮🇳", lat: 11.61, lng: 76.08 },
  { id: "kumarakom", label: "Kumarakom", region: "Kerala", country: "India", flag: "🇮🇳", lat: 9.62, lng: 76.43 },
  {
    id: "dubai",
    label: "Dubai",
    region: "Dubai",
    country: "United Arab Emirates",
    flag: "🇦🇪",
    lat: 25.2048,
    lng: 55.2708,
  },
  {
    id: "abudhabi",
    label: "Abu Dhabi",
    region: "Abu Dhabi",
    country: "United Arab Emirates",
    flag: "🇦🇪",
    lat: 24.4539,
    lng: 54.3773,
  },
  {
    id: "sharjah",
    label: "Sharjah",
    region: "Sharjah",
    country: "United Arab Emirates",
    flag: "🇦🇪",
    lat: 25.3463,
    lng: 55.4209,
  },
  {
    id: "manchester",
    label: "Manchester",
    region: "England",
    country: "United Kingdom",
    flag: "🇬🇧",
    lat: 53.4808,
    lng: -2.2426,
  },
  {
    id: "losangeles",
    label: "Los Angeles",
    region: "CA",
    country: "United States",
    flag: "🇺🇸",
    lat: 34.0522,
    lng: -118.2437,
  },
  {
    id: "sanfrancisco",
    label: "San Francisco",
    region: "CA",
    country: "United States",
    flag: "🇺🇸",
    lat: 37.7749,
    lng: -122.4194,
  },
  { id: "toronto", label: "Toronto", region: "Ontario", country: "Canada", flag: "🇨🇦", lat: 43.6532, lng: -79.3832 },
  { id: "vancouver", label: "Vancouver", region: "BC", country: "Canada", flag: "🇨🇦", lat: 49.2827, lng: -123.1207 },
  { id: "paris", label: "Paris", region: "Île-de-France", country: "France", flag: "🇫🇷", lat: 48.8566, lng: 2.3522 },
  { id: "berlin", label: "Berlin", region: "Berlin", country: "Germany", flag: "🇩🇪", lat: 52.52, lng: 13.405 },
  { id: "madrid", label: "Madrid", region: "Madrid", country: "Spain", flag: "🇪🇸", lat: 40.4168, lng: -3.7038 },
  { id: "barcelona", label: "Barcelona", region: "Catalonia", country: "Spain", flag: "🇪🇸", lat: 41.3874, lng: 2.1686 },
  { id: "rome", label: "Rome", region: "Lazio", country: "Italy", flag: "🇮🇹", lat: 41.9028, lng: 12.4964 },
  {
    id: "amsterdam",
    label: "Amsterdam",
    region: "North Holland",
    country: "Netherlands",
    flag: "🇳🇱",
    lat: 52.3676,
    lng: 4.9041,
  },
  { id: "dublin", label: "Dublin", region: "Leinster", country: "Ireland", flag: "🇮🇪", lat: 53.3498, lng: -6.2603 },
];

const CENTERS: Record<string, LatLng> = Object.fromEntries(CITY_OPTIONS.map((c) => [c.id, { lat: c.lat, lng: c.lng }]));

const FALLBACK = CENTERS.sydney;

/** City name → map center. Unknown names return null — never snap Kochi to Sydney. */
export function cityCenter(name?: string, fallback: LatLng | null = FALLBACK): LatLng | null {
  const known = knownCityCenter(name);
  if (known) return known;
  if (!name) return fallback;
  const key = name.trim().toLowerCase();
  for (const [city, center] of Object.entries(CENTERS)) {
    if (key.includes(city) || city.includes(key)) return center;
  }
  return fallback;
}

export function currencyForCity(name?: string): string {
  const key = (name || "").trim().toLowerCase();
  const hit = CITY_OPTIONS.find(
    (c) => c.id === key || c.label.toLowerCase() === key || key.includes(c.label.toLowerCase()),
  );
  const country = hit?.country;
  if (country === "India") return "INR";
  if (country === "United Arab Emirates") return "AED";
  if (country === "United Kingdom") return "GBP";
  if (country === "United States") return "USD";
  if (country === "Canada") return "CAD";
  if (
    country === "France" ||
    country === "Germany" ||
    country === "Spain" ||
    country === "Italy" ||
    country === "Netherlands" ||
    country === "Ireland"
  )
    return "EUR";
  if (country === "United Kingdom") return "GBP";
  if (country === "United States") return "USD";
  if (country === "Japan") return "JPY";
  if (country === "Singapore") return "SGD";
  if (country === "Indonesia") return "IDR";
  if (country === "New Zealand") return "NZD";
  return "AUD";
}

/** City name → country name, or undefined when unknown. */
export function countryForCity(name?: string): string | undefined {
  const key = (name || "").trim().toLowerCase();
  if (!key) return undefined;
  const hit = CITY_OPTIONS.find(
    (c) => c.id === key || c.label.toLowerCase() === key || key.includes(c.label.toLowerCase()),
  );
  return hit?.country;
}

/** City id → IANA timezone. US/Canada span zones, so this is per-city. */
const CITY_TIMEZONES: Record<string, string> = {
  sydney: "Australia/Sydney",
  melbourne: "Australia/Melbourne",
  brisbane: "Australia/Brisbane",
  goldcoast: "Australia/Brisbane",
  byronbay: "Australia/Sydney",
  perth: "Australia/Perth",
  adelaide: "Australia/Adelaide",
  hobart: "Australia/Hobart",
  cairns: "Australia/Brisbane",
  canberra: "Australia/Sydney",
  auckland: "Pacific/Auckland",
  queenstown: "Pacific/Auckland",
  bali: "Asia/Makassar",
  singapore: "Asia/Singapore",
  tokyo: "Asia/Tokyo",
  london: "Europe/London",
  manchester: "Europe/London",
  newyork: "America/New_York",
  losangeles: "America/Los_Angeles",
  sanfrancisco: "America/Los_Angeles",
  toronto: "America/Toronto",
  vancouver: "America/Vancouver",
  paris: "Europe/Paris",
  berlin: "Europe/Berlin",
  madrid: "Europe/Madrid",
  barcelona: "Europe/Madrid",
  rome: "Europe/Rome",
  amsterdam: "Europe/Amsterdam",
  dublin: "Europe/Dublin",
  dubai: "Asia/Dubai",
  abudhabi: "Asia/Dubai",
  sharjah: "Asia/Dubai",
};

/** City name → IANA timezone. Unknown cities fall back to the device zone. */
export function timeZoneForCity(name?: string): string {
  const key = (name || "").trim().toLowerCase();
  const hit = CITY_OPTIONS.find(
    (c) => c.id === key || c.label.toLowerCase() === key || key.includes(c.label.toLowerCase()),
  );
  if (hit && CITY_TIMEZONES[hit.id]) return CITY_TIMEZONES[hit.id];
  if (hit?.country === "India") return "Asia/Kolkata";
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Australia/Sydney";
  } catch {
    return "Australia/Sydney";
  }
}

/** City name → BCP-47 locale for Intl formatting (English UI, local conventions). */
export function localeForCity(name?: string): string {
  const country = countryForCity(name);
  if (country === "India") return "en-IN";
  if (country === "United Arab Emirates") return "en-AE";
  if (country === "Australia" || country === "New Zealand") return "en-AU";
  if (country === "United Kingdom") return "en-GB";
  if (country === "United States") return "en-US";
  if (country === "Canada") return "en-CA";
  if (country === "France") return "en-FR";
  if (country === "Germany") return "en-DE";
  if (country === "Spain") return "en-ES";
  if (country === "Italy") return "en-IT";
  if (country === "Netherlands") return "en-NL";
  if (country === "Ireland") return "en-IE";
  if (country === "Japan") return "en-JP";
  if (country === "Singapore") return "en-SG";
  if (country === "Indonesia") return "en-ID";
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || "en";
  } catch {
    return "en";
  }
}

/** City name → map center, or null when the city isn't a known option (never falls back). */
export function knownCityCenter(name?: string): LatLng | null {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  const found = CITY_OPTIONS.find((c) => c.id === key || c.label.toLowerCase() === key);
  return found ? { lat: found.lat, lng: found.lng } : null;
}

/** Road-trip radius for "places in this city" filtering. */
export const CITY_RADIUS_KM = 60;
