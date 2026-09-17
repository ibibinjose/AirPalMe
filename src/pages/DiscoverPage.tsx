import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, BadgePercent, Building2, CalendarDays, Compass, List as ListIcon, Loader2, Map as MapIcon, Search, Sparkles, Ticket, Users, X } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { FilterChips } from "@/components/discovery/FilterChips";
import { GiveawaysBand } from "@/components/promotions/GiveawaysBand";
import { PlaceCard } from "@/components/discovery/PlaceCard";
import { Photo } from "@/components/ui/Photo";
import { TourCard } from "@/components/guide/TourCard";
import { CityMap, type MapPin } from "@/components/map/CityMap";
import { LiveActivities } from "@/components/plan/LiveActivities";
import { discoverPlaces, featuredPlaces, toursForPrecinct } from "@/lib/catalog";
import { eventsLiveNow, eventsTonight } from "@/lib/local-events";
import { liveCalendarEvents, tonightCalendarEvents } from "@/lib/remote-events";
import { useEvents } from "@/contexts/EventsContext";
import { hrefForPlace } from "@/lib/bio-handle";
import { cityCenter } from "@/lib/cities";
import { usePlans } from "@/contexts/PlanContext";
import { cn } from "@/lib/cn";
import { LocalHighlights } from "@/components/stay/LocalHighlights";
import { useStay } from "@/contexts/StayContext";
import { useListings } from "@/contexts/ListingsContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useLocalNow } from "@/hooks/useLocalNow";
import { TodayDigest } from "@/components/discovery/TodayDigest";
import { enterEase, landing, landingItem, takeLandingEnter } from "@/lib/motion";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlaceCardSkeletonGrid } from "@/components/ui/skeletons";
import { freshnessOf } from "@shared/freshness";

export function DiscoverPage() {
  const [, nav] = useLocation();
  const search = useSearch();
  const { session } = useStay();
  const { version, remoteLoaded } = useListings();
  const { t } = useLocale();
  const { here, today, now, timeZone, city } = useLocalNow();
  const [chip, setChip] = useState("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const reduce = useReducedMotion();
  const [play] = useState(() => !reduce && takeLandingEnter());
  const { plans } = usePlans();

  const { calendarEvents, remoteNearby, refresh: refreshEvents } = useEvents();
  const [pullPx, setPullPx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchY = useRef<number | null>(null);

  function doRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      refreshEvents();
    } catch {
      /* contexts still reload via the bus below */
    }
    window.dispatchEvent(new Event("airpal:reload-data"));
    window.setTimeout(() => {
      setRefreshing(false);
      setPullPx(0);
    }, 1200);
  }
  // What's happening around the guest: Firestore events (curated + organiser),
  // filtered by tonight/live windows and the GPS-derived city. Empty DB → empty.
  const tonight = useMemo(() => {
    const nearby = eventsTonight(remoteNearby, now, timeZone).map((ev) => ({
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
    const seen = new Set(nearby.map((e) => e.id));
    return [...nearby, ...cal.filter((e) => !seen.has(e.id))];
  }, [remoteNearby, calendarEvents, now, timeZone, city]);
  const liveIds = useMemo(() => {
    const ids = new Set(eventsLiveNow(remoteNearby, now, timeZone).map((e) => e.id));
    for (const e of liveCalendarEvents(calendarEvents, now, timeZone, city)) ids.add(e.id);
    return ids;
  }, [remoteNearby, calendarEvents, now, timeZone, city]);
  const live = useMemo(() => tonight.filter((e) => liveIds.has(e.id)), [tonight, liveIds]);
  const nearby = useMemo(() => discoverPlaces(here, city), [here, city, version]);
  const featured = useMemo(() => featuredPlaces(here, city), [here, city, version]);
  const isHomeCity = !city || /sydney|rock/i.test(city);
  const walks = toursForPrecinct(city).slice(0, 3);
  const center = here;

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
    const planPins: MapPin[] = plans
      .filter((p) => p.isPublic && p.status === "open" && p.date >= today)
      .slice(0, 20)
      .map((p) => {
        if (p.geo && Number.isFinite(p.geo.lat)) {
          return {
            id: `plan-${p.id}`,
            kind: "plan" as const,
            title: p.title,
            sub: p.destination || p.city,
            lat: p.geo.lat,
            lng: p.geo.lng,
            area: false,
          };
        }
        const c = cityCenter(p.city);
        return {
          id: `plan-${p.id}`,
          kind: "plan" as const,
          title: p.title,
          sub: `${p.destination || p.city} · area`,
          lat: c.lat,
          lng: c.lng,
          area: true,
        };
      });
    return [...placePins, ...planPins];
  }, [plans, version, nearby, today]);

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
  }, [chip, q, version, nearby]);

  const shown = list.length ? list : q || chip !== "all" ? list : featured;
  const orchestrate = play
    ? { initial: "hidden" as const, animate: "show" as const }
    : { initial: false as const, animate: "show" as const };

  return (
    <div
      className="relative mx-auto max-w-6xl"
      onTouchStart={(e) => {
        if (e.touches.length === 1) touchY.current = e.touches[0]?.clientY ?? null;
      }}
      onTouchMove={(e) => {
        if (touchY.current == null || refreshing) return;
        const dy = (e.touches[0]?.clientY ?? 0) - touchY.current;
        if (window.scrollY <= 0 && dy > 0) setPullPx(Math.min(dy * 0.6, 110));
      }}
      onTouchEnd={() => {
        if (pullPx > 70) doRefresh();
        else setPullPx(0);
        touchY.current = null;
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center transition-opacity"
        style={{ opacity: pullPx > 8 || refreshing ? 1 : 0 }}
      >
        <div
          className="mt-3 flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/70 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md"
          style={{ transform: `translateY(${refreshing ? 0 : Math.min(pullPx, 80)}px)` }}
        >
          {refreshing ? <Loader2 size={14} className="animate-spin" /> : <ArrowDown size={14} />}
          {refreshing ? "Refreshing…" : pullPx > 70 ? "Release to refresh" : "Pull to refresh"}
        </div>
      </div>
      {play && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-50 bg-paper"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.65, ease: enterEase, delay: 0.08 }}
        />
      )}

      <motion.div {...orchestrate} variants={landing}>
        <motion.section variants={landingItem} className="relative mx-4 overflow-hidden rounded-[28px] bg-ink md:mx-6">
          {isHomeCity ? (
            <>
              <motion.div
                className="h-[260px] w-full md:h-[440px]"
                initial={play ? { scale: 1.1 } : false}
                animate={{ scale: 1 }}
                transition={{ duration: 1.45, ease: enterEase }}
              >
                <Photo src="/media/harbour.jpg" className="h-full w-full object-cover" priority />
              </motion.div>
              <div className="hero-scrim absolute inset-0" />
            </>
          ) : (
            <div aria-hidden className="h-[200px] w-full bg-ink md:h-[280px]" />
          )}
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/60 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white border border-white/20 mb-2">
              <Sparkles size={12} className="text-white/80" />
              <span>AirPal Circle · {isHomeCity ? "Sydney" : city}</span>
            </div>
            <h1 className="font-display text-3xl font-extrabold text-white md:text-5xl leading-tight tracking-tight">
              Discover {isHomeCity ? "Sydney" : city}.
            </h1>
            <p className="mt-1 text-sm font-medium text-white/75">
              Places, events, and plans around you right now.
            </p>

            {/* Search Bar */}
            <label className="mt-3 flex h-10 w-full max-w-md items-center gap-2 rounded-xl bg-white/95 px-3 text-ink border border-ink/20 shadow-xs">
              <Search size={15} className="shrink-0 text-brand" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("aroundYouSearch")}
                className="w-full bg-transparent text-[13px] font-medium outline-none placeholder:text-mute"
              />
            </label>

            {/* Quick links: every tile lands somewhere real */}
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2 max-w-3xl">
              <button
                type="button"
                onClick={() => nav("/mate")}
                className="group flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/10 border border-white/20 text-white backdrop-blur-xl hover:bg-white/15 hover:border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition cursor-pointer"
              >
                <Users size={15} className="text-white group-hover:scale-110 transition shrink-0" />
                <span className="text-xs font-semibold tracking-tight">Mates</span>
              </button>
              <button
                type="button"
                onClick={() => nav("/concierge")}
                className="group flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/10 border border-white/20 text-white backdrop-blur-xl hover:bg-white/15 hover:border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition cursor-pointer"
              >
                <Building2 size={15} className="text-white group-hover:scale-110 transition shrink-0" />
                <span className="text-xs font-semibold tracking-tight">Stay</span>
              </button>
              <button
                type="button"
                onClick={() => nav("/calendar")}
                className="group flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/10 border border-white/20 text-white backdrop-blur-xl hover:bg-white/15 hover:border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition cursor-pointer"
              >
                <Ticket size={15} className="text-white group-hover:scale-110 transition shrink-0" />
                <span className="text-xs font-semibold tracking-tight">Events</span>
              </button>
              <button
                type="button"
                onClick={() => nav("/plan")}
                className="group flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/10 border border-white/20 text-white backdrop-blur-xl hover:bg-white/15 hover:border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition cursor-pointer"
              >
                <CalendarDays size={15} className="text-white group-hover:scale-110 transition shrink-0" />
                <span className="text-xs font-semibold tracking-tight">Plans</span>
              </button>
              <button
                type="button"
                onClick={() => nav("/?chip=deals")}
                className="group flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/10 border border-white/20 text-white backdrop-blur-xl hover:bg-white/15 hover:border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition cursor-pointer"
              >
                <BadgePercent size={15} className="text-white group-hover:scale-110 transition shrink-0" />
                <span className="text-xs font-semibold tracking-tight">Deals</span>
              </button>
              <button
                type="button"
                onClick={() => nav("/guide")}
                className="group flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/10 border border-white/20 text-white backdrop-blur-xl hover:bg-white/15 hover:border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition cursor-pointer"
              >
                <Compass size={15} className="text-white group-hover:scale-110 transition shrink-0" />
                <span className="text-xs font-semibold tracking-tight">Guides</span>
              </button>
            </div>
          </div>
        </motion.section>

        <motion.div variants={landingItem} className="mt-5 px-4 md:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
            <div className="min-w-0 flex-1 overflow-hidden">
              <FilterChips value={chip} onChange={setChip} />
            </div>
            <div className="flex w-fit shrink-0 self-end rounded-full bg-card p-1 ring-1 ring-line sm:self-auto" role="tablist" aria-label="Discover view">
              <button
                type="button"
                role="tab"
                aria-selected={view === "list"}
                onClick={() => setView("list")}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition",
                  view === "list" ? "bg-ink text-white" : "text-mute hover:text-ink",
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
                  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition",
                  view === "map" ? "bg-ink text-white" : "text-mute hover:text-ink",
                )}
              >
                <MapIcon size={14} />
                Map
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <GiveawaysBand />

      {view === "map" && (
        <section className="mt-6 px-4 pb-10 md:px-6">
          <div className="relative z-0 overflow-hidden rounded-[28px] ring-1 ring-line">
            <div className="h-[420px] w-full md:h-[520px]">
              <CityMap center={center} pins={pins} selectedId={selectedPin?.id} onPin={setSelectedPin} />
            </div>
            {live.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setView("list");
                  setChip("tonight");
                }}
                className="absolute left-3 top-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-ink/85 px-3.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-ink"
              >
                <CalendarDays size={13} className="text-gold" />
                {live.length} {t("happeningNow").toLowerCase()}
              </button>
            )}
            {selectedPin && (
              <div className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-2xl bg-paper/95 p-3 shadow-lg ring-1 ring-line backdrop-blur-sm">
                <span
                  className={cn("h-2.5 w-2.5 shrink-0 rounded-full", selectedPin.kind === "plan" ? "bg-rose-500" : "bg-ink")}
                  aria-hidden
                />
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
                  className="h-9 shrink-0 rounded-full bg-ink px-4 text-xs font-semibold text-white transition hover:bg-ink/90"
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPin(null)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-mute transition hover:text-ink"
                  aria-label="Close preview"
                >
                  <X size={15} />
                </button>
              </div>
            )}
          </div>
          <p className="mt-2 px-1 text-[11px] text-mute">
            Dots are exact spots · soft circles are city areas · rose is people’s live activities.
          </p>
          <div className="-mx-4 md:-mx-6">
            <LiveActivities />
          </div>
        </section>
      )}

      {view === "list" && chip === "all" && !q.trim() && (
        <TodayDigest
          tonightCount={tonight.length}
          liveCount={live.length}
          dealsCount={nearby.filter((p) => p.deal).length}
          plansCount={plans.filter((p) => p.isPublic && p.status === "open" && p.date >= today).length}
          onShowDeals={() => setChip("deals")}
        />
      )}

      {view === "list" && chip !== "tonight" && (
        <section className="mt-6 px-4 pb-2 md:px-6">
          <h2 className="font-display mb-3 text-xl font-semibold">
            {chip === "all" && !q ? t("aroundYou") : t("places")}
          </h2>
          {!remoteLoaded && shown.length === 0 ? (
            <PlaceCardSkeletonGrid count={8} />
          ) : shown.length === 0 ? (
            <EmptyState
              title={t("aroundEmpty")}
              body={isHomeCity ? undefined : `No places listed in ${city} yet — venues appear here once local hosts publish them.`}
              action={() => nav("/scan")}
              actionLabel={t("scan")}
              secondary={() => nav("/guide")}
              secondaryLabel={t("explore")}
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

      {view === "list" && (chip === "tonight" || chip === "all") && (
        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between px-4 md:px-6">
            <h2 className="font-display text-xl font-semibold">{t("tonight")}</h2>
            {chip !== "tonight" && tonight.length > 0 && (
              <button type="button" onClick={() => setChip("tonight")} className="text-sm text-mute">
                {t("all")}
              </button>
            )}
          </div>
          {tonight.length === 0 ? (
            <div className="mx-4 md:mx-6">
              <EmptyState
                title={t("tonightEmpty")}
                action={() => nav("/calendar")}
                actionLabel={t("calendar")}
              />
            </div>
          ) : (
            <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 md:px-6">
              {tonight.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => nav(`/e/${ev.id}`)}
                  className="relative h-40 w-56 shrink-0 overflow-hidden rounded-3xl bg-ink"
                >
                  {ev.image && (
                    <Photo
                      src={ev.image}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  <div className="hero-scrim absolute inset-0" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-left">
                    <p className="text-[11px] text-gold">
                      {ev.stale ? t("checkTimes") : liveIds.has(ev.id) ? t("happeningNow") : ev.sub}
                    </p>
                    <p className="font-display text-[16px] font-semibold text-white">{ev.title}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {view === "list" && chip === "all" && <LiveActivities />}

      {view === "list" && chip === "all" && walks.length > 0 && (
        <section className="mt-8 px-4 md:px-6">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-xl font-semibold">{t("walks")}</h2>
            <button type="button" onClick={() => nav("/guide")} className="text-sm text-mute">
              {t("all")}
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {walks.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        </section>
      )}

      {view === "list" && chip === "all" && (session.kind === "stay" || session.kind === "campus" || Boolean(session.room)) && (
        <section className="mt-8 px-4 md:px-6">
          <LocalHighlights />
        </section>
      )}

      {view === "list" && chip === "all" && (
        <section className="mt-8 grid gap-3 px-4 pb-28 md:grid-cols-2 md:px-6">
          <button
            type="button"
            onClick={() => nav("/scan")}
            className="flex items-center justify-between rounded-3xl bg-ink px-5 py-4 text-left text-white"
          >
            <span>
              <span className="block text-[11px] uppercase tracking-[0.16em] text-white/50">{t("scan")}</span>
              <span className="font-display text-lg">{t("scanACode")}</span>
            </span>
            <span className="text-sm text-white/70">{t("open")}</span>
          </button>
          <button
            type="button"
            onClick={() => nav("/join")}
            className="flex items-center justify-between rounded-3xl bg-card px-5 py-4 text-left ring-1 ring-line"
          >
            <span>
              <span className="block text-[11px] uppercase tracking-[0.16em] text-gold">{t("host")}</span>
              <span className="font-display text-lg">{t("listYourPlace")}</span>
            </span>
            <span className="text-sm text-mute">{t("go")}</span>
          </button>
          <button
            type="button"
            onClick={() => nav("/club")}
            className="flex items-center justify-between rounded-3xl bg-card px-5 py-4 text-left ring-1 ring-line"
          >
            <span>
              <span className="block text-[11px] uppercase tracking-[0.16em] text-gold">AirPal Club</span>
              <span className="font-display text-lg">Invites and offers</span>
            </span>
            <span className="text-sm text-mute">Join</span>
          </button>
          <button
            type="button"
            onClick={() => nav("/q/syd-rocks-argyle")}
            className="flex items-center justify-between rounded-3xl bg-card px-5 py-4 text-left ring-1 ring-line"
          >
            <span>
              <span className="block text-[11px] uppercase tracking-[0.16em] text-gold">{t("streetMarker")}</span>
              <span className="font-display text-lg">Argyle Cut</span>
            </span>
            <span className="text-sm text-mute">{t("open")}</span>
          </button>
          <button
            type="button"
            onClick={() => nav("/calendar")}
            className="flex items-center justify-between rounded-3xl bg-card px-5 py-4 text-left ring-1 ring-line hover:shadow-md transition col-span-full md:col-span-2"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-ink/[0.05] text-ink ring-1 ring-line">
                <CalendarDays size={20} />
              </div>
              <span>
                <span className="block text-[11px] uppercase tracking-[0.16em] text-gold">{t("calendar")}</span>
                <span className="font-display text-lg">What’s On This Month</span>
              </span>
            </div>
            <span className="text-sm font-medium text-brand">{t("open")}</span>
          </button>
        </section>
      )}
    </div>
  );
}
