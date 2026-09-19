import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Geo } from "@shared/nearby";
import { useStay } from "./StayContext";
import { PRECINCT } from "@/lib/catalog";
import { stayOrigin } from "@/lib/highlights";
import { DEFAULT_TZ, deviceTimeZone, formatLocalDay, formatLocalTime, toZonedDateStr } from "@/lib/local-time";
import { loadLocalWeather, type LocalWeather, type WeatherOrigin } from "@/lib/weather";
import { requestDeviceGeo, watchDeviceGeo } from "@/lib/geo-locate";
import { geoDrifted } from "@/lib/weather";
import {
  loadLastGps,
  loadLocationChoice,
  loadShareLocation,
  saveLastGps,
  saveLocationChoice,
  saveShareLocation,
  type LocationChoice,
} from "@/lib/location-pref";
import { useOptionalBattery } from "@/hooks/useBattery";

export type LocalNowValue = {
  now: Date;
  timeZone: string;
  today: string;
  time: string;
  day: string;
  city: string;
  /** True when here is the device GPS, not The Rocks / a chosen city. */
  usingGps: boolean;
  /** Physical / GPS-or-fallback point for weather, time, and Discover. */
  here: Geo;
  /** Stay pin when the guest is in a stay; otherwise same as here. */
  anchor: Geo;
  source: WeatherOrigin["source"];
  weather: LocalWeather | null;
  loading: boolean;
  failed: boolean;
  choice: LocationChoice;
  shareLocation: boolean;
  chooseLocation: (choice: LocationChoice) => void;
  setShareLocation: (on: boolean) => void;
  refresh: () => void;
};

const LocalNowContext = createContext<LocalNowValue | undefined>(undefined);

export function LocalNowProvider({ children }: { children: ReactNode }) {
  const { property, marker, session } = useStay();
  const stayGeo = useMemo(() => stayOrigin(property, marker?.geo), [property, marker?.geo]);
  const inStay =
    session.kind === "stay" || session.kind === "campus" || session.kind === "marker" || Boolean(session.room);

  const [choice, setChoice] = useState<LocationChoice>(() => loadLocationChoice());
  const [shareLocation, setShareLocationState] = useState(() => loadShareLocation());
  const [now, setNow] = useState(() => new Date());
  const [deviceGeo, setDeviceGeo] = useState<Geo | null>(null);
  const [weather, setWeather] = useState<LocalWeather | null>(null);
  const [failed, setFailed] = useState(false);

  const fallback = useMemo<WeatherOrigin>(() => {
    if (inStay) {
      return {
        lat: stayGeo.lat,
        lng: stayGeo.lng,
        source: "stay",
        city: property.city || PRECINCT.city,
      };
    }
    const last = loadLastGps();
    if (last) {
      return { lat: last.lat, lng: last.lng, source: "gps", city: last.city || "" };
    }
    return { lat: stayGeo.lat, lng: stayGeo.lng, source: "precinct", city: "" };
  }, [stayGeo.lat, stayGeo.lng, inStay, property.city]);

  const preferred = useMemo<WeatherOrigin>(() => {
    if (choice.mode === "city") return { lat: choice.lat, lng: choice.lng, source: "city", city: choice.city };
    if (choice.mode === "stay") return fallback;
    if (choice.mode === "gps" && deviceGeo) return { ...deviceGeo, source: "gps" };
    return fallback;
  }, [choice, deviceGeo, fallback]);

  const battery = useOptionalBattery();
  const powerSave = Boolean(battery?.powerSaveActive);

  useEffect(() => {
    const intervalMs = powerSave ? 60_000 : 15_000;
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [powerSave]);

  const load = useCallback(async (origin: WeatherOrigin) => {
    try {
      const data = await loadLocalWeather(origin);
      setWeather(data);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load(preferred);
  }, [load, preferred]);

  useEffect(() => {
    if (choice.mode === "city" || choice.mode === "stay") return;
    let alive = true;
    void requestDeviceGeo({ highAccuracy: choice.mode === "gps" }).then((geo) => {
      if (!alive || !geo) return;
      setDeviceGeo(geo);
      saveLastGps(geo);
      void load({ ...geo, source: "gps" });
    });
    const stop = watchDeviceGeo((geo) => {
      if (!alive) return;
      setDeviceGeo((prev) => {
        if (prev && !geoDrifted(prev, geo, 250)) return prev;
        saveLastGps(geo);
        void load({ ...geo, source: "gps" });
        return geo;
      });
    });
    return () => {
      alive = false;
      stop();
    };
  }, [choice.mode, load]);

  const chooseLocation = useCallback(
    (next: LocationChoice) => {
      saveLocationChoice(next);
      setChoice(next);
      if (next.mode === "gps" || next.mode === "auto") {
        void requestDeviceGeo({ highAccuracy: true }).then((geo) => {
          if (!geo) return;
          setDeviceGeo(geo);
          saveLastGps(geo);
          void load({ ...geo, source: "gps" });
        });
      }
    },
    [load],
  );

  const setShareLocation = useCallback((on: boolean) => {
    saveShareLocation(on);
    setShareLocationState(on);
  }, []);

  const refresh = useCallback(() => {
    void load(preferred);
    if (choice.mode === "city" || choice.mode === "stay") return;
    void requestDeviceGeo({ highAccuracy: choice.mode === "gps" }).then((geo) => {
      if (!geo) return;
      setDeviceGeo(geo);
      void load({ ...geo, source: "gps" });
    });
  }, [choice.mode, load, preferred]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refresh]);

  const here = choice.mode === "city" ? preferred : deviceGeo && choice.mode !== "stay" ? deviceGeo : preferred;
  const usingGps = Boolean(deviceGeo) && choice.mode !== "city" && choice.mode !== "stay";
  const anchor = inStay ? stayGeo : here;
  const timeZone = weather?.timezone || deviceTimeZone() || DEFAULT_TZ;
  const city = usingGps
    ? weather?.source === "gps" && weather.city
      ? weather.city
      : "Current location"
    : weather?.city || preferred.city || "Choose a city";

  const value = useMemo<LocalNowValue>(
    () => ({
      now,
      timeZone,
      today: toZonedDateStr(now, timeZone),
      time: formatLocalTime(now, timeZone),
      day: formatLocalDay(now, timeZone),
      city,
      usingGps,
      here,
      anchor,
      source: weather?.source || preferred.source,
      weather,
      loading: !weather && !failed,
      failed,
      choice,
      shareLocation,
      chooseLocation,
      setShareLocation,
      refresh,
    }),
    [
      now,
      timeZone,
      city,
      usingGps,
      here,
      anchor,
      weather,
      preferred.source,
      failed,
      choice,
      shareLocation,
      chooseLocation,
      setShareLocation,
      refresh,
    ],
  );

  return <LocalNowContext.Provider value={value}>{children}</LocalNowContext.Provider>;
}

export function useLocalNow() {
  const ctx = useContext(LocalNowContext);
  if (!ctx) throw new Error("useLocalNow must be used within LocalNowProvider");
  return ctx;
}

export function useOptionalLocalNow() {
  return useContext(LocalNowContext);
}
