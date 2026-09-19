import { useCallback, useEffect, useMemo, useState } from "react";
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import {
  Coffee,
  Compass,
  ExternalLink,
  Info,
  Landmark,
  MapPin,
  Navigation,
  Sparkles,
  Star,
  CheckCircle2,
} from "lucide-react";
import { useStay } from "@/contexts/StayContext";
import { stayOrigin } from "@/lib/highlights";
import { haversineMeters, walkLabel } from "@/lib/geo";
import { mapsEmbedSrc, mapsKey, mapsMapId, mapsPlaceUrl, mapsWalkUrl } from "@/lib/maps";
import { isOpenAt } from "@/lib/hours";
import { freshnessOf } from "@shared/freshness";
import { useLocalNow } from "@/hooks/useLocalNow";
import { activePlaces, placesAround, placesInCity } from "@/lib/catalog";
import { useListings } from "@/contexts/ListingsContext";
import { useLocale } from "@/contexts/LocaleContext";
import { trackMapClick } from "@/lib/analytics";
import { Photo } from "@/components/ui/Photo";
import { cn } from "@/lib/cn";
import type { Geo } from "@shared/nearby";

export type FavoriteCategory = "all" | "cafe" | "attraction";

export interface LocalFavoriteItem {
  id: string;
  name: string;
  category: "cafe" | "attraction";
  categoryLabel: string;
  geo: Geo;
  address?: string;
  rating?: number;
  reviewCount?: number;
  meters: number;
  walk: string;
  photo?: string;
  insiderTip?: string;
  shortWhy?: string;
  priceLevel?: string;
  openNow?: boolean;
  isHostPick?: boolean;
  googleMapsUri?: string;
  source: "curated";
}

/**
 * Controller hook to center and animate the map to selected locations.
 */
function MapCameraController({ target, zoom }: { target: Geo | null; zoom?: number }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !target) return;
    map.panTo({ lat: target.lat, lng: target.lng });
    if (typeof zoom === "number") {
      map.setZoom(zoom);
    }
  }, [map, target, zoom]);

  return null;
}

export function LocalFavorites() {
  const { t } = useLocale();
  const { property, marker, session } = useStay();
  const { now, timeZone, here, city, source, usingGps } = useLocalNow();
  const { version } = useListings();
  const apiKey = mapsKey();
  const mapId = mapsMapId();

  // 1. Geolocation Context: Default to Stay Location
  const stayGeo = useMemo(() => stayOrigin(property, marker?.geo), [property, marker?.geo]);

  const [geoMode, setGeoMode] = useState<"stay" | "device">("stay");
  const [deviceGeo, setDeviceGeo] = useState<Geo | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoNotice, setGeoNotice] = useState<string | null>(null);

  const activeGeo = useMemo(() => {
    // Browsing a chosen city: anchor distances to that city, not the stay.
    if (source === "city") return here;
    if (geoMode === "device" && deviceGeo) return deviceGeo;
    return stayGeo;
  }, [source, here, geoMode, deviceGeo, stayGeo]);

  // Filters
  const [category, setCategory] = useState<FavoriteCategory>("all");
  const [maxWalkFilter, setMaxWalkFilter] = useState<boolean>(false);
  const [highRatingFilter, setHighRatingFilter] = useState<boolean>(false);

  // Selection & InfoWindow
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cameraTarget, setCameraTarget] = useState<Geo | null>(null);

  // Places pool: live listings only — no third-party directory content.
  // Filtered to the guest's active city so Kovalam never shows The Rocks.
  const curatedItems = useMemo<LocalFavoriteItem[]>(() => {
    const inStay = session.kind === "stay" || session.kind === "campus" || Boolean(session.room);
    const aroundYou = !inStay && usingGps;
    const pool = aroundYou ? placesAround(activePlaces(), activeGeo) : placesInCity(activePlaces(), city);
    const items: LocalFavoriteItem[] = [];

    for (const p of pool) {
      if (!p.geo || !Number.isFinite(p.geo.lat) || !Number.isFinite(p.geo.lng)) continue;

      let cat: "cafe" | "attraction" | null = null;
      if (p.category === "coffee" || /cafe|coffee|roasters|bakery|pâtisserie|patisserie|tea|espresso/i.test(p.name)) {
        cat = "cafe";
      } else if (
        p.category === "things" ||
        /park|reserve|museum|observatory|bridge|opera|ruins|wharf|harbour|gallery|market|heritage|distillery/i.test(
          p.name,
        )
      ) {
        cat = "attraction";
      } else if (p.category === "eat") {
        cat = "cafe";
      } else if (p.category === "shops" && /market|art|craft|gallery/i.test(p.name)) {
        cat = "attraction";
      } else if (p.category === "events") {
        cat = "attraction";
      }

      if (!cat) continue;

      const meters = Math.round(haversineMeters(activeGeo, p.geo));
      const walk = walkLabel(meters);

      items.push({
        id: p.id,
        name: p.name,
        category: cat,
        categoryLabel: cat === "cafe" ? "Cafe & Dining" : "Attraction & Sight",
        geo: p.geo,
        address: p.address,
        rating: p.rating,
        reviewCount: p.reviewCount,
        meters,
        walk,
        photo: p.heroImage || p.photos?.[0],
        insiderTip: p.insiderTip,
        shortWhy: p.shortWhy || p.subTitle,
        priceLevel: p.priceLevel,
        openNow: freshnessOf(p.hoursVerifiedAt, "hours").hideOpenNow
          ? undefined
          : (isOpenAt(p.hours, now, timeZone) ?? p.openNow),
        isHostPick: true,
        source: "curated",
      });
    }

    return items;
  }, [activeGeo, city, now, timeZone, version, source, usingGps, session.kind, session.room]);

  // Live listings, nearest first. Empty DB → empty list, honestly.
  const allFavorites = useMemo(() => {
    return [...curatedItems].sort((a, b) => a.meters - b.meters);
  }, [curatedItems]);

  // Filtered List
  const filteredFavorites = useMemo(() => {
    return allFavorites.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (maxWalkFilter && item.meters > 800) return false; // 10 min walk ~ 800m
      if (highRatingFilter && (item.rating || 0) < 4.5) return false;
      return true;
    });
  }, [allFavorites, category, maxWalkFilter, highRatingFilter]);

  const selectedPlace = useMemo(() => {
    return allFavorites.find((p) => p.id === selectedId) || null;
  }, [allFavorites, selectedId]);

  // Device GPS Location Handler
  const handleRequestDeviceLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoNotice("Geolocation is not supported by your browser");
      return;
    }

    setGeoLoading(true);
    setGeoNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: Geo = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setDeviceGeo(coords);
        setGeoMode("device");
        setCameraTarget(coords);
        setGeoLoading(false);
        const distFromStay = Math.round(haversineMeters(stayGeo, coords));
        setGeoNotice(`GPS located (${distFromStay}m from stay)`);
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === 1) {
          setGeoNotice("Location access was not granted. Using stay coordinates.");
        } else {
          setGeoNotice("Unable to retrieve GPS signal. Using stay coordinates.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, [stayGeo]);

  const handleResetStayLocation = useCallback(() => {
    setGeoMode("stay");
    setCameraTarget(stayGeo);
    setGeoNotice("Reset to property anchor");
  }, [stayGeo]);

  const handleSelectPlace = useCallback(
    (place: LocalFavoriteItem) => {
      setSelectedId(place.id);
      setCameraTarget(place.geo);
      trackMapClick({
        placeId: place.id,
        propertyId: property.id,
        source: "local_favorites",
      });
    },
    [property.id],
  );

  return (
    <section id="local-favorites-section" className="mt-8">
      {/* Section Header */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-brand border border-brand/20">
              <Sparkles size={12} />
              {t("hostPicks") || "Host Picks"}
            </span>
            {apiKey && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={11} />
                Google Maps API
              </span>
            )}
          </div>
          <h2 className="font-display mt-1 text-2xl font-extrabold tracking-tight text-ink">
            Nearby Cafes &amp; Attractions
          </h2>
          <p className="mt-0.5 text-xs text-mute font-medium">
            Walkable favorites ranked by distance from your active location
          </p>
        </div>

        {/* Geolocation Switcher Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {geoMode === "device" ? (
            <button
              type="button"
              id="btn-reset-stay-geo"
              onClick={handleResetStayLocation}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-bold text-ink border border-line transition hover:bg-paper"
              title="Switch back to stay address"
            >
              <MapPin size={13} className="text-brand" />
              Stay Anchor
            </button>
          ) : (
            <button
              type="button"
              id="btn-locate-device-geo"
              onClick={handleRequestDeviceLocation}
              disabled={geoLoading}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand px-3.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer shadow-xs"
              title="Use current device GPS location"
            >
              <Compass size={13} className={cn("text-brand", geoLoading && "animate-spin")} />
              {geoLoading ? "Locating..." : "Use My Location"}
            </button>
          )}
        </div>
      </div>

      {/* Geolocation Feedback Banner */}
      {geoNotice && (
        <div
          id="geo-notice-banner"
          className="mb-3 flex items-center justify-between rounded-2xl bg-paper px-3.5 py-2 text-xs text-mute border border-line"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <Info size={13} className="text-brand shrink-0" />
            {geoNotice}
          </span>
          <button
            type="button"
            onClick={() => setGeoNotice(null)}
            className="text-[11px] font-bold text-ink underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Primary Category Filters */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            id="filter-category-all"
            onClick={() => setCategory("all")}
            className={cn(
              "h-8 shrink-0 rounded-full px-4 text-xs font-bold transition cursor-pointer",
              category === "all" ? "bg-brand text-white" : "bg-card text-mute border border-line hover:text-ink",
            )}
          >
            All Places ({allFavorites.length})
          </button>
          <button
            type="button"
            id="filter-category-cafe"
            onClick={() => setCategory("cafe")}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-bold transition cursor-pointer",
              category === "cafe" ? "bg-brand text-white" : "bg-card text-mute border border-line hover:text-ink",
            )}
          >
            <Coffee size={13} />
            Cafes &amp; Coffee
          </button>
          <button
            type="button"
            id="filter-category-attraction"
            onClick={() => setCategory("attraction")}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-bold transition cursor-pointer",
              category === "attraction"
                ? "bg-slate-900 text-white"
                : "bg-card text-mute border border-line hover:text-ink",
            )}
          >
            <Landmark size={13} />
            Attractions &amp; Sights
          </button>
        </div>

        {/* Quick Toggles */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            id="filter-toggle-walk"
            onClick={() => setMaxWalkFilter(!maxWalkFilter)}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-full px-3 text-[11px] font-bold border transition cursor-pointer",
              maxWalkFilter ? "bg-brand/10 text-brand border-brand/30" : "bg-card text-mute border-line hover:text-ink",
            )}
          >
            <Navigation size={11} />
            &lt; 10 min walk
          </button>
          <button
            type="button"
            id="filter-toggle-rating"
            onClick={() => setHighRatingFilter(!highRatingFilter)}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-full px-3 text-[11px] font-bold border transition cursor-pointer",
              highRatingFilter
                ? "bg-brand/10 text-brand border-brand/30"
                : "bg-card text-mute border-line hover:text-ink",
            )}
          >
            <Star size={11} className="fill-current" />
            4.5+ ★
          </button>
        </div>
      </div>

      {/* Main Map Card */}
      <div className="overflow-hidden rounded-3xl bg-card ring-1 ring-line shadow-sm">
        {/* Interactive Google Map Container */}
        <div id="google-maps-canvas-container" className="relative h-72 sm:h-80 w-full bg-paper">
          {apiKey ? (
            <APIProvider apiKey={apiKey} libraries={["marker"]}>
              <GoogleMap
                mapId={mapId}
                defaultCenter={{ lat: activeGeo.lat, lng: activeGeo.lng }}
                defaultZoom={15}
                gestureHandling="greedy"
                disableDefaultUI={false}
                className="h-full w-full"
              >
                <MapCameraController target={cameraTarget} />

                {/* User / Stay Origin AdvancedMarker */}
                <AdvancedMarker
                  position={{ lat: activeGeo.lat, lng: activeGeo.lng }}
                  title={geoMode === "device" ? "Your Location" : property.name || "Stay Location"}
                >
                  <div className="relative flex items-center justify-center">
                    <span className="absolute -inset-1.5 animate-ping rounded-full bg-brand/40" />
                    <Pin background="#1805db" borderColor="#ffffff" glyphColor="#ffffff" scale={1.15} />
                  </div>
                </AdvancedMarker>

                {/* Recommendation Pins */}
                {filteredFavorites.map((place) => {
                  const isSelected = selectedId === place.id;
                  const isCafe = place.category === "cafe";

                  return (
                    <AdvancedMarker
                      key={place.id}
                      position={{ lat: place.geo.lat, lng: place.geo.lng }}
                      onClick={() => handleSelectPlace(place)}
                      title={place.name}
                    >
                      <div
                        className={cn(
                          "transition-transform duration-200",
                          isSelected ? "scale-125 z-30" : "hover:scale-110",
                        )}
                      >
                        <Pin
                          background={isCafe ? "#1805db" : "#0f172a"}
                          borderColor="#ffffff"
                          glyphColor="#ffffff"
                          scale={isSelected ? 1.2 : 0.95}
                        />
                      </div>
                    </AdvancedMarker>
                  );
                })}

                {/* Selected Place InfoWindow */}
                {selectedPlace && (
                  <InfoWindow
                    position={{ lat: selectedPlace.geo.lat, lng: selectedPlace.geo.lng }}
                    onCloseClick={() => setSelectedId(null)}
                    headerContent={<div className="text-xs font-bold text-ink truncate pr-2">{selectedPlace.name}</div>}
                  >
                    <div className="max-w-[240px] p-1">
                      {selectedPlace.photo && (
                        <div className="h-28 w-full overflow-hidden rounded-lg mb-2 bg-card">
                          <Photo
                            src={selectedPlace.photo}
                            alt={selectedPlace.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-[11px] text-mute mb-1">
                        <span className="flex items-center text-brand font-bold">
                          <Star size={11} className="fill-current mr-0.5" />
                          {selectedPlace.rating?.toFixed(1) || "—"}
                        </span>
                        <span>•</span>
                        <span className="flex items-center text-brand font-semibold">
                          <Navigation size={11} className="mr-0.5" />
                          {selectedPlace.walk}
                        </span>
                      </div>
                      <p className="text-[11px] text-mute line-clamp-2 mb-2 font-medium">
                        {selectedPlace.insiderTip || selectedPlace.shortWhy || selectedPlace.address}
                      </p>
                      <div className="flex items-center gap-2">
                        <a
                          href={mapsWalkUrl(activeGeo, selectedPlace.geo)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-brand px-2 py-1.5 text-[11px] font-bold text-white transition hover:bg-brand-ink"
                        >
                          <Navigation size={11} />
                          Walk There
                        </a>
                        <a
                          href={mapsPlaceUrl(selectedPlace.geo, selectedPlace.name)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-lg text-mute hover:text-ink border border-line"
                          title="Open in Google Maps"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </APIProvider>
          ) : (
            <iframe
              title={`Map of places near ${property.name || "your stay"}`}
              src={mapsEmbedSrc(activeGeo, property.name)}
              className="h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          )}
        </div>

        {/* Places Card Carousel / List */}
        <div className="border-t-2 border-ink p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-ink">Showing {filteredFavorites.length} recommended spots</span>
            <span className="text-[11px] text-mute font-medium flex items-center gap-1">
              <Navigation size={11} className="text-brand" />
              Times measured on foot
            </span>
          </div>

          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1 pt-1">
            {filteredFavorites.length === 0 ? (
              <div className="w-full rounded-2xl bg-paper px-4 py-6 text-center border border-line">
                <p className="text-sm font-bold text-ink">No walkable spots listed yet</p>
                <p className="mt-1 text-xs text-mute font-medium">
                  Scan a stay QR or open Explore when venues are published nearby.
                </p>
              </div>
            ) : null}
            {filteredFavorites.map((place) => {
              const isSelected = selectedId === place.id;
              const isCafe = place.category === "cafe";

              return (
                <div
                  key={place.id}
                  id={`favorite-card-${place.id}`}
                  onClick={() => handleSelectPlace(place)}
                  className={cn(
                    "group relative flex w-72 shrink-0 flex-col overflow-hidden rounded-3xl bg-paper p-3 border-2 transition cursor-pointer text-left shadow-xs hover:-translate-y-0.5",
                    isSelected ? "border-brand ring-2 ring-brand/30 shadow-md" : "border-ink hover:ring-brand/40",
                  )}
                >
                  {/* Photo Container */}
                  <div className="relative h-32 w-full overflow-hidden rounded-2xl bg-card">
                    <Photo
                      src={place.photo}
                      alt={place.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-slate-950/80 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md border border-white/10">
                      {isCafe ? (
                        <Coffee size={10} className="text-brand" />
                      ) : (
                        <Landmark size={10} className="text-indigo-400" />
                      )}
                      {isCafe ? "Cafe" : "Attraction"}
                    </div>
                    {place.isHostPick && (
                      <div className="absolute top-2 right-2 rounded-full bg-brand px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-md border border-brand-ink shadow-xs">
                        Host Pick
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="mt-3 flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-display font-extrabold text-base text-ink truncate">{place.name}</h4>
                        {place.rating && (
                          <span className="flex items-center gap-0.5 shrink-0 text-xs font-extrabold text-brand">
                            <Star size={11} className="fill-current text-brand" />
                            {place.rating.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-mute font-medium">
                        <span className="font-bold text-brand">{place.walk}</span>
                        <span>•</span>
                        <span>{place.meters}m away</span>
                        {place.priceLevel && (
                          <>
                            <span>•</span>
                            <span>{place.priceLevel}</span>
                          </>
                        )}
                      </div>

                      <p className="mt-1.5 text-xs text-mute line-clamp-2 font-medium">
                        {place.insiderTip || place.shortWhy || place.address}
                      </p>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-3 flex items-center gap-2 pt-2 border-t border-line">
                      <a
                        href={mapsWalkUrl(activeGeo, place.geo)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          trackMapClick({
                            placeId: place.id,
                            propertyId: property.id,
                            source: "local_favorites_walk",
                          });
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand py-2 text-xs font-bold text-white transition hover:bg-brand-ink shadow-xs"
                      >
                        <Navigation size={12} />
                        <span>Walk</span>
                      </a>
                      <a
                        href={mapsPlaceUrl(place.geo, place.name)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-card text-mute border border-line transition hover:text-ink hover:bg-paper"
                        title="View on Google Maps"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
