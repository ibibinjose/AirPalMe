import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Gift,
  Hotel,
  MapPin,
  Plane,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
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
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { openGlobalSearch } from "@/components/search/GlobalSearchModal";
import { triggerHaptic } from "@/lib/native";
import { loadPublicMatesRemote } from "@/lib/companion-remote";
import type { PublicMate } from "@shared/companion";
import { getExperienceProofRemote } from "@/lib/functions";
import {
  ArrowCta,
  AvatarStack,
  CardShell,
  PillRow,
  SectionHeader,
  greetingForHour,
} from "@/components/design-system/companions";
import { cn } from "@/lib/cn";

type AroundFilter = "events" | "food" | "places" | "community";

const AROUND: { id: AroundFilter; label: string; color: string }[] = [
  { id: "events", label: "Events & Shows", color: "#c2410c" },
  { id: "food", label: "Dining & Drinks", color: "#b45309" },
  { id: "places", label: "Places & Stays", color: "#2b7cd3" },
  { id: "community", label: "Community Hub", color: "#15803d" },
];

const QUICK_PROMPTS = [
  { label: "⚡ What now?", href: "/now" },
  { label: "☕ Coffee & Chat", query: "coffee" },
  { label: "✨ Find a Mate", href: "/mate" },
  { label: "🎭 Live Tonight", href: "/calendar" },
  { label: "🏨 Boutique Stays", href: "/explore" },
  { label: "🗺️ Plan a Trip", href: "/plan/new" },
  { label: "🎁 Giveaways", href: "/giveaways" },
  { label: "🎂 Birthday freebies", href: "/birthday-freebies/au" },
];

const VERTICALS = [
  {
    id: "mate",
    label: "AirPal Mate",
    sub: "Find someone to go with",
    href: "/mate",
    icon: Users,
    iconBg: "bg-brand/10 text-brand",
    badge: "Connect",
  },
  {
    id: "experiences",
    label: "Experiences",
    sub: "Food, art & culture",
    href: "/experiences",
    icon: Sparkles,
    iconBg: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    badge: "Popular",
  },
  {
    id: "stay",
    label: "Stays",
    sub: "Hotels & boutique rooms",
    href: "/explore",
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
    id: "perks",
    label: "Perks & Drops",
    sub: "Freebies & rewards",
    href: "/birthday-freebies/au",
    icon: Gift,
    iconBg: "bg-brand/10 text-brand",
    badge: "Rewards",
  },
];

export function HomePage() {
  const [, nav] = useLocation();
  const { user } = useAuth();
  const { myPlans, publicPlans } = usePlans();
  const { calendarEvents } = useEvents();
  const { city, here, today, now } = useLocalNow();
  const { version } = useListings();
  const [around, setAround] = useState<AroundFilter>("events");
  const [publicMates, setPublicMates] = useState<PublicMate[]>([]);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    loadPublicMatesRemote()
      .then((mates) => {
        if (mates && mates.length > 0) {
          setPublicMates(mates.slice(0, 4));
        }
      })
      .catch(() => undefined);
  }, []);

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
          <Photo src="/media/harbour.jpg" priority className="h-full w-full object-cover scale-105" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/30" />
        </div>
        <div className="relative px-4 pb-8 pt-8 md:px-8 md:pt-14">
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

          <h1 className="font-display mt-3 text-[30px] sm:text-[40px] font-bold leading-[1.05] tracking-tight text-white max-w-2xl">
            What do you want to do?
          </h1>
          <p className="mt-1 text-sm sm:text-base font-medium text-white/90 max-w-lg">
            Find mates, places, and experiences.
          </p>

          {/* Quick Search Trigger */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => openGlobalSearch()}
              className="flex w-full min-h-[48px] items-center justify-between rounded-2xl bg-card/90 px-4 py-3 text-left text-sm font-medium text-mute ring-1 ring-line/80 shadow-md backdrop-blur-md hover:bg-card hover:text-ink transition cursor-pointer touch-manipulation active:scale-[0.99]"
            >
              <span className="flex items-center gap-2.5">
                <Search size={18} className="text-brand" />
                <span>Search mates, places, events, or trips…</span>
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
                nav("/mate/request");
              }}
              className="h-11 rounded-full px-6 font-bold shadow-[0_6px_20px_rgba(18,22,20,0.15)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Users size={16} className="mr-2" />
              Find a Mate
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
      <section aria-label="Explore AirPal Verticals" className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">Life Made Easy</h2>
          <Link href="/explore" className="text-xs font-bold text-brand hover:underline">
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
                  <p className="font-display text-[15px] font-bold text-ink leading-snug group-hover:text-brand transition-colors">
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
      <section aria-label="Continue your journey" className="mt-8">
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
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand uppercase tracking-wider">
                  <Plane size={14} /> Ready for your next outing?
                </div>
                <h3 className="font-display text-lg font-bold mt-1 text-ink">Plan a hangout or trip</h3>
                <p className="text-xs text-mute mt-0.5">Live itineraries with friends &amp; mates.</p>
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
                  onClick={() => nav("/mate")}
                  className="rounded-full px-4 ring-1 ring-line"
                >
                  Find a Mate
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* AirPal Mate MVP Spotlight (§4) */}
      <section aria-label="AirPal Mate Spotlight" className="mt-8">
        <div className="flex items-end justify-between">
          <div>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-brand">
              <ShieldCheck size={14} /> Trusted & Verified
            </div>
            <h2 className="font-display text-xl font-bold tracking-tight mt-0.5">AirPal Mate</h2>
          </div>
          <Link href="/mate" className="text-xs font-bold text-brand hover:underline">
            Browse All Mates →
          </Link>
        </div>

        <div className="mt-3 rounded-3xl bg-card p-4 sm:p-5 ring-1 ring-line shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line/60 pb-4">
            <div>
              <p className="font-display text-base font-bold text-ink">Going somewhere? Don&apos;t go alone.</p>
              <p className="text-xs text-mute mt-0.5">Verified local companions.</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                void triggerHaptic("medium");
                nav("/mate/request");
              }}
              className="rounded-full px-4 self-start md:self-center shadow-xs"
            >
              Post a Mate Request
            </Button>
          </div>

          {/* Showcase cards */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {publicMates.length > 0 ? (
              publicMates.map((m) => (
                <CardShell
                  key={m.uid}
                  href={`/mate?select=${m.uid}`}
                  label={`View Mate ${m.firstName}`}
                  className="p-3.5 hover:ring-brand/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-paper ring-1 ring-line">
                      <Photo src={m.photo || "/media/harbour.jpg"} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="font-display text-sm font-bold truncate text-ink">{m.firstName}</p>
                        <BadgeCheck size={14} className="text-brand shrink-0" />
                      </div>
                      <p className="text-[11px] text-mute truncate flex items-center gap-0.5">
                        <MapPin size={10} /> {m.suburb || m.city || "Sydney"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-mute font-medium truncate">
                    {(m.interests || ["Events", "Coffee", "Walks"]).slice(0, 3).join(" · ")}
                  </p>
                </CardShell>
              ))
            ) : (
              <>
                <CardShell href="/mate" label="Dining & Drinks Companion" className="p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-500/15 text-amber-600 font-bold">
                      🍽️
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-xs font-bold text-ink">Food & Cocktails</p>
                      <p className="text-[11px] text-mute">Dinner & social companions</p>
                    </div>
                  </div>
                </CardShell>
                <CardShell href="/mate" label="Events & Gigs Companion" className="p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-rose-500/15 text-rose-600 font-bold">
                      🎟️
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-xs font-bold text-ink">Gigs & Festivals</p>
                      <p className="text-[11px] text-mute">Never go to a show alone</p>
                    </div>
                  </div>
                </CardShell>
                <CardShell href="/mate" label="Fitness & Walks Companion" className="p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 font-bold">
                      🏃
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-xs font-bold text-ink">Fitness & Outdoors</p>
                      <p className="text-[11px] text-mute">Hikes, running & gym mates</p>
                    </div>
                  </div>
                </CardShell>
                <CardShell href="/mate" label="Explore & Culture" className="p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-500/15 text-blue-600 font-bold">
                      🎨
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-xs font-bold text-ink">Arts & City Tours</p>
                      <p className="text-[11px] text-mute">Galleries, markets & walks</p>
                    </div>
                  </div>
                </CardShell>
              </>
            )}
          </div>
        </div>
      </section>

      {/* What's On Near You Section */}
      <section aria-label="What's on near you" className="mt-8">
        <SectionHeader title="Happening Near You" actionLabel="See All" actionHref="/explore" />
        <div className="mt-3">
          <PillRow options={AROUND} value={around} onChange={setAround} label="What's on categories" />
        </div>

        {around === "community" ? (
          <CardShell href="/circle" label="Open communities" className="mt-3 p-5 rounded-3xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  Social Circles
                </span>
                <p className="font-display text-lg font-bold mt-2 text-ink">Communities Around Movement</p>
                <p className="mt-1 text-sm text-mute max-w-xl">Connect and plan activities with locals.</p>
              </div>
              <ArrowCta />
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-brand">
              Open Social Circle <ArrowRight size={14} />
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
                        src={e.heroImage || "/media/laneway.jpg"}
                        className="absolute inset-0 h-full w-full object-cover transition duration-300 hover:scale-105"
                      />
                      <div className="hero-scrim absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      {dayNum && (
                        <span className="absolute left-3 top-3 grid min-h-11 min-w-11 place-items-center rounded-2xl bg-card/95 px-2 py-1 text-center shadow-sm">
                          <span>
                            <span className="font-display block text-[15px] font-bold leading-none text-ink">
                              {dayNum}
                            </span>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-brand">
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
                    src={p.heroImage || p.photos?.[0] || "/media/harbour.jpg"}
                    className="absolute inset-0 h-full w-full object-cover transition duration-300 hover:scale-105"
                  />
                  <div className="hero-scrim absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <p className="absolute bottom-2.5 left-3 right-3 font-display text-[16px] font-bold leading-tight text-white">
                    {p.name}
                  </p>
                </div>
                <div className="p-3">
                  <p className="flex items-center gap-1 truncate text-[12px] text-mute">
                    <MapPin size={12} className="text-brand shrink-0" /> {p.shortWhy || city || "Nearby"}
                  </p>
                </div>
              </CardShell>
            ))}
          </div>
        ) : (
          <div className="mt-3">
            <EmptyState
              title="Nothing nearby yet."
              body="Explore places, stays and experiences across the city."
              action={() => nav("/explore")}
              actionLabel="Explore"
            />
          </div>
        )}
      </section>

      {/* For You / Smart Recommendations */}
      <section aria-label="For you" className="mt-8">
        <SectionHeader title="Recommended Hangouts" actionLabel="Explore" actionHref="/explore" />
        {forYou.length > 0 ? (
          <ul className="mt-3 space-y-2.5">
            {forYou.map((p) => (
              <li key={p.id}>
                <CardShell href={`/plan/${p.id}`} label={p.title} className="p-3.5 rounded-2xl hover:ring-brand/40">
                  <div className="flex items-center gap-3.5">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
                      <Photo
                        src={p.heroImage || "/media/walk.jpg"}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold">
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
                onClick={() => nav("/mate")}
                className="rounded-full px-4 ring-1 ring-line"
              >
                Find a Mate
              </Button>
            </div>
          </CardShell>
        )}
      </section>

      {/* Trust & Safety Assurance Banner */}
      <section aria-label="Trust and Safety" className="mt-8">
        <div className="rounded-3xl bg-card p-5 ring-1 ring-line/80 shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-brand" />
            <h3 className="font-display text-base font-bold text-ink">AirPal Trust & Safety</h3>
          </div>
          <p className="text-xs text-mute mt-1 max-w-xl leading-relaxed">
            Verified identity badges, safe public meetups, and Stripe payment protection.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-mute font-medium">
            <span className="flex items-center gap-1.5 text-ink font-semibold">
              <span className="text-emerald-600 font-bold">✓</span> Identity Verified Mates
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
