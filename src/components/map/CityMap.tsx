import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLng } from "@/lib/cities";

export type MapPin = {
  id: string;
  kind: "place" | "plan";
  title: string;
  sub?: string;
  lat: number;
  lng: number;
  /** True = approximate city area (soft circle); false = precise dropped pin. */
  area: boolean;
};

function dotIcon(kind: MapPin["kind"]): L.DivIcon {
  const color = kind === "plan" ? "#f43f5e" : "#1c1917";
  return L.divIcon({
    className: "airpal-pin",
    html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};border:2.5px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35)"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

/**
 * Clean live map: precise dots where we know the spot, soft area circles
 * where we only know the city. No popups — taps report up for a native card.
 */
export function CityMap({
  center,
  pins,
  selectedId,
  onPin,
  onReady,
}: {
  center: LatLng;
  pins: MapPin[];
  selectedId?: string | null;
  onPin: (pin: MapPin) => void;
  onReady?: (map: L.Map) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const pinRef = useRef<MapPin[]>(pins);
  pinRef.current = pins;
  const onPinRef = useRef(onPin);
  onPinRef.current = onPin;

  // Touch devices: one-finger drag would trap page scroll inside the map,
  // so the map is tap-to-explore (pins + zoom buttons) while the page scrolls freely.
  const tapOnly = typeof window !== "undefined" && L.Browser.mobile;

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const touchOnly = L.Browser.mobile;
    const map = L.map(elRef.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: !touchOnly,
      attributionControl: true,
    }).setView([center.lat, center.lng], 14);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    onReady?.(map);
    if (!reduced) {
      const t = setTimeout(() => map.invalidateSize(), 350);
      return () => {
        clearTimeout(t);
        map.remove();
        mapRef.current = null;
      };
    }
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    for (const pin of pins) {
      if (pin.area) {
        L.circle([pin.lat, pin.lng], {
          radius: 420,
          color: "#f43f5e",
          weight: 1.5,
          opacity: 0.55,
          fillColor: "#f43f5e",
          fillOpacity: 0.12,
        })
          .on("click", () => onPinRef.current(pin))
          .addTo(layer);
      }
      const marker = L.marker([pin.lat, pin.lng], {
        icon: dotIcon(pin.kind),
        title: pin.title,
        opacity: selectedId && selectedId !== pin.id ? 0.45 : 1,
      })
        .on("click", () => onPinRef.current(pin))
        .addTo(layer);
      if (selectedId === pin.id) marker.setZIndexOffset(500);
    }
  }, [pins, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) map.setView([center.lat, center.lng], map.getZoom(), { animate: false });
    else map.flyTo([center.lat, center.lng], Math.max(map.getZoom(), 13), { duration: 0.8 });
  }, [center.lat, center.lng]);

  return (
    <div
      ref={elRef}
      className={tapOnly ? "airpal-taponly h-full w-full bg-card" : "h-full w-full bg-card"}
      role="application"
      aria-label="Live map of nearby places and activities"
    />
  );
}
