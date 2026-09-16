import type { Geo } from "@shared/nearby";

export function haversineMeters(a: Geo, b: Geo) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function walkLabel(meters: number) {
  const mins = Math.max(1, Math.round(meters / 80));
  if (meters < 80) return "1 min";
  if (mins >= 60) return `${Math.round(mins / 60)} h`;
  return `${mins} min`;
}

export function mapsUrl(geo: Geo, name?: string) {
  const q = name ? encodeURIComponent(name) : `${geo.lat},${geo.lng}`;
  return `https://maps.google.com/?q=${q}`;
}
