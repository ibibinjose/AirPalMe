import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  CalendarDays,
  Hotel,
  MapPin,
  Plane,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlans } from "@/contexts/PlanContext";
import { useEvents } from "@/contexts/EventsContext";
import { useLocalNow } from "@/contexts/LocalNowContext";
import { discoverPlaces } from "@/lib/catalog";
import { useListings } from "@/contexts/ListingsContext";
import { hrefForPlace } from "@/lib/bio-handle";
import { formatPlanDate } from "@shared/plan";
import { Photo } from "@/components/ui/Photo";
import { mediaSrcSet } from "@/lib/media-srcset";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { openGlobalSearch } from "@/components/search/openSearch";
import { triggerHaptic } from "@/lib/native";
import { getExperienceProofRemote } from "@/lib/functions";
import { getDailyOutfitRecommendation } from "@/lib/outfit";
import {
  ArrowCta,
  AvatarStack,
  CardShell,
  PillRow,
  SectionHeader,
  greetingForHour,
} from "@/components/design-system/companions";
import { cn } from "@/lib/cn";

type AroundFilter = "events" | "food" | "places" | "deals";

const AROUND: { id: AroundFilter; label: string; color: string }[] = [
  { id: "events", label: "Events & Shows", color: "#c2410c" },
  { id: "food", label: "Dining & Drinks", color: "#b45309" },
  { id: "places", label: "Places & Stays", color: "#2b7cd3" },
  { id: "deals", label: "Deals & Offers", color: "#15803d" },
];

const QUICK_PROMPTS = [
  { label: "⚡ What now?", href: "/now" },
  { label: "☕ Coffee & Chat", query: "coffee" },
  { label: "🎭 Live Tonight", href: "/calendar" },
  { label: "🏨 Boutique Stays", href: "/stay" },
  { label: "🗺️ Plan a Trip", href: "/plan/new" },
  { label: "🎁 Deals", href: "/deals" },
];

const VERTICALS = [
  {
    id: "pass",
    label: "AirPal Pass",
    sub: "Events, access & perks",
    href: "/pass",
    icon: Ticket,
    iconBg: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    badge: "Access",
  },
  {
    id: "now",
    label: "What now?",
    sub: "One suggestion for now",
    href: "/now",
    icon: Users,
    iconBg: "bg-brand/10 text-accent",
    badge: "Start",
  },
  {
    id: "deals",
    label: "Deals",
    sub: "Local offers & freebies",
    href: "/deals",
    icon: Sparkles,
    iconBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    badge: "Popular",
  },
  {
    id: "stay",
    label: "Stays",
    sub: "Hotels & boutique rooms",
    href: "/stay",
    icon: Hotel,
    iconBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    badge: "Verified",
  },
  {
    id: "events",
    label: "What's On",
    sub: "Live gigs & events",
    href: "/calendar",
    icon: CalendarDays,
    iconBg: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    badge: "Live",
  },
  {
    id: "trips",
    label: "Trips",
    sub: "Plans & itineraries",
    href: "/plan",
    icon: Plane,
    iconBg: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
    badge: "Trips",
  },
  {
    id: "guide",
    label: "Guide",
    sub: "Tours & city walks",
    href: "/guide",
    icon: MapPin,
    iconBg: "bg-brand/10 text-accent",
    badge: "Tours",
  },
];

export function HomePage() {
  const [, nav] = useLocation();
  const { user } = useAuth();
  const { myPlans, publicPlans } = usePlans();
  const { calendarEvents } = useEvents();
  const { city, here, today, now, weather } = useLocalNow();
  const { version } = useListings();
  const [around, setAround] = useState<AroundFilter>("events");
  const [completedCount, setCompletedCount] = useState(0);

  const outfitAdvice = useMemo(() => {
    if (!weather) return null;
    return getDailyOutfitRecommendation(weather.temp, weather.code, weather.isDay);
  }, [weather]);

  // Proof the loop is alive: real completed-plan count, shown only when nonzero.
  useEffect(() => {
    let cancelled = false;
    getExperienceProofRemote()
      .then((proof) => {
        if (!cancelled && proof?.ok) setCompletedCount(Math.max(0, Number(proof.completed) || 0));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = useMemo(() => {
    const n = user?.displayName?.trim().split(/\s+/)[0];
    return n || "traveller";
  }, [user]);

  const greeting = useMemo(() => {
    try {
      return greetingForHour(new Date(now || Date.now()).getHours());
    } catch {
      return "Good day";
    }
  }, [now]);

  const nextTrip = useMemo(
    () =>
      myPlans
        .filter((p) => p.date >= today && p.status !== "completed")
        .sort((a, b) => a.date.localeCompare(b.date))[0],
    [myPlans, today],
  );

  const places = useMemo(() => discoverPlaces(here, city, "city").slice(0, 8), [here, city, version]);

  const tonightEvents = useMemo(
    () =>
      calendarEvents
        .filter((e) => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6),
    [calendarEvents, today],
  );

  const forYou = useMemo(() => publicPlans.slice(0, 3), [publicPlans]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 md:px-6">
      {/* Hero Header Section */}
      <header className="relative -mx-4 overflow-hidden rounded-b-[32px] md:-mx-6 shadow-sm">
        <div className="absolute inset-0" aria-hidden="true">
          <Photo
            src="/media/harbour.jpg"
            srcSet={mediaSrcSet("/media/harbour.jpg")}
            sizes="100vw"
            priority
            className="h-full w-full object-cover scale-105"
            alt=""
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/30" />
        </div>
        <div className="relative px-4 pb-8 pt-8 md:px-8 md:pt-12">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md ring-1 ring-white/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {city || "Sydney"} · Live
                {completedCount > 0 && <> · {completedCount.toLocaleString("en-AU")} completed</>}
              </span>
              <span className="text-xs font-medium text-white/80">
                {greeting}, {firstName}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Link
                href="/pass"
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1 text-xs font-bold text-white ring-1 ring-white/25 backdrop-blur-md hover:bg-white/25 transition active:scale-95"
              >
                <Ticket size={13} className="text-amber-400" />
                <span>AirPal Pass →</span>
              </Link>
              <img
                src="/brand/airpal-me-logo-white.png"
                alt="AirPal Me"
                className="h-6 sm:h-7 w-auto object-contain drop-shadow-md opacity-90 hidden sm:block"
              />
            </div>
          </div>

          <h1 className="font-display mt-3 text-[30px] sm:text-[40px] font-bold leading-[1.05] tracking-tight text-white max-w-2xl">
            Plan your day. Organise your life.
          </h1>
          <p className="mt-1 text-sm sm:text-base font-medium text-white/90 max-w-lg">
            My life, organised by AirPal.
          </p>

          {/* Daily Weather & Outfit Recommendation Capsule */}
          {weather && outfitAdvice && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-white/15 p-3 text-xs text-white ring-1 ring-white/25 backdrop-blur-md max-w-xl">
              <span className="font-bold inline-flex items-center gap-1.5">
                <span>{outfitAdvice.icon}</span>
                <span>{weather.temp}°C {outfitAdvice.vibe}</span>
              </span>
              <span className="text-white/60">·</span>
              <span className="text-white/90 font-medium">{outfitAdvice.outfit}</span>
              <span className="text-white/60">·</span>
              <span className="text-white/80 italic">{outfitAdvice.accessory}</span>
            </div>
          )}

          {/* Quick Search Trigger */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("medium");
                openGlobalSearch();
              }}
              className="flex w-full min-h-[48px] items-center justify-between rounded-2xl bg-card/90 px-4 py-3 text-left text-sm font-medium text-mute ring-1 ring-line/80 shadow-md backdrop-blur-md hover:bg-card hover:text-ink transition cursor-pointer touch-manipulation active:scale-[0.99]"
            >
              <span className="flex items-center gap-2.5">
                <Search size={18} className="text-accent" />
                <span>Search places, events, plans, or stays…</span>
              </span>
              <kbd className="hidden rounded bg-paper/90 px-2 py-0.5 text-xs font-semibold text-mute ring-1 ring-line sm:inline-block">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Primary Action Buttons */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Button
              size="sm"
              onClick={() => {
                void triggerHaptic("medium");
                nav("/now");
              }}
              className="h-11 rounded-full px-6 font-bold shadow-[0_6px_20px_rgba(18,22,20,0.15)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Users size={16} className="mr-2" />
              What now?
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                void triggerHaptic("light");
                nav("/plan/new");
              }}
              className="h-11 rounded-full px-5 bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25 font-semibold backdrop-blur-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Plus size={16} className="mr-1.5" />
              Plan a Hangout
            </Button>
          </div>
        </div>
      </header>

      {/* Quick prompts — below the hero so the image stays clean on mobile */}
      <nav aria-label="Quick prompts" className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              if (p.href) nav(p.href);
              else openGlobalSearch();
            }}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-full bg-card px-4 py-2 text-[13px] font-semibold text-ink shadow-xs ring-1 ring-line transition hover:ring-brand/40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-95"
          >
            {p.label}
          </button>
        ))}
      </nav>

      {/* Six Marketplace Pillars Grid */}
      <section aria-label="Explore AirPal Verticals" className="mt-8 cv-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">Life Made Easy</h2>
          <Link
            href="/now"
            className="-my-3 inline-flex min-h-[44px] items-center text-xs font-bold text-accent hover:underline"
          >
            View All →
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {VERTICALS.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  nav(v.href);
                }}
                className="group relative flex flex-col justify-between rounded-3xl bg-card p-4 text-left ring-1 ring-line/80 shadow-xs transition hover:shadow-md hover:ring-brand/30 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-2xl shadow-2xs transition group-hover:scale-105",
                      v.iconBg,
                    )}
                  >
                    <Icon size={18} />
                  </div>
                  {v.badge && <span className="text-[10px] font-bold text-mute">{v.badge}</span>}
                </div>
                <div className="mt-4">
                  <p className="font-display text-[15px] font-bold text-ink leading-snug group-hover:text-accent transition-colors">
                    {v.label}
                  </p>
                  <p className="text-[11px] text-mute line-clamp-1 mt-0.5">{v.sub}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Continue Your Journey / Active Plan */}
      <section aria-label="Continue your journey" className="mt-8 cv-auto">
        <SectionHeader title="Your Plans & Trips" actionLabel="All Plans" actionHref="/plan" />
        {nextTrip ? (
          <CardShell
            href={`/plan/${nextTrip.id}`}
            label={`View trip ${nextTrip.title}`}
            className="group mt-3 rounded-3xl overflow-hidden"
          >
            <div className="relative min-h-[200px] sm:min-h-[220px]">
              <Photo
                src={nextTrip.heroImage || "/media/walk.jpg"}
                srcSet={mediaSrcSet(nextTrip.heroImage || "/media/walk.jpg")}
                sizes="100vw"
                priority
                className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="hero-scrim absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
              <div className="absolute left-4 top-4 right-4 flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand/90 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs backdrop-blur-md">
                    <CalendarDays size={12} /> Upcoming Trip
                  </span>
                  <p className="font-display mt-2 text-[22px] font-bold leading-tight text-white">
                    Trip to {nextTrip.destination || nextTrip.title}
                  </p>
                  <p className="mt-1 text-[13px] font-medium text-white/90">
                    {formatPlanDate(nextTrip.date, nextTrip.time)}
                    {nextTrip.attendees?.length || nextTrip.stops?.length
                      ? ` · ${[
                          nextTrip.attendees?.length
                            ? `${nextTrip.attendees.length} ${nextTrip.attendees.length === 1 ? "traveller" : "travellers"}`
                            : "",
                          nextTrip.stops?.length
                            ? `${nextTrip.stops.length} ${nextTrip.stops.length === 1 ? "stop" : "stops"}`
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}`
                      : ""}
                  </p>
                </div>
              </div>
              <div className="absolute inset-x-4 bottom-4 flex items-end justify-between">
                <AvatarStack names={(nextTrip.attendees || []).map((a) => a.name)} />
                <ArrowCta />
              </div>
            </div>
          </CardShell>
        ) : (
          <div className="mt-3 rounded-3xl bg-gradient-to-br from-card via-card to-paper p-5 ring-1 ring-line/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="max-w-md">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-accent uppercase tracking-wider">
                  <Plane size={14} /> Ready for your next outing?
                </div>
                <h3 className="font-display text-lg font-bold mt-1 text-ink">Plan a hangout or trip</h3>
                <p className="text-xs text-mute mt-0.5">Live itineraries with friends &amp; family.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => {
                    void triggerHaptic("light");
                    nav("/plan/new");
                  }}
                  className="rounded-full px-4"
                >
                  <Plus size={15} className="mr-1" />
                  Create Plan
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => nav("/now")}
                  className="rounded-full px-4 ring-1 ring-line"
                >
                  What now?
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* AirPal Pass Discovery Showcase */}
      <section aria-label="AirPal Pass Showcase" className="mt-8 cv-auto">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-950 via-neutral-900 to-amber-950 p-6 md:p-8 text-white shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 ring-1 ring-amber-400/30">
                <Ticket size={13} /> AirPal Pass · Experiences &amp; Access
              </div>
              <h3 className="font-display text-2xl font-bold mt-2 text-white">
                Discover what's happening. Get access. Save money.
              </h3>
              <p className="text-xs sm:text-sm text-white/80 mt-1">
                Concerts, Indian cultural festivals, live gigs, and dining perks across {city || "Sydney"}.
                Share the same AirPal account — zero extra signups.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/pass"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-amber-500 px-6 py-2.5 text-xs font-bold text-neutral-950 shadow-md transition hover:bg-amber-400 active:scale-95"
              >
                <span>Open AirPal Pass</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What's On Near You Section */}
      <section aria-label="What's on near you" className="mt-8 cv-auto">
        <SectionHeader title="Happening Near You" actionLabel="See All" actionHref="/now" />
        <div className="mt-3">
          <PillRow options={AROUND} value={around} onChange={setAround} label="What's on categories" />
        </div>

        {around === "deals" ? (
          <CardShell href="/deals" label="Open deals" className="mt-3 p-5 rounded-3xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  Local Offers
                </span>
                <p className="font-display text-lg font-bold mt-2 text-ink">Deals Near You</p>
                <p className="mt-1 text-sm text-mute max-w-xl">Claim local offers right inside your plan.</p>
              </div>
              <ArrowCta />
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-accent">
              Browse deals <ArrowRight size={14} />
            </div>
          </CardShell>
        ) : around === "events" ? (
          tonightEvents.length > 0 ? (
            <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3.5 overflow-x-auto overscroll-x-contain px-4 pb-2 no-scrollbar md:mx-0 md:px-0">
              {tonightEvents.map((e) => {
                const day = new Date(`${e.date}T00:00:00`);
                const dayNum = Number.isNaN(day.getTime()) ? "" : String(day.getDate());
                const month = Number.isNaN(day.getTime()) ? "" : day.toLocaleString(undefined, { month: "short" });
                return (
                  <CardShell
                    key={e.id}
                    href={e.gatePath || `/e/${e.id}`}
                    label={e.title}
                    className="w-64 shrink-0 snap-start overflow-hidden rounded-2xl"
                  >
                    <div className="relative aspect-square overflow-hidden bg-paper">
                      <Photo
                        thumb
                        src={e.heroImage || "/media/laneway.jpg"}
                        srcSet={mediaSrcSet(e.heroImage || "/media/laneway.jpg")}
                        sizes="256px"
                        className="absolute inset-0 h-full w-full object-cover transition duration-300 hover:scale-105"
                      />
                      <div className="hero-scrim absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      {dayNum && (
                        <span className="absolute left-3 top-3 grid min-h-11 min-w-11 place-items-center rounded-2xl bg-card/95 px-2 py-1 text-center shadow-sm">
                          <span>
                            <span className="font-display block text-[15px] font-bold leading-none text-ink">
                              {dayNum}
                            </span>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-accent">
                              {month}
                            </span>
                          </span>
                        </span>
                      )}
                      <p className="absolute bottom-2.5 left-3 right-3 font-display text-[16px] font-bold leading-tight text-white">
                        {e.title}
                      </p>
                    </div>
                    <div className="p-3">
                      <p className="text-[12px] font-medium text-mute line-clamp-1">
                        {e.timeLabel}
                        {e.venue ? ` · ${e.venue}` : e.city ? ` · ${e.city}` : ""}
                      </p>
                    </div>
                  </CardShell>
                );
              })}
            </div>
          ) : (
            <div className="mt-3">
              <EmptyState
                title="Nothing on tonight."
                body="Check the full calendar for what's coming up near you."
                action={() => nav("/calendar")}
                actionLabel="Open calendar"
              />
            </div>
          )
        ) : places.length > 0 ? (
          <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3.5 overflow-x-auto overscroll-x-contain px-4 pb-2 no-scrollbar md:mx-0 md:px-0">
            {places.map((p) => (
              <CardShell
                key={p.id}
                href={hrefForPlace(p)}
                label={p.name}
                className="w-64 shrink-0 snap-start overflow-hidden rounded-2xl"
              >
                <div className="relative aspect-square overflow-hidden bg-paper">
                  <Photo
                    thumb
                    src={p.heroImage || p.photos?.[0] || "/media/harbour.jpg"}
                    srcSet={mediaSrcSet(p.heroImage || p.photos?.[0] || "/media/harbour.jpg")}
                    sizes="256px"
                    className="absolute inset-0 h-full w-full object-cover transition duration-300 hover:scale-105"
                  />
                  <div className="hero-scrim absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <p className="absolute bottom-2.5 left-3 right-3 font-display text-[16px] font-bold leading-tight text-white">
                    {p.name}
                  </p>
                </div>
                <div className="p-3">
                  <p className="flex items-center gap-1 truncate text-[12px] text-mute">
                    <MapPin size={12} className="text-accent shrink-0" /> {p.shortWhy || city || "Nearby"}
                  </p>
                </div>
              </CardShell>
            ))}
          </div>
        ) : (
          <div className="mt-3">
            <EmptyState
              title="Nothing nearby yet."
              body="Tell us your urge and get one suggestion for right now."
              action={() => nav("/now")}
              actionLabel="What now?"
            />
          </div>
        )}
      </section>

      {/* For You / Smart Recommendations */}
      <section aria-label="For you" className="mt-8 cv-auto">
        <SectionHeader title="Recommended Hangouts" actionLabel="What now?" actionHref="/now" />
        {forYou.length > 0 ? (
          <ul className="mt-3 space-y-2.5">
            {forYou.map((p) => (
              <li key={p.id}>
                <CardShell href={`/plan/${p.id}`} label={p.title} className="p-3.5 rounded-2xl hover:ring-brand/40">
                  <div className="flex items-center gap-3.5">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
                      <Photo
                        thumb
                        src={p.heroImage || "/media/walk.jpg"}
                        srcSet={mediaSrcSet(p.heroImage || "/media/walk.jpg")}
                        sizes="64px"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                        Because you&apos;re {p.city ? `near ${p.city}` : "exploring"}
                      </p>
                      <p className="font-display mt-0.5 truncate text-[16px] font-bold text-ink">{p.title}</p>
                      <p className="mt-0.5 truncate text-[12px] text-mute">
                        {formatPlanDate(p.date, p.time)}
                        {p.destination ? ` · ${p.destination}` : ""}
                      </p>
                    </div>
                    <ArrowCta />
                  </div>
                </CardShell>
              </li>
            ))}
          </ul>
        ) : (
          <CardShell className="mt-3 p-5 rounded-3xl">
            <p className="font-display text-[18px] font-bold text-ink">Quiet for now.</p>
            <p className="mt-1 text-[13px] text-mute">
              As you plan and save, AirPal will surface things worth your time here.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => nav("/plan/new")} className="rounded-full px-4">
                Make a plan
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => nav("/now")}
                className="rounded-full px-4 ring-1 ring-line"
              >
                What now?
              </Button>
            </div>
          </CardShell>
        )}
      </section>

      {/* Trust & Safety Assurance Banner */}
      <section aria-label="Trust and Safety" className="mt-8 cv-auto">
        <div className="rounded-3xl bg-card p-5 ring-1 ring-line/80 shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-accent" />
            <h3 className="font-display text-base font-bold text-ink">AirPal Trust & Safety</h3>
          </div>
          <p className="text-xs text-mute mt-1 max-w-xl leading-relaxed">
            Verified identity badges, safe public meetups, and Stripe payment protection.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-mute font-medium">
            <span className="flex items-center gap-1.5 text-ink font-semibold">
              <span className="text-emerald-600 font-bold">✓</span> Trusted local businesses
            </span>
            <span aria-hidden="true" className="text-line select-none hidden sm:inline">
              ·
            </span>
            <span className="flex items-center gap-1.5 text-ink font-semibold">
              <span className="text-emerald-600 font-bold">✓</span> Stripe Secure Payments
            </span>
            <span aria-hidden="true" className="text-line select-none hidden sm:inline">
              ·
            </span>
            <span className="flex items-center gap-1.5 text-ink font-semibold">
              <span className="text-emerald-600 font-bold">✓</span> Public Meetup Safety
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
