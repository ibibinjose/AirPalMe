import { PRECINCT } from "./catalog";
import { haversineMeters } from "./geo";
import type { Geo } from "@shared/nearby";

export type ForecastDay = {
  date: string;
  weekday: string;
  code: number;
  high: number;
  low: number;
  rain: number;
};

export type LocalWeather = {
  lat: number;
  lng: number;
  source: "gps" | "precinct" | "stay" | "city";
  city: string;
  timezone: string;
  temp: number;
  feels: number;
  code: number;
  isDay: boolean;
  humidity: number;
  wind: number;
  days: ForecastDay[];
  fetchedAt: number;
};

const CACHE_KEY = "airpal.local-now.v2";
const CACHE_MS = 15 * 60 * 1000;
const STALE_CACHE_MS = 6 * 60 * 60 * 1000;

const FALLBACK = PRECINCT.geo ?? { lat: -33.85945, lng: 151.20835 };

export type WeatherOrigin = Geo & {
  source: "gps" | "stay" | "precinct" | "city";
  city?: string;
};

type OpenMeteo = {
  timezone?: string;
  current?: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    is_day: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
};

export function weatherLabelKey(code: number, isDay: boolean) {
  if (code === 0) return isDay ? "wx.clear" : "wx.clearNight";
  if (code <= 2) return "wx.fair";
  if (code === 3) return "wx.cloudy";
  if (code <= 48) return "wx.fog";
  if (code <= 57) return "wx.drizzle";
  if (code <= 67 || (code >= 80 && code <= 82)) return "wx.rain";
  if (code <= 77 || (code >= 85 && code <= 86)) return "wx.snow";
  if (code >= 95) return "wx.storm";
  return "wx.fair";
}

export function weatherLabel(code: number, isDay: boolean) {
  switch (weatherLabelKey(code, isDay)) {
    case "wx.clear":
      return "Clear";
    case "wx.clearNight":
      return "Clear night";
    case "wx.cloudy":
      return "Cloudy";
    case "wx.fog":
      return "Fog";
    case "wx.drizzle":
      return "Drizzle";
    case "wx.rain":
      return "Rain";
    case "wx.snow":
      return "Snow";
    case "wx.storm":
      return "Storm";
    default:
      return "Fair";
  }
}

export function weekdayShort(iso: string, timeZone: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleDateString([], { weekday: "short", timeZone });
  } catch {
    return "";
  }
}

function cityFromTimezone(tz: string) {
  const part = tz.split("/").pop() || PRECINCT.city;
  return part.replace(/_/g, " ");
}

function readCache(origin: WeatherOrigin, allowStale = false): LocalWeather | null {
  try {
    const raw = sessionStorage.getItem(cacheBucket(origin));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalWeather;
    const age = Date.now() - parsed.fetchedAt;
    if (age < CACHE_MS) return parsed;
    if (allowStale && age < STALE_CACHE_MS) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function writeCache(origin: WeatherOrigin, data: LocalWeather) {
  try {
    sessionStorage.setItem(cacheBucket(origin), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export { requestDeviceGeo, watchDeviceGeo } from "./geo-locate";

function cacheBucket(origin: WeatherOrigin) {
  return `${CACHE_KEY}:${origin.source}:${origin.lat.toFixed(2)}:${origin.lng.toFixed(2)}`;
}

/** Prefer suburb (Ashfield) over metro city (Sydney) so GPS is not labelled The Rocks. */
export function pickReverseLocality(json: { locality?: string; city?: string; principalSubdivision?: string }): string {
  const locality = String(json.locality || "").trim();
  const city = String(json.city || "").trim();
  const state = String(json.principalSubdivision || "").trim();
  if (locality && locality.toLowerCase() !== city.toLowerCase()) return locality;
  return locality || city || state;
}

async function reverseCity(lat: number, lng: number, timezone: string) {
  try {
    const res = await fetch(
      `https://api-bdc.io/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
    );
    if (!res.ok) throw new Error("geo");
    const json = (await res.json()) as { city?: string; locality?: string; principalSubdivision?: string };
    return pickReverseLocality(json) || cityFromTimezone(timezone);
  } catch {
    return cityFromTimezone(timezone);
  }
}

async function fetchForecast(lat: number, lng: number): Promise<OpenMeteo> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set(
    "current",
    "temperature_2m,weather_code,is_day,apparent_temperature,relative_humidity_2m,wind_speed_10m",
  );
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
  url.searchParams.set("forecast_days", "3");
  url.searchParams.set("timezone", "auto");

  let lastStatus = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 800));
    const res = await fetch(url);
    lastStatus = res.status;
    if (res.ok) return (await res.json()) as OpenMeteo;
    if (res.status !== 429 && res.status < 500) break;
  }
  throw new Error(`weather:${lastStatus || "fetch"}`);
}

export function defaultWeatherOrigin(): WeatherOrigin {
  return { ...FALLBACK, source: "precinct", city: PRECINCT.city };
}

export async function loadLocalWeather(origin?: WeatherOrigin): Promise<LocalWeather> {
  const coords = origin || defaultWeatherOrigin();
  const cached = readCache(coords);
  if (cached) return cached;

  try {
    const json = await fetchForecast(coords.lat, coords.lng);
    const current = json.current;
    const daily = json.daily;
    if (!current || !daily) throw new Error("weather:empty");

    const timezone = json.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const city =
      coords.source === "gps"
        ? await reverseCity(coords.lat, coords.lng, timezone)
        : coords.city || (coords.source === "city" ? "Nearby" : PRECINCT.city);

    const days: ForecastDay[] = daily.time.slice(0, 3).map((date, i) => ({
      date,
      weekday: weekdayShort(date, timezone),
      code: daily.weather_code[i] ?? 0,
      high: Math.round(daily.temperature_2m_max[i] ?? current.temperature_2m),
      low: Math.round(daily.temperature_2m_min[i] ?? current.temperature_2m),
      rain: daily.precipitation_probability_max[i] ?? 0,
    }));

    const data: LocalWeather = {
      lat: coords.lat,
      lng: coords.lng,
      source: coords.source,
      city,
      timezone,
      temp: Math.round(current.temperature_2m),
      feels: Math.round(current.apparent_temperature),
      code: current.weather_code,
      isDay: current.is_day === 1,
      humidity: current.relative_humidity_2m,
      wind: Math.round(current.wind_speed_10m),
      days,
      fetchedAt: Date.now(),
    };
    writeCache(coords, data);
    return data;
  } catch (err) {
    const stale = readCache(coords, true);
    if (stale) return stale;
    throw err;
  }
}

export function geoDrifted(a: Geo, b: Geo, meters = 2500) {
  return haversineMeters(a, b) > meters;
}
