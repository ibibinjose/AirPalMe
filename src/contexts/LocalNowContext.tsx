import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Geo } from "@shared/nearby";
import { useStay } from "./StayContext";
import { PRECINCT } from "@/lib/catalog";
import { stayOrigin } from "@/lib/highlights";
import {
  DEFAULT_TZ,
  deviceTimeZone,
  formatLocalDay,
  formatLocalTime,
  toZonedDateStr,
} from "@/lib/local-time";
import {
  geoDrifted,
  loadLocalWeather,
  requestDeviceGeo,
  type LocalWeather,
  type WeatherOrigin,
} from "@/lib/weather";
import {
  loadLocationChoice,
  loadShareLocation,
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
  const inStay = session.kind === "stay" || session.kind === "campus" || session.kind === "marker" || Boolean(session.room);

  const [choice, setChoice] = useState<LocationChoice>(() => loadLocationChoice());
  const [shareLocation, setShareLocationState] = useState(() => loadShareLocation());
  const [now, setNow] = useState(() => new Date());
  const [deviceGeo, setDeviceGeo] = useState<Geo | null>(null);
  const [weather, setWeather] = useState<LocalWeather | null>(null);
  const [failed, setFailed] = useState(false);

  const fallback = useMemo<WeatherOrigin>(
    () => ({
      lat: stayGeo.lat,
      lng: stayGeo.lng,
      source: inStay ? "stay" : "precinct",
      city: property.city || PRECINCT.city,
    }),
    [stayGeo.lat, stayGeo.lng, inStay, property.city],
  );

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

  const load = useCallback(
    async (origin: WeatherOrigin) => {
      try {
        const data = await loadLocalWeather(origin);
        setWeather(data);
        setFailed(false);
      } catch {
        setFailed(true);
      }
    },
    [],
  );

  useEffect(() => {
    void load(preferred);
  }, [load, preferred]);

  useEffect(() => {
    if (choice.mode === "city") return;
    let alive = true;
    void requestDeviceGeo().then((geo) => {
      if (!alive || !geo) return;
      setDeviceGeo(geo);
      if (choice.mode === "gps" || (choice.mode === "auto" && geoDrifted(geo, fallback))) {
        void load({ ...geo, source: "gps" });
      }
    });
    return () => {
      alive = false;
    };
  }, [choice.mode, fallback, load]);

  const chooseLocation = useCallback((next: LocationChoice) => {
    saveLocationChoice(next);
    setChoice(next);
    if (next.mode === "gps") {
      void requestDeviceGeo().then((geo) => {
        if (!geo) return;
        setDeviceGeo(geo);
        void load({ ...geo, source: "gps" });
      });
    }
  }, [load]);

  const setShareLocation = useCallback((on: boolean) => {
    saveShareLocation(on);
    setShareLocationState(on);
  }, []);

  const refresh = useCallback(() => {
    void load(preferred);
    if (choice.mode === "city") return;
    void requestDeviceGeo().then((geo) => {
      if (!geo) return;
      setDeviceGeo(geo);
      if (choice.mode === "gps" || (choice.mode === "auto" && geoDrifted(geo, fallback))) {
        void load({ ...geo, source: "gps" });
      }
    });
  }, [choice.mode, fallback, load, preferred]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refresh]);

  const here = choice.mode === "city" ? preferred : deviceGeo && choice.mode !== "stay" ? deviceGeo : preferred;
  const anchor = inStay ? stayGeo : here;
  const timeZone = weather?.timezone || deviceTimeZone() || DEFAULT_TZ;
  const city = weather?.city || preferred.city || PRECINCT.city;

  const value = useMemo<LocalNowValue>(
    () => ({
      now,
      timeZone,
      today: toZonedDateStr(now, timeZone),
      time: formatLocalTime(now, timeZone),
      day: formatLocalDay(now, timeZone),
      city,
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
