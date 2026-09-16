export type LatLng = { lat: number; lng: number };

export interface CityOption extends LatLng {
  id: string;
  label: string;
  region?: string;
  country?: string;
  flag?: string;
}

export const CITY_OPTIONS: CityOption[] = [
  { id: "sydney", label: "Sydney", region: "NSW", country: "Australia", flag: "🇦🇺", lat: -33.8688, lng: 151.2093 },
  { id: "melbourne", label: "Melbourne", region: "VIC", country: "Australia", flag: "🇦🇺", lat: -37.8136, lng: 144.9631 },
  { id: "brisbane", label: "Brisbane", region: "QLD", country: "Australia", flag: "🇦🇺", lat: -27.4698, lng: 153.0251 },
  { id: "goldcoast", label: "Gold Coast", region: "QLD", country: "Australia", flag: "🇦🇺", lat: -28.0167, lng: 153.4 },
  { id: "byronbay", label: "Byron Bay", region: "NSW", country: "Australia", flag: "🇦🇺", lat: -28.6474, lng: 153.6120 },
  { id: "perth", label: "Perth", region: "WA", country: "Australia", flag: "🇦🇺", lat: -31.9505, lng: 115.8605 },
  { id: "adelaide", label: "Adelaide", region: "SA", country: "Australia", flag: "🇦🇺", lat: -34.9285, lng: 138.6007 },
  { id: "hobart", label: "Hobart", region: "TAS", country: "Australia", flag: "🇦🇺", lat: -42.8821, lng: 147.3272 },
  { id: "cairns", label: "Cairns", region: "QLD", country: "Australia", flag: "🇦🇺", lat: -16.9186, lng: 145.7781 },
  { id: "canberra", label: "Canberra", region: "ACT", country: "Australia", flag: "🇦🇺", lat: -35.2809, lng: 149.1300 },
  { id: "auckland", label: "Auckland", region: "North Island", country: "New Zealand", flag: "🇳🇿", lat: -36.8485, lng: 174.7633 },
  { id: "queenstown", label: "Queenstown", region: "Otago", country: "New Zealand", flag: "🇳🇿", lat: -45.0312, lng: 168.6626 },
  { id: "bali", label: "Bali", region: "Denpasar", country: "Indonesia", flag: "🇮🇩", lat: -8.4095, lng: 115.1889 },
  { id: "singapore", label: "Singapore", region: "Central", country: "Singapore", flag: "🇸🇬", lat: 1.3521, lng: 103.8198 },
  { id: "tokyo", label: "Tokyo", region: "Kanto", country: "Japan", flag: "🇯🇵", lat: 35.6762, lng: 139.6503 },
  { id: "london", label: "London", region: "Greater London", country: "United Kingdom", flag: "🇬🇧", lat: 51.5074, lng: -0.1278 },
  { id: "newyork", label: "New York", region: "NY", country: "United States", flag: "🇺🇸", lat: 40.7128, lng: -74.006 },
  { id: "delhi", label: "Delhi", region: "NCR", country: "India", flag: "🇮🇳", lat: 28.6139, lng: 77.209 },
  { id: "mumbai", label: "Mumbai", region: "Maharashtra", country: "India", flag: "🇮🇳", lat: 19.076, lng: 72.8777 },
];

const CENTERS: Record<string, LatLng> = Object.fromEntries(CITY_OPTIONS.map((c) => [c.id, { lat: c.lat, lng: c.lng }]));

const FALLBACK = CENTERS.sydney;

/** City name → map center. Unknown cities fall back to Sydney. */
export function cityCenter(name?: string): LatLng {
  if (!name) return FALLBACK;
  const key = name.trim().toLowerCase();
  for (const [city, center] of Object.entries(CENTERS)) {
    if (key.includes(city)) return center;
  }
  return FALLBACK;
}
