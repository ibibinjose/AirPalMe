import type { Geo } from "@shared/nearby";
import { isNativeApp } from "./native";

function asGeo(lat: number, lng: number): Geo | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

async function nativeCurrentPosition(): Promise<Geo | null> {
  if (!isNativeApp()) return null;
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 30_000,
    });
    return asGeo(pos.coords.latitude, pos.coords.longitude);
  } catch {
    return null;
  }
}

function webCurrentPosition(highAccuracy: boolean): Promise<Geo | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    const timer = window.setTimeout(() => resolve(null), highAccuracy ? 12_000 : 7_000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer);
        resolve(asGeo(pos.coords.latitude, pos.coords.longitude));
      },
      () => {
        window.clearTimeout(timer);
        resolve(null);
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: highAccuracy ? 11_000 : 6_500,
        maximumAge: highAccuracy ? 15_000 : 5 * 60 * 1000,
      },
    );
  });
}

/** GPS on web, iOS, and Android. Native uses Capacitor Geolocation, then the WebView API. */
export async function requestDeviceGeo(opts?: { highAccuracy?: boolean }): Promise<Geo | null> {
  const highAccuracy = Boolean(opts?.highAccuracy) || isNativeApp();
  const native = await nativeCurrentPosition();
  if (native) return native;
  return webCurrentPosition(highAccuracy);
}

export function watchDeviceGeo(onFix: (geo: Geo) => void): () => void {
  let cancelled = false;
  let watchId: number | null = null;
  let nativeHandle: string | null = null;

  void (async () => {
    if (isNativeApp()) {
      try {
        const { Geolocation } = await import("@capacitor/geolocation");
        nativeHandle = await Geolocation.watchPosition({ enableHighAccuracy: true }, (pos, err) => {
          if (cancelled || err || !pos) return;
          const geo = asGeo(pos.coords.latitude, pos.coords.longitude);
          if (geo) onFix(geo);
        });
        return;
      } catch {
        /* fall through to web */
      }
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (cancelled) return;
        const geo = asGeo(pos.coords.latitude, pos.coords.longitude);
        if (geo) onFix(geo);
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 12_000 },
    );
  })();

  return () => {
    cancelled = true;
    if (watchId != null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    if (nativeHandle) {
      void import("@capacitor/geolocation")
        .then(({ Geolocation }) => Geolocation.clearWatch({ id: nativeHandle! }))
        .catch(() => undefined);
    }
  };
}
