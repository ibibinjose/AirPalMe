import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Heart, List as ListIcon, Map as MapIcon, MapPin, SlidersHorizontal } from "lucide-react";
import { usePlans } from "@/contexts/PlanContext";
import { useEvents } from "@/contexts/EventsContext";
import { toast } from "sonner";
import { useLocalNow } from "@/contexts/LocalNowContext";
import { useListings } from "@/contexts/ListingsContext";
import { discoverPlaces } from "@/lib/catalog";
import { hrefForPlace } from "@/lib/bio-handle";
import { knownCityCenter } from "@/lib/cities";
import { formatPlanDate } from "@shared/plan";
import { Photo } from "@/components/ui/Photo";
import { EmptyState } from "@/components/ui/EmptyState";
import { Sheet } from "@/components/ui/Sheet";
import { CityMap, type MapPin as Pin } from "@/components/map/CityMap";
import {
  AirPalSearchField,
  CardShell,
  PillRow,
  RatingBadge,
} from "@/components/design-system/companions";


type ExploreFilter = "nearby" | "events" | "places" | "food" | "experiences" | "communities" | "travel" | "people";

const FILTERS: { id: ExploreFilter; label: string; color: string }[] = [
  { id: "nearby", label: "Nearby", color: "#121614" },
  { id: "events", label: "Events", color: "#e86a33" },
  { id: "places", label: "Places", color: "#2b7cd3" },
  { id: "food", label: "Food", color: "#d99a17" },
  { id: "experiences", label: "Experiences", color: "#0e9f8a" },
  { id: "communities", label: "Communities", color: "#2fa866" },
  { id: "travel", label: "Travel", color: "#b3541e" },
  { id: "people", label: "People", color: "#e86a33" },
];

export function ExplorePage() {
  const [, nav] = useLocation();
  const { publicPlans } = usePlans();
  const { calendarEvents, toggleInterested } = useEvents();
  const { city, here, today } = useLocalNow();
  const { version } = useListings();
  const [filter, setFilter] = useState<ExploreFilter>("nearby");
  const [view, setView] = useState<"list" | "map">("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);

  const places = useMemo(
    () => discoverPlaces(here, city, "city").slice(0, 20),
    [here, city, version],
  );

  const events = useMemo(
    () =>
      calendarEvents
        .filter((e) => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 12),
    [calendarEvents, today],
  );

  const experiences = useMemo(
    () => publicPlans.filter((p) => p.isExperience).slice(0, 8),
    [publicPlans],
  );

  const pins = useMemo<Pin[]>(
    () =>
      places
        .filter((p) => p.geo && Number.isFinite(p.geo.lat) && Number.isFinite(p.geo.lng))
        .slice(0, 30)
        .map((p) => ({
          id: `place-${p.id}`,
          kind: "place" as const,
          title: p.name,
          sub: p.shortWhy,
          lat: p.geo.lat,
          lng: p.geo.lng,
          area: false,
        })),
    [places],
  );

  const center = useMemo(
    () => knownCityCenter(city) || { lat: -33.8688, lng: 151.2093 },
    [city],
  );

  const showEvents = filter === "events";
  const showExperiences = filter === "experiences";
  const showPeople = filter === "people";
  const showCommunities = filter === "communities";
  const showTravel = filter === "travel";

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 md:px-6">
      <header className="pt-6">
        <h1 className="font-display text-[28px] font-bold tracking-tight">Explore</h1>
        <div className="mt-3">
          <AirPalSearchField placeholder="Search" />
        </div>
        <p className="mt-3 text-[15px] font-semibold">
          {city || "Sydney"} <span className="font-normal text-mute">· For you</span>
        </p>
      </header>

      <div className="mt-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <PillRow options={FILTERS} value={filter} onChange={setFilter} label="Explore categories" />
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-label="Open filters"
          className="grid h-9 w-9 shrink-0 cursor-pointer touch-manipulation place-items-center rounded-full bg-card ring-1 ring-line transition hover:ring-brand/40 active:scale-95"
        >
          <SlidersHorizontal size={16} className="text-mute" />
        </button>
        <button
          type="button"
          onClick={() => setView((v) => (v === "list" ? "map" : "list"))}
          aria-label={view === "list" ? "Show map" : "Show list"}
          className="grid h-9 w-9 shrink-0 cursor-pointer touch-manipulation place-items-center rounded-full bg-card ring-1 ring-line transition hover:ring-brand/40 active:scale-95"
        >
          {view === "list" ? <MapIcon size={16} className="text-mute" /> : <ListIcon size={16} className="text-mute" />}
        </button>
      </div>

      {/* Journeys live one level down: tapping one starts planning it */}
      <section aria-label="Journeys" className="mt-5">
        <p className="text-[15px] font-semibold">Journeys</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {["Getaways", "Root Escapes", "Sacred Journeys", "Wellness", "Heritage"].map((j) => (
            <Link
              key={j}
              href={`/plan/new?title=${encodeURIComponent(j)}`}
              className="shrink-0 touch-manipulation rounded-full bg-card px-4 py-2 text-[13px] font-semibold ring-1 ring-line transition hover:ring-brand/40 active:scale-[0.97]"
            >
              {j}
            </Link>
          ))}
        </div>
      </section>

      {view === "map" ? (
        <section aria-label="Map" className="mt-4">
          <div className="overflow-hidden rounded-3xl ring-1 ring-line">
            <CityMap
              center={center}
              pins={pins}
              selectedId={selectedPin?.id}
              onPin={setSelectedPin}
            />
          </div>
          <p className="mt-3 text-[14px] font-semibold">
            {pins.length} places near you
          </p>
          <div className="mt-2 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {places.slice(0, 8).map((p) => (
              <CardShell key={p.id} href={hrefForPlace(p)} label={p.name} className="w-60 shrink-0">
                <div className="p-3">
                  <p className="font-display text-[15px] font-semibold leading-tight">{p.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-mute">
                    <MapPin size={12} /> {p.shortWhy || "Nearby"}
                  </p>
                </div>
              </CardShell>
            ))}
          </div>
        </section>
      ) : showPeople ? (
        <section aria-label="People" className="mt-4">
          <CardShell href="/mate" label="Find people to go with" className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold">
              People travelling nearby
            </p>
            <p className="font-display mt-1 text-[20px] font-semibold">
              Find someone to go with you.
            </p>
            <p className="mt-1 text-[14px] text-mute">
              Travel together · Find companions · Meet locals · Join a group. Intent first —
              never a dating feed.
            </p>
            <span className="mt-3 inline-block rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-white">
              Find People
            </span>
          </CardShell>
        </section>
      ) : showCommunities ? (
        <section aria-label="Communities" className="mt-4">
          <CardShell href="/club" label="Open communities" className="p-5">
            <p className="font-display text-[20px] font-semibold">Communities around movement</p>
            <p className="mt-1 text-[14px] text-mute">
              Foodies, travellers and locals — built around plans and experiences, not endless posts.
            </p>
            <span className="mt-3 inline-block rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-white">
              Explore communities
            </span>
          </CardShell>
        </section>
      ) : showTravel ? (
        <section aria-label="Travel" className="mt-4 grid grid-cols-2 gap-3">
          <CardShell href="/plan" label="Open plans" className="p-5">
            <p className="font-display text-[18px] font-semibold">Plans</p>
            <p className="mt-1 text-[14px] text-mute">Itineraries, maps, people — one plan at a time.</p>
          </CardShell>
          <CardShell href="/concierge" label="Open stays" className="p-5">
            <p className="font-display text-[18px] font-semibold">Stays</p>
            <p className="mt-1 text-[14px] text-mute">Hotels, motels, serviced apartments, hostels.</p>
          </CardShell>
        </section>
      ) : showEvents ? (
        <section aria-label="Events" className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {events.map((e) => (
            <CardShell key={e.id} href={e.gatePath || `/e/${e.id}`} label={e.title}>
              <div className="relative aspect-square bg-paper">
                {e.heroImage && (
                  <Photo src={e.heroImage} className="absolute inset-0 h-full w-full object-cover" />
                )}
                <div className="hero-scrim absolute inset-0" />
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.preventDefault();
                    if (toggleInterested(e.id) && !e.isInterested)
                      toast.success(`Saved "${e.title}" to Interested`);
                  }}
                  aria-label={e.isInterested ? "Unsave event" : "Save event"}
                  aria-pressed={e.isInterested}
                  className="absolute right-3 top-3 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-white/85 transition active:scale-90"
                >
                  <Heart size={17} className={e.isInterested ? "fill-brand text-brand" : "text-ink"} />
                </button>
                <p className="absolute bottom-2 left-3 right-3 font-display text-[19px] font-bold leading-tight text-white">
                  {e.title}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <p className="text-[13px] font-medium text-mute">
                  {e.timeLabel}
                  {e.venue ? ` · ${e.venue}` : e.city ? ` · ${e.city}` : ""}
                </p>
                <Link
                  href={e.gatePath || `/e/${e.id}`}
                  className="shrink-0 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white"
                >
                  Join
                </Link>
              </div>
            </CardShell>
          ))}
          {events.length === 0 && (
            <EmptyState
              title="No events right now."
              body="New events land here as organisers publish them."
              action={() => nav("/calendar")}
              actionLabel="Open calendar"
            />
          )}
        </section>
      ) : showExperiences ? (
        <section aria-label="Experiences" className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {experiences.map((p) => (
            <CardShell key={p.id} href={`/plan/${p.id}`} label={p.title}>
              <div className="relative aspect-square bg-paper">
                {p.heroImage && (
                  <Photo src={p.heroImage} className="absolute inset-0 h-full w-full object-cover" />
                )}
                <div className="hero-scrim absolute inset-0" />
                <p className="absolute bottom-2 left-3 right-3 font-display text-[19px] font-bold leading-tight text-white">
                  {p.title}
                </p>
              </div>
              <div className="p-3">
                <p className="text-[13px] font-medium text-mute">
                  Experience · {formatPlanDate(p.date, p.time)}
                </p>
              </div>
            </CardShell>
          ))}
          {experiences.length === 0 && (
            <EmptyState
              title="No experiences yet."
              body="Experiences from providers appear here once published."
              action={() => nav("/experiences")}
              actionLabel="Browse experiences"
            />
          )}
        </section>
      ) : (
        <section aria-label="Places" className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {places.map((p) => (
            <CardShell key={p.id} href={hrefForPlace(p)} label={p.name}>
              <div className="relative aspect-square bg-paper">
                {(p.heroImage || p.photos?.[0]) ? (
                  <Photo
                    src={p.heroImage || p.photos![0]}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                <div className="hero-scrim absolute inset-0" />
                {typeof p.rating === "number" && (
                  <span className="absolute left-3 top-3">
                    <RatingBadge value={p.rating} />
                  </span>
                )}
                <p className="absolute bottom-2 left-3 right-3 font-display text-[19px] font-bold leading-tight text-white">
                  {p.name}
                </p>
              </div>
              <div className="p-3">
                <p className="flex min-w-0 items-center gap-1 truncate text-[13px] text-mute">
                  <MapPin size={12} /> {p.shortWhy || "Nearby"}
                </p>
              </div>
            </CardShell>
          ))}
          {places.length === 0 && (
            <EmptyState
              title="Nothing here yet."
              body="Try another category or check back soon."
            />
          )}
        </section>
      )}

      {/* Filters live in a bottom sheet — never a giant filter page */}
      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter">
        <div className="space-y-5 pb-2">
          <div>
            <p className="text-[13px] font-semibold">When</p>
            <div className="mt-2 flex gap-2">
              {["Today", "This weekend", "Next week"].map((w) => (
                <span key={w} className="rounded-full bg-paper px-4 py-2 text-[13px] font-medium ring-1 ring-line">
                  {w}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[13px] font-semibold">Price</p>
            <div className="mt-2 flex gap-2">
              {["Any", "Free", "$", "$$", "$$$"].map((w) => (
                <span key={w} className="rounded-full bg-paper px-4 py-2 text-[13px] font-medium ring-1 ring-line">
                  {w}
                </span>
              ))}
            </div>
          </div>
          <p className="text-[13px] text-mute">
            Full filtering lives on each category surface — this sheet stays light by design.
          </p>
        </div>
      </Sheet>
    </div>
  );
}
