import { useEffect, useMemo, useState } from "react";
import { List as ListIcon, Map as MapIcon, Search } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { FilterChips } from "@/components/discovery/FilterChips";
import { PlaceCard } from "@/components/discovery/PlaceCard";
import { Photo } from "@/components/ui/Photo";
import { CityMap, type MapPin } from "@/components/map/CityMap";
import { discoverPlaces, featuredPlaces } from "@/lib/catalog";
import { eventsLiveNow, eventsTonight } from "@/lib/local-events";
import { liveCalendarEvents, tonightCalendarEvents } from "@/lib/remote-events";
import { useEvents } from "@/contexts/EventsContext";
import { hrefForPlace } from "@/lib/bio-handle";
import { knownCityCenter } from "@/lib/cities";
import { usePlans } from "@/contexts/PlanContext";
import { cn } from "@/lib/cn";
import { useListings } from "@/contexts/ListingsContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useLocalNow } from "@/hooks/useLocalNow";
import { EventTile } from "@/components/event/EventTile";
import { EVENT_NEAR_M, locatedNear } from "@/lib/location-scope";
import { EmptyState } from "@/components/ui/EmptyState";
import { DoorChooser } from "@/components/home/DoorChooser";
import { loadDoor, saveDoor, type DoorId } from "@/lib/door";
import { PlaceCardSkeletonGrid } from "@/components/ui/skeletons";
import { freshnessOf } from "@shared/freshness";

export function DiscoverPage() {
  const [, nav] = useLocation();
  const search = useSearch();
  const { version, remoteLoaded } = useListings();
  const { t } = useLocale();
  const { here, today, now, timeZone, city, usingGps } = useLocalNow();
  const [door, setDoor] = useState<DoorId | null>(() => loadDoor());
  const [chip, setChip] = useState("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const { plans } = usePlans();
  const joinable = useMemo(
    () =>
      plans
        .filter((p) => p.isPublic && p.status === "open" && p.date >= today)
        .filter((p) => locatedNear({ geo: p.geo, city: p.city || p.destination }, here, city, usingGps, EVENT_NEAR_M))
        .slice(0, 8),
    [plans, today, here, city, usingGps],
  );

  const { calendarEvents, remoteNearby } = useEvents();
  const tonight = useMemo(() => {
    const nearbyEvents = eventsTonight(remoteNearby, now, timeZone).map((ev) => ({
      id: ev.id,
      title: ev.title,
      sub: ev.when,
      image: ev.heroImage,
      stale: freshnessOf(ev.scheduleVerifiedAt, "events").stale,
    }));
    const cal = tonightCalendarEvents(calendarEvents, now, timeZone, city).map((ev) => ({
      id: ev.id,
      title: ev.title,
      sub: ev.timeLabel,
      image: ev.heroImage,
      stale: freshnessOf(ev.scheduleVerifiedAt, "events").stale,
    }));
    const seen = new Set(nearbyEvents.map((e) => e.id));
    return [...nearbyEvents, ...cal.filter((e) => !seen.has(e.id))];
  }, [remoteNearby, calendarEvents, now, timeZone, city]);
  const liveIds = useMemo(() => {
    const ids = new Set(eventsLiveNow(remoteNearby, now, timeZone).map((e) => e.id));
    for (const e of liveCalendarEvents(calendarEvents, now, timeZone, city)) ids.add(e.id);
    return ids;
  }, [remoteNearby, calendarEvents, now, timeZone, city]);

  const aroundYou = usingGps;
  const nearby = useMemo(
    () => discoverPlaces(here, city, aroundYou ? "around" : "city"),
    [here, city, aroundYou, version],
  );
  const featured = useMemo(
    () => featuredPlaces(here, city, aroundYou ? "around" : "city"),
    [here, city, aroundYou, version],
  );
  const isHomeCity = !aroundYou && /sydney|the rocks/i.test(city || "");
  const placeName = (city && city.trim() && city !== "Choose a city" ? city : "") || (aroundYou ? "you" : "this area");

  const pins = useMemo<MapPin[]>(() => {
    const placePins: MapPin[] = nearby
      .filter((p) => p.geo && Number.isFinite(p.geo.lat) && Number.isFinite(p.geo.lng))
      .slice(0, 40)
      .map((p) => ({
        id: `place-${p.id}`,
        kind: "place" as const,
        title: p.name,
        sub: p.shortWhy,
        lat: p.geo.lat,
        lng: p.geo.lng,
        area: false,
      }));
    const planPins: MapPin[] = joinable
      .filter((p) => p.geo && Number.isFinite(p.geo.lat))
      .slice(0, 20)
      .map((p) => ({
        id: `plan-${p.id}`,
        kind: "plan" as const,
        title: p.title,
        sub: p.destination || p.city,
        lat: p.geo!.lat,
        lng: p.geo!.lng,
        area: false,
      }));
    const areaPins: MapPin[] = joinable
      .filter((p) => !p.geo || !Number.isFinite(p.geo.lat))
      .slice(0, 8)
      .flatMap((p) => {
        const c = knownCityCenter(p.city);
        if (!c) return [];
        return [
          {
            id: `plan-${p.id}`,
            kind: "plan" as const,
            title: p.title,
            sub: `${p.destination || p.city} · area`,
            lat: c.lat,
            lng: c.lng,
            area: true,
          },
        ];
      });
    return [...placePins, ...planPins, ...areaPins];
  }, [joinable, nearby]);

  useEffect(() => {
    const wanted = new URLSearchParams(search).get("chip");
    if (wanted) setChip(wanted);
  }, [search]);

  const list = useMemo(() => {
    if (chip === "tonight") return [];
    let rows = nearby;
    if (chip === "deals") rows = rows.filter((p) => p.deal);
    else if (chip !== "all") rows = rows.filter((p) => p.category === chip);
    if (q.trim()) {
      const n = q.toLowerCase();
      rows = rows.filter((p) => p.name.toLowerCase().includes(n) || p.shortWhy.toLowerCase().includes(n));
    }
    return rows;
  }, [chip, q, nearby]);

  const shown = list.length ? list : q || chip !== "all" ? list : featured;

  if (!door) {
    return (
      <DoorChooser
        onPick={(id) => {
          saveDoor(id);
          setDoor(id);
        }}
      />
    );
  }

  return (
    <div className="relative mx-auto max-w-6xl px-4 pb-28 md:px-6">
      <header className="pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">{placeName}</p>
        <h1 className="font-display mt-1 text-3xl font-semibold">What&apos;s on</h1>
        <label className="mt-3 flex h-11 w-full max-w-md items-center gap-2 rounded-2xl bg-card px-3.5 ring-1 ring-line">
          <Search size={15} className="shrink-0 text-mute" aria-hidden />
          <span className="sr-only">Search places</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("aroundYouSearch")}
            aria-label="Search places"
            className="w-full bg-transparent text-sm outline-none placeholder:text-mute"
          />
        </label>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 overflow-hidden">
            <FilterChips value={chip} onChange={setChip} />
          </div>
          <div
            className="flex w-fit shrink-0 rounded-full bg-card p-1 ring-1 ring-line"
            role="tablist"
            aria-label="Discover view"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === "list"}
              onClick={() => setView("list")}
              className={cn(
                "inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition",
                view === "list" ? "bg-brand text-white" : "text-mute hover:text-ink",
              )}
            >
              <ListIcon size={14} />
              List
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "map"}
              onClick={() => setView("map")}
              className={cn(
                "inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition",
                view === "map" ? "bg-brand text-white" : "text-mute hover:text-ink",
              )}
            >
              <MapIcon size={14} />
              Map
            </button>
          </div>
        </div>
      </header>

      {view === "map" && (
        <section className="mt-5">
          <div className="relative z-0 overflow-hidden rounded-[28px] ring-1 ring-line">
            <div className="h-[420px] w-full md:h-[520px]">
              <CityMap center={here} pins={pins} selectedId={selectedPin?.id} onPin={setSelectedPin} />
            </div>
            {aroundYou && pins.filter((p) => p.kind === "place").length === 0 && (
              <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-paper/95 p-3 shadow-lg ring-1 ring-line">
                <p className="text-sm font-semibold">Nothing listed near {placeName} yet</p>
                <p className="mt-0.5 text-xs text-mute">Be first — add your place or host a night here.</p>
                <button
                  type="button"
                  className="mt-2 text-[13px] font-semibold text-brand"
                  onClick={() => nav("/business/onboard")}
                >
                  Add your place
                </button>
              </div>
            )}
            {selectedPin && (
              <div className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-2xl bg-paper/95 p-3 shadow-lg ring-1 ring-line">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{selectedPin.title}</p>
                  {selectedPin.sub && <p className="truncate text-xs text-mute">{selectedPin.sub}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPin.kind === "plan") nav(`/plan/${selectedPin.id.replace(/^plan-/, "")}`);
                    else {
                      const place = nearby.find((p) => `place-${p.id}` === selectedPin.id);
                      if (place) nav(hrefForPlace(place));
                    }
                  }}
                  className="h-9 shrink-0 rounded-full bg-brand px-4 text-xs font-semibold text-white"
                >
                  Open
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {view === "list" && chip === "all" && !q.trim() && (
        <section className="mt-8" aria-label="Join a plan">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">Join</h2>
            <button type="button" className="text-[13px] font-semibold text-brand" onClick={() => nav("/plan")}>
              All
            </button>
          </div>
          {joinable.length === 0 ? (
            <p className="mt-3 rounded-3xl bg-card px-4 py-6 text-center text-[13px] text-mute ring-1 ring-line">
              Nothing to join near {placeName} yet. Host a ticketed night from Create event.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              {joinable.map((p) => (
                <EventTile key={p.id} plan={p} />
              ))}
            </div>
          )}
        </section>
      )}

      {view === "list" && chip === "tonight" && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold">{t("tonight")}</h2>
          {tonight.length === 0 ? (
            <div className="mt-3">
              <EmptyState title={t("tonightEmpty")} action={() => nav("/calendar")} actionLabel={t("calendar")} />
            </div>
          ) : (
            <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto">
              {tonight.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => nav(`/e/${ev.id}`)}
                  className="relative h-40 w-56 shrink-0 overflow-hidden rounded-3xl bg-ink"
                >
                  {ev.image && <Photo src={ev.image} className="absolute inset-0 h-full w-full object-cover" />}
                  <div className="hero-scrim absolute inset-0" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-left">
                    <p className="truncate text-[11px] text-gold">
                      {ev.stale ? t("checkTimes") : liveIds.has(ev.id) ? t("happeningNow") : ev.sub}
                    </p>
                    <p className="font-display line-clamp-2 text-[16px] font-semibold leading-snug text-white">
                      {ev.title}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {view === "list" && chip !== "tonight" && (
        <section className="mt-8">
          <h2 className="font-display mb-3 text-xl font-semibold">
            {chip === "all" && !q ? t("aroundYou") : t("places")}
          </h2>
          {!remoteLoaded && shown.length === 0 ? (
            <PlaceCardSkeletonGrid count={8} />
          ) : shown.length === 0 ? (
            <EmptyState
              title={aroundYou ? `Nothing listed near ${placeName} yet` : t("aroundEmpty")}
              body={
                aroundYou || !isHomeCity
                  ? `No places listed near ${placeName} yet — they appear here when local hosts publish them.`
                  : undefined
              }
              action={() => nav("/business/onboard")}
              actionLabel="Add your place"
              secondary={() => nav("/event/new")}
              secondaryLabel="Host a night"
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {shown.slice(0, 16).map((p) => (
                <PlaceCard key={p.id} place={p} walk={p.walk} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
