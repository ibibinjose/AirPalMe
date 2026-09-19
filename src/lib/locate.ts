import { locationFromNominatim, type HostLocationFields } from "@shared/geo-address";
import type { Geo } from "@shared/nearby";

export async function locateBusiness(): Promise<{ geo: Geo; fields?: HostLocationFields }> {
  const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is off"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error("Allow location for this place")), {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
  const geo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${geo.lat}&lon=${geo.lng}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { geo };
    const data = (await res.json()) as { address?: Record<string, string>; lat?: string; lon?: string };
    return { geo, fields: locationFromNominatim({ ...data, lat: String(geo.lat), lon: String(geo.lng) }) };
  } catch {
    return { geo };
  }
}
