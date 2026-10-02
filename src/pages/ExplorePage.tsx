import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { collection, getDocs } from "firebase/firestore";
import {
  Heart,
  List as ListIcon,
  Map as MapIcon,
  MapPin,
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
  Compass,
  Calendar,
  Utensils,
  Coffee,
  Ticket,
  Users,
  Footprints,
  Hotel,
  Wifi,
  Clock,
} from "lucide-react";
import { usePlans } from "@/contexts/PlanContext";
import { useEvents } from "@/contexts/EventsContext";
import { toast } from "sonner";
import { SearchBar } from "@/components/search/SearchBar";
import { openGlobalSearch } from "@/components/search/GlobalSearchModal";
import { useLocalNow } from "@/contexts/LocalNowContext";
import { useListings } from "@/contexts/ListingsContext";
import { discoverPlaces } from "@/lib/catalog";
import {
  EXPLORE_PRICE_OPTIONS,
  EXPLORE_WHEN_OPTIONS,
  filterEventsByWhen,
  filterPlacesByPrice,
  type ExplorePrice,
  type ExploreWhen,
} from "@/lib/explore-filters";
import { hrefForPlace } from "@/lib/bio-handle";
import { knownCityCenter } from "@/lib/cities";
import { weatherLabel } from "@/lib/weather";
import { formatPlanDate } from "@shared/plan";
import { Photo } from "@/components/ui/Photo";
import { Sheet } from "@/components/ui/Sheet";
import { CityMap, type MapPin as Pin } from "@/components/map/CityMap";
import { RatingBadge } from "@/components/design-system/companions";
import { triggerHaptic } from "@/lib/native";
import { Button } from "@/components/ui/Button";
import { filterStayFinder, normalizeProperty, stayKindLabel, stayProfilePath } from "@/lib/properties";
import { getFirebaseDb } from "@/lib/firebase";
import type { PropertyInfo } from "@shared/airpal-data";
import { cn } from "@/lib/cn";

type ExploreFilter =
  "all" | "nearby" | "events" | "places" | "food" | "experiences" | "communities" | "travel" | "people";

const FILTERS: { id: ExploreFilter; label: string; icon?: typeof Compass }[] = [
  { id: "all", label: "All" },
  { id: "nearby", label: "Nearby" },
  { id: "events", label: "Events" },
  { id: "experiences", label: "Experiences" },
  { id: "places", label: "Places" },
  { id: "food", label: "Food & Drinks" },
  { id: "people", label: "Mates" },
  { id: "communities", label: "Communities" },
  { id: "travel", label: "Travel & Stays" },
];

const CURATED_JOURNEYS = [
  {
    title: "Hidden Getaways",
    subtitle: "Coastal trails & scenic spots",
    emoji: "🌴",
    color: "from-blue-500/15 to-cyan-500/10 text-blue-700 dark:text-blue-300",
  },
  {
    title: "Specialty Coffee Crawl",
    subtitle: "Artisan roasters & cafes",
    emoji: "☕",
    color: "from-amber-500/15 to-amber-700/10 text-amber-700 dark:text-amber-300",
  },
  {
    title: "Wine & Dine",
    subtitle: "Top rated restaurants & bars",
    emoji: "🍷",
    color: "from-rose-500/15 to-pink-500/10 text-rose-700 dark:text-rose-300",
  },
  {
    title: "Heritage & Culture",
    subtitle: "Historic streets & galleries",
    emoji: "🏛️",
    color: "from-emerald-500/15 to-teal-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    title: "Wellness & Nature",
    subtitle: "Parks, yoga & tranquil escapes",
    emoji: "🌿",
    color: "from-violet-500/15 to-purple-500/10 text-violet-700 dark:text-violet-300",
  },
];

export function ExplorePage() {
  const [, nav] = useLocation();
  const { publicPlans } = usePlans();
  const { calendarEvents, toggleInterested } = useEvents();
  const { city, here, today, weather } = useLocalNow();
  const { version } = useListings();

  const [filter, setFilter] = useState<ExploreFilter>("all");
  const [view, setView] = useState<"list" | "map">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [when, setWhen] = useState<ExploreWhen>("any");
  const [price, setPrice] = useState<ExplorePrice>("any");

  const effectiveCity = city && city !== "Choose a city" && city !== "Current location" ? city : "Sydney";

  const [stays, setStays] = useState<PropertyInfo[] | null>(null);
  const [staysFailed, setStaysFailed] = useState(false);

  useEffect(() => {
    if (filter !== "travel") return;
    let cancelled = false;
    setStays(null);
    setStaysFailed(false);
    const db = getFirebaseDb();
    if (!db) {
      setStays([]);
      return;
    }
    void getDocs(collection(db, "properties"))
      .then((snap) => {
        if (cancelled) return;
        const rows = snap.docs.map((d) => normalizeProperty(d.id, d.data() as Record<string, unknown>));
        setStays(filterStayFinder(rows, effectiveCity));
      })
      .catch(() => {
        if (!cancelled) setStaysFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, effectiveCity]);

  const rawPlaces = useMemo(
    () => filterPlacesByPrice(discoverPlaces(here, city, "city"), price),
    [here, city, version, price],
  );

  const places = useMemo(() => {
    let list = rawPlaces;
    if (filter === "food") {
      list = list.filter((p) => p.category === "eat" || p.category === "coffee");
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.shortWhy?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q),
      );
    }
    return list.slice(0, 30);
  }, [rawPlaces, filter, searchQuery]);

  const rawEvents = useMemo(
    () =>
      filterEventsByWhen(
        calendarEvents.filter((e) => e.date >= today),
        when,
        today,
      ).sort((a, b) => a.date.localeCompare(b.date)),
    [calendarEvents, today, when],
  );

  const events = useMemo(() => {
    let list = rawEvents;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) || e.venue?.toLowerCase().includes(q) || e.city?.toLowerCase().includes(q),
      );
    }
    return list.slice(0, 16);
  }, [rawEvents, searchQuery]);

  const rawExperiences = useMemo(() => publicPlans.filter((p) => p.isExperience), [publicPlans]);

  const experiences = useMemo(() => {
    let list = rawExperiences;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.destination?.toLowerCase().includes(q) ||
          p.city?.toLowerCase().includes(q),
      );
    }
    return list.slice(0, 12);
  }, [rawExperiences, searchQuery]);

  const pins = useMemo<Pin[]>(
    () =>
      places
        .filter((p) => p.geo && Number.isFinite(p.geo.lat) && Number.isFinite(p.geo.lng))
        .slice(0, 40)
        .map((p) => ({
          id: `place-${p.id}`,
          kind: "place" as const,
          title: p.name,
          sub: p.shortWhy,
          lat: p.geo!.lat,
          lng: p.geo!.lng,
          area: false,
        })),
    [places],
  );

  const center = useMemo(() => knownCityCenter(city) || { lat: -33.8688, lng: 151.2093 }, [city]);

  const activeFiltersCount = (when !== "any" ? 1 : 0) + (price !== "any" ? 1 : 0);

  const showAll = filter === "all" || filter === "nearby";
  const showEvents = filter === "events" || (showAll && events.length > 0 && !searchQuery);
  const showExperiences = filter === "experiences" || (showAll && experiences.length > 0 && !searchQuery);
  const showPlaces = filter === "places" || filter === "food" || showAll;
  const showPeople = filter === "people";
  const showCommunities = filter === "communities";
  const showTravel = filter === "travel";

  const selectedPlace = useMemo(() => {
    if (!selectedPin) return null;
    const placeId = selectedPin.id.replace(/^place-/, "");
    return places.find((p) => String(p.id) === placeId) || null;
  }, [selectedPin, places]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10 pb-28">
      {/* Header Banner */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              <MapPin size={12} className="shrink-0" />
              <span>{effectiveCity}</span>
            </span>
            {weather && (
              <span className="text-xs text-mute font-medium">
                {weather.temp}°C · {weatherLabel(weather.code, weather.isDay)}
              </span>
            )}
          </div>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
            Explore {effectiveCity}
          </h1>
          <p className="mt-1 text-sm text-mute">
            Places, events, and experiences.
          </p>
        </div>

        {/* View Switcher and Filter Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              setFiltersOpen(true);
            }}
            aria-label="Open filters"
            className={cn(
              "flex h-11 items-center gap-1.5 rounded-full bg-card px-4 text-xs font-semibold ring-1 transition-all active:scale-95 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              activeFiltersCount > 0
                ? "ring-brand text-brand bg-brand/10"
                : "ring-line text-mute hover:text-ink hover:bg-paper",
            )}
          >
            <SlidersHorizontal size={15} />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              setView((v) => (v === "list" ? "map" : "list"));
            }}
            aria-label={view === "list" ? "Show map" : "Show list"}
            className="flex h-11 items-center gap-1.5 rounded-full bg-card px-4 text-xs font-semibold ring-1 ring-line text-ink transition-all hover:bg-paper active:scale-95 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {view === "list" ? (
              <>
                <MapIcon size={15} className="text-brand" />
                <span>Map View</span>
              </>
            ) : (
              <>
                <ListIcon size={15} className="text-brand" />
                <span>List View</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Search Field */}
      <div className="mt-5">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          sizeVariant="md"
          variant="card"
          placeholder={`Search places, events, or experiences in ${effectiveCity}…`}
          aria-label="Search explore"
          showFullSearchAction={Boolean(searchQuery.trim())}
          fullSearchLabel="Full Search"
          onFullSearch={(q) => openGlobalSearch({ query: q, category: "places" })}
        />
      </div>

      {/* Categories Pill Scroller */}
      <div className="no-scrollbar mt-4 flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                setFilter(f.id);
              }}
              aria-pressed={active}
              className={cn(
                "flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-bold transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                active
                  ? "bg-brand text-white shadow-xs"
                  : "bg-card text-mute hover:text-ink ring-1 ring-line/80 hover:bg-paper",
              )}
            >
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* Curated Journeys Carousel */}
      {!searchQuery && view === "list" && (
        <section aria-label="Curated Journeys" className="mt-7">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-mute flex items-center gap-1.5">
              <Sparkles size={13} className="text-brand" />
              Curated Journeys
            </h2>
            <span className="text-xs text-mute">Tap to plan</span>
          </div>

          <div className="no-scrollbar mt-3 flex items-center gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            {CURATED_JOURNEYS.map((j) => (
              <Link
                key={j.title}
                href={`/plan/new?title=${encodeURIComponent(j.title)}&dest=${encodeURIComponent(effectiveCity)}`}
                onClick={() => void triggerHaptic("light")}
                className="group flex w-52 shrink-0 flex-col justify-between rounded-2xl bg-card p-4 text-left ring-1 ring-line transition-all duration-200 hover:-translate-y-0.5 hover:ring-brand/30 hover:shadow-xs active:scale-95"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{j.emoji}</span>
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-xl bg-linear-to-br transition group-hover:scale-110",
                      j.color,
                    )}
                  >
                    <Compass size={15} />
                  </span>
                </div>
                <div className="mt-3">
                  <span className="block truncate text-sm font-bold text-ink">{j.title}</span>
                  <span className="block truncate text-[11px] text-mute">{j.subtitle}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* View Mode: Map View */}
      {view === "map" ? (
        <section aria-label="Map View" className="mt-6">
          <div className="overflow-hidden rounded-3xl ring-1 ring-line shadow-xs">
            <CityMap center={center} pins={pins} selectedId={selectedPin?.id} onPin={setSelectedPin} />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">
              {pins.length} places mapped in {effectiveCity}
            </h2>
            <span className="text-xs text-mute">Tap a pin for details</span>
          </div>

          {selectedPlace ? (
            <div className="mt-3 rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ink truncate">{selectedPlace.name}</span>
                  {typeof selectedPlace.rating === "number" && <RatingBadge value={selectedPlace.rating} />}
                </div>
                <p className="text-xs text-mute truncate mt-0.5">{selectedPlace.shortWhy || "Nearby place"}</p>
              </div>
              <Button
                onClick={() => nav(hrefForPlace(selectedPlace))}
                className="h-9 shrink-0 rounded-full px-4 text-xs font-bold"
              >
                <span>View</span>
                <ArrowRight size={13} />
              </Button>
            </div>
          ) : (
            <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              {places.slice(0, 10).map((p) => (
                <Link
                  key={p.id}
                  href={hrefForPlace(p)}
                  className="w-56 shrink-0 rounded-2xl bg-card p-3 ring-1 ring-line transition hover:ring-brand/40 active:scale-95"
                >
                  <p className="truncate text-sm font-bold text-ink">{p.name}</p>
                  <p className="mt-0.5 truncate text-xs text-mute flex items-center gap-1">
                    <MapPin size={11} className="text-emerald-500" />
                    {p.shortWhy || "Nearby"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : (
        /* View Mode: List / Grid Bento */
        <div className="mt-6 space-y-8">
          {/* People / Mate Banner */}
          {showPeople && (
            <div className="overflow-hidden rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs md:p-8">
              <div className="max-w-xl">
                <span className="text-xs font-bold uppercase tracking-wider text-brand">
                  AirPal Mate · Companionship
                </span>
                <h2 className="mt-1 font-display text-2xl font-bold text-ink md:text-3xl">
                  Find someone to go with you
                </h2>
                <p className="mt-2 text-sm text-mute">
                  Connect with verified local mates for dining, concerts, road trips, and adventures in {effectiveCity}.
                </p>
                <div className="mt-5">
                  <Button
                    onClick={() => {
                      void triggerHaptic("medium");
                      nav("/mate");
                    }}
                    className="h-11 rounded-full px-6 font-bold shadow-xs"
                  >
                    <Users size={16} />
                    <span>Find Mates in {effectiveCity}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Communities Banner */}
          {showCommunities && (
            <div className="overflow-hidden rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs md:p-8">
              <div className="max-w-xl">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  AirPal Social · Circles
                </span>
                <h2 className="mt-1 font-display text-2xl font-bold text-ink md:text-3xl">
                  Communities around shared movement
                </h2>
                <p className="mt-2 text-sm text-mute">
                  Foodies, hikers, creatives, and travellers — built around real-world hangouts, not endless feeds.
                </p>
                <div className="mt-5">
                  <Button
                    onClick={() => {
                      void triggerHaptic("medium");
                      nav("/pulse");
                    }}
                    className="h-11 rounded-full px-6 font-bold shadow-xs"
                  >
                    <span>Explore Pulse & Circles</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Travel & Stays Showcase */}
          {showTravel && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
                  <Hotel size={18} className="text-brand" />
                  <span>Travel & Stays in {effectiveCity}</span>
                </h2>
                <p className="text-xs text-mute mt-0.5">Trip plans, Stay & Guide, and places to stay</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="font-display text-xl font-bold text-ink">Trip Itineraries & Plans</h3>
                    <p className="mt-1 text-xs text-mute">
                      Craft multi-stop itineraries, vote on stops, and share live invites with friends.
                    </p>
                  </div>
                  <div className="mt-4">
                    <Button onClick={() => nav("/plan")} className="h-10 rounded-full px-5 text-xs font-bold">
                      <span>Open Plans</span>
                      <ArrowRight size={13} />
                    </Button>
                  </div>
                </div>

                <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="font-display text-xl font-bold text-ink">Stay &amp; Guide</h3>
                    <p className="mt-0.5 text-xs text-mute">1-tap door PIN, Wi-Fi, dining, and stay services.</p>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Button onClick={() => nav("/concierge")} className="h-10 rounded-full px-5 text-xs font-bold">
                      <span>Open Stay & Guide</span>
                      <ArrowRight size={13} />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Verified Partner Stays Grid */}
              <section aria-label="Verified Partner Stays">
                <div className="flex items-center justify-between pb-3">
                  <div>
                    <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
                      <Hotel size={18} className="text-brand" />
                      <span>Stays in {effectiveCity}</span>
                      <span className="text-xs font-semibold text-mute">({stays === null ? "…" : stays.length})</span>
                    </h2>
                    <p className="text-xs text-mute mt-0.5">Places to stay, from live host listings</p>
                  </div>
                  <Link href="/stay" className="text-xs font-bold text-brand hover:underline shrink-0">
                    All Stays →
                  </Link>
                </div>

                {stays === null && !staysFailed ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-busy="true" aria-label="Loading stays">
                    {[0, 1].map((i) => (
                      <div key={i} className="h-64 animate-pulse rounded-3xl bg-card ring-1 ring-line" />
                    ))}
                  </div>
                ) : staysFailed || stays === null ? (
                  <div className="rounded-3xl border border-dashed border-line p-8 text-center">
                    <p className="font-display text-lg font-medium">Couldn&apos;t load stays right now</p>
                    <p className="mt-1 text-sm text-mute">Check your connection and try again.</p>
                  </div>
                ) : stays.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-line p-8 text-center">
                    <p className="font-display text-lg font-medium">No stays listed in {effectiveCity} yet</p>
                    <p className="mt-1 text-sm text-mute">Are you a host? List your stay to appear here.</p>
                    <Button size="sm" className="mt-4" onClick={() => nav("/business/onboard")}>
                      List your stay
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
                    {stays.map((p) => (
                      <div
                        key={p.id}
                        className="group relative flex flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-line shadow-xs transition hover:shadow-md"
                      >
                        <div className="relative aspect-video overflow-hidden bg-paper">
                          <Photo
                            src={p.heroImage || p.galleryImages?.[0] || "/media/harbour.jpg"}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            alt={p.name}
                          />
                          <div className="hero-scrim absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand/90 px-3 py-1 text-xs font-bold text-white shadow-xs backdrop-blur-md">
                            <Hotel size={13} /> {stayKindLabel(p.kind) || p.city || "Stay"}
                          </span>
                          <div className="absolute bottom-3 left-3 right-3">
                            <p className="font-display text-lg font-bold text-white leading-tight">{p.name}</p>
                            <p className="text-xs font-medium text-white/80 line-clamp-1 mt-0.5">
                              {p.tagline || p.address}
                            </p>
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between text-xs text-mute">
                            <span className="flex items-center gap-1">
                              <MapPin size={12} className="text-brand" />
                              {p.address || p.city}
                            </span>
                            {p.checkIn ? (
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                Check-in: {p.checkIn}
                              </span>
                            ) : null}
                          </div>

                          {p.wifi?.speed && (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 rounded-xl px-2.5 py-1">
                              <Wifi size={13} />
                              <span>{p.wifi.speed}</span>
                            </div>
                          )}

                          {p.facilities && p.facilities.length > 0 && (
                            <p className="text-xs text-mute font-medium truncate">
                              {p.facilities
                                .slice(0, 4)
                                .map((f) => f.name)
                                .join(" · ")}
                            </p>
                          )}

                          <div className="flex items-center gap-2 pt-1 border-t border-line/60">
                            <Button
                              size="sm"
                              onClick={() => nav(stayProfilePath(p))}
                              className="min-h-[44px] flex-1 rounded-full text-xs font-bold"
                            >
                              View stay
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => nav(`/concierge?p=${p.id}`)}
                              className="min-h-[44px] flex-1 rounded-full text-xs font-semibold ring-1 ring-line"
                            >
                              AI Concierge
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Events Section */}
          {showEvents && (
            <section aria-label="Upcoming Events">
              <div className="flex items-center justify-between pb-3">
                <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
                  <Calendar size={18} className="text-brand" />
                  <span>Upcoming Events</span>
                  <span className="text-xs font-semibold text-mute">({events.length})</span>
                </h2>
                <Link href="/calendar" className="text-xs font-bold text-brand hover:underline">
                  View Calendar →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {events.map((e) => (
                  <div
                    key={e.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-line transition-all duration-200 hover:-translate-y-0.5 hover:ring-brand/30 hover:shadow-xs"
                  >
                    <div className="relative aspect-square overflow-hidden bg-paper">
                      {e.heroImage ? (
                        <Photo
                          src={e.heroImage}
                          alt={e.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-brand/10 text-brand">
                          <Calendar size={32} />
                        </div>
                      )}
                      <div className="hero-scrim absolute inset-0 opacity-80" />

                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          void triggerHaptic("light");
                          if (toggleInterested(e.id) && !e.isInterested) {
                            toast.success(`Saved "${e.title}" to Interested`);
                          }
                        }}
                        aria-label={e.isInterested ? "Unsave event" : "Save event"}
                        aria-pressed={e.isInterested}
                        className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-white/90 backdrop-blur-xs transition active:scale-90 shadow-xs"
                      >
                        <Heart size={15} className={e.isInterested ? "fill-brand text-brand" : "text-ink"} />
                      </button>

                      <div className="absolute bottom-2.5 left-2.5 right-2.5">
                        <span className="inline-block rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                          {e.timeLabel}
                        </span>
                        <p className="mt-1 line-clamp-2 font-display text-sm font-bold leading-tight text-white">
                          {e.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-3">
                      <p className="truncate text-xs text-mute flex items-center gap-1">
                        <MapPin size={11} className="shrink-0 text-emerald-500" />
                        <span className="truncate">{e.venue || e.city || effectiveCity}</span>
                      </p>
                      <Link
                        href={e.gatePath || `/e/${e.id}`}
                        className="shrink-0 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white transition hover:bg-brand active:scale-95"
                      >
                        Join
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Experiences Section */}
          {showExperiences && (
            <section aria-label="Bookable Experiences">
              <div className="flex items-center justify-between pb-3">
                <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
                  <Ticket size={18} className="text-amber-500" />
                  <span>Bookable Experiences</span>
                  <span className="text-xs font-semibold text-mute">({experiences.length})</span>
                </h2>
                <Link href="/experiences" className="text-xs font-bold text-brand hover:underline">
                  All Experiences →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {experiences.map((p) => (
                  <Link
                    key={p.id}
                    href={`/plan/${p.id}`}
                    className="group relative flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-line transition-all duration-200 hover:-translate-y-0.5 hover:ring-brand/30 hover:shadow-xs"
                  >
                    <div className="relative aspect-square overflow-hidden bg-paper">
                      {p.heroImage ? (
                        <Photo
                          src={p.heroImage}
                          alt={p.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-amber-500/10 text-amber-600">
                          <Ticket size={32} />
                        </div>
                      )}
                      <div className="hero-scrim absolute inset-0 opacity-80" />

                      <span className="absolute left-2.5 top-2.5 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-slate-950 shadow-xs">
                        {p.pricePerPerson ? `$${p.pricePerPerson}` : "Tickets"}
                      </span>

                      <div className="absolute bottom-2.5 left-2.5 right-2.5">
                        <p className="line-clamp-2 font-display text-sm font-bold leading-tight text-white">
                          {p.title}
                        </p>
                      </div>
                    </div>

                    <div className="p-3">
                      <p className="truncate text-xs text-mute">{formatPlanDate(p.date, p.time)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Places Section */}
          {showPlaces && (
            <section aria-label="Places & Venues">
              <div className="flex items-center justify-between pb-3">
                <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
                  <MapPin size={18} className="text-emerald-500" />
                  <span>Places & Venues in {effectiveCity}</span>
                  <span className="text-xs font-semibold text-mute">({places.length})</span>
                </h2>
              </div>

              {places.length === 0 ? (
                <div className="rounded-3xl bg-card p-8 md:p-12 text-center ring-1 ring-line shadow-xs">
                  <div className="mx-auto mb-3.5 grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand">
                    <Compass size={24} />
                  </div>
                  <h3 className="font-display text-lg font-bold text-ink">
                    {searchQuery ? `No places found for "${searchQuery}"` : "No places available right now"}
                  </h3>
                  <p className="mt-1 text-xs text-mute max-w-xs mx-auto">
                    {searchQuery
                      ? "Try searching for a different venue or category."
                      : "Check back soon as new verified venues are onboarded."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  {places.map((p) => (
                    <Link
                      key={p.id}
                      href={hrefForPlace(p)}
                      className="group relative flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-line transition-all duration-200 hover:-translate-y-0.5 hover:ring-brand/30 hover:shadow-xs"
                    >
                      <div className="relative aspect-square overflow-hidden bg-paper">
                        {p.heroImage || p.photos?.[0] ? (
                          <Photo
                            src={p.heroImage || p.photos![0]}
                            alt={p.name}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-paper text-mute">
                            {p.category === "coffee" ? (
                              <Coffee size={32} />
                            ) : p.category === "eat" ? (
                              <Utensils size={32} />
                            ) : (
                              <Footprints size={32} />
                            )}
                          </div>
                        )}
                        <div className="hero-scrim absolute inset-0 opacity-80" />

                        {typeof p.rating === "number" && (
                          <span className="absolute left-2.5 top-2.5">
                            <RatingBadge value={p.rating} />
                          </span>
                        )}

                        <div className="absolute bottom-2.5 left-2.5 right-2.5">
                          <p className="line-clamp-2 font-display text-sm font-bold leading-tight text-white">
                            {p.name}
                          </p>
                        </div>
                      </div>

                      <div className="p-3">
                        <p className="flex items-center gap-1 truncate text-xs text-mute">
                          <MapPin size={11} className="shrink-0 text-emerald-500" />
                          <span className="truncate">{p.shortWhy || "Nearby place"}</span>
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Filter Bottom Sheet */}
      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter Explore">
        <div className="space-y-5 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-mute">When</p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Filter by when">
              {EXPLORE_WHEN_OPTIONS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    void triggerHaptic("light");
                    setWhen(w.id);
                  }}
                  aria-pressed={when === w.id}
                  className={cn(
                    "min-h-[44px] rounded-full px-4 py-2 text-xs font-semibold ring-1 transition-all active:scale-95",
                    when === w.id
                      ? "bg-brand text-white ring-transparent shadow-xs"
                      : "bg-paper text-mute ring-line hover:text-ink",
                  )}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-mute">Price</p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Filter by price">
              {EXPLORE_PRICE_OPTIONS.map((pr) => (
                <button
                  key={pr.id}
                  type="button"
                  onClick={() => {
                    void triggerHaptic("light");
                    setPrice(pr.id);
                  }}
                  aria-pressed={price === pr.id}
                  className={cn(
                    "min-h-[44px] rounded-full px-4 py-2 text-xs font-semibold ring-1 transition-all active:scale-95",
                    price === pr.id
                      ? "bg-brand text-white ring-transparent shadow-xs"
                      : "bg-paper text-mute ring-line hover:text-ink",
                  )}
                >
                  {pr.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-line">
            {(when !== "any" || price !== "any") && (
              <Button
                variant="outlined"
                aria-label="Clear filters"
                onClick={() => {
                  void triggerHaptic("light");
                  setWhen("any");
                  setPrice("any");
                }}
                className="h-11 flex-1 rounded-full text-xs font-semibold"
              >
                <span>Clear filters</span>
              </Button>
            )}

            <Button
              onClick={() => {
                void triggerHaptic("light");
                setFiltersOpen(false);
              }}
              className="h-11 flex-1 rounded-full text-xs font-bold shadow-xs"
            >
              <span>Done</span>
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
