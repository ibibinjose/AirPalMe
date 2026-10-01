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
  QrCode,
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
import { DoorChooser } from "@/components/home/DoorChooser";
import { loadDoor, saveDoor } from "@/lib/door";
import { openGlobalSearch } from "@/components/search/GlobalSearchModal";
import { triggerHaptic } from "@/lib/native";
import { loadPublicMatesRemote } from "@/lib/companion-remote";
import type { PublicMate } from "@shared/companion";
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
  { id: "events", label: "Events & Shows", color: "#e86a33" },
  { id: "food", label: "Dining & Drinks", color: "#d99a17" },
  { id: "places", label: "Places & Stays", color: "#2b7cd3" },
  { id: "community", label: "Community Hub", color: "#2fa866" },
];

const QUICK_PROMPTS = [
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
    sub: "Find someone to go with you",
    href: "/mate",
    icon: Users,
    gradient: "from-blue-600/15 via-indigo-500/10 to-transparent",
    iconBg: "bg-brand text-white",
    badge: "MVP Priority",
  },
  {
    id: "experiences",
    label: "Experiences",
    sub: "Food, culture, art & music",
    href: "/experiences",
    icon: Sparkles,
    gradient: "from-amber-500/15 via-orange-500/10 to-transparent",
    iconBg: "bg-amber-600 text-white",
    badge: "Popular",
  },
  {
    id: "stay",
    label: "Stays & Places",
    sub: "Hotels, hostels & retreats",
    href: "/explore",
    icon: Hotel,
    gradient: "from-emerald-500/15 via-teal-500/10 to-transparent",
    iconBg: "bg-emerald-600 text-white",
    badge: "Verified",
  },
  {
    id: "events",
    label: "What's On",
    sub: "Daily discovery & nightlife",
    href: "/calendar",
    icon: CalendarDays,
    gradient: "from-rose-500/15 via-pink-500/10 to-transparent",
    iconBg: "bg-rose-600 text-white",
    badge: "Live Daily",
  },
  {
    id: "trips",
    label: "Plan & Travel",
    sub: "Itineraries & group hangouts",
    href: "/plan",
    icon: Plane,
    gradient: "from-purple-500/15 via-violet-500/10 to-transparent",
    iconBg: "bg-purple-600 text-white",
    badge: "Collaborate",
  },
  {
    id: "perks",
    label: "Perks & Drops",
    sub: "Giveaways, birthday freebies & rewards",
    href: "/birthday-freebies/au",
    icon: Gift,
    gradient: "from-yellow-500/15 via-amber-500/10 to-transparent",
    iconBg: "bg-yellow-600 text-white",
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
  const [door, setDoor] = useState(() => loadDoor());
  const [publicMates, setPublicMates] = useState<PublicMate[]>([]);

  useEffect(() => {
    loadPublicMatesRemote()
      .then((mates) => {
        if (mates && mates.length > 0) {
          setPublicMates(mates.slice(0, 4));
        }
      })
      .catch(() => undefined);
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

  const places = useMemo(
    () => discoverPlaces(here, city, "city").slice(0, 8),
    [here, city, version],
  );

  const tonightEvents = useMemo(
    () =>
      calendarEvents
        .filter((e) => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6),
    [calendarEvents, today],
  );

  const forYou = useMemo(() => publicPlans.slice(0, 3), [publicPlans]);

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
            </span>
            <span className="text-xs font-medium text-white/80">
              {greeting}, {firstName}
            </span>
          </div>

          <h1 className="font-display mt-3 text-[32px] sm:text-[42px] font-bold leading-[1.05] tracking-tight text-white max-w-2xl">
            What do you want to do?
          </h1>
          <p className="mt-1.5 text-sm sm:text-base font-medium text-white/85 max-w-xl">
            AirPal.me — Life Made Easy. Find mates, discover experiences, explore stays, and make real plans.
          </p>

          {/* Quick Search Trigger */}
          <div className="mt-5">
            <button
              type="button"
              onClick={openGlobalSearch}
              className="flex w-full items-center justify-between rounded-2xl bg-card/90 px-4 py-3.5 text-left text-sm font-medium text-mute ring-1 ring-line/80 shadow-md backdrop-blur-md hover:bg-card hover:text-ink transition cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Search size={18} className="text-brand" />
                <span>Search mates, places, events, food or trips…</span>
              </span>
              <kbd className="hidden rounded bg-paper/90 px-2 py-0.5 text-xs font-semibold text-mute ring-1 ring-line sm:inline-block">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Prompt Chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  if (p.href) nav(p.href);
                  else openGlobalSearch();
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-md ring-1 ring-white/25 hover:bg-white/25 transition cursor-pointer active:scale-95"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Primary Action Buttons */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Button
              size="sm"
              onClick={() => {
                void triggerHaptic("medium");
                nav("/mate");
              }}
              className="h-11 rounded-full px-5 font-bold shadow-[0_6px_20px_rgba(24,5,219,0.35)]"
            >
              <Users size={16} className="mr-1.5" />
              Find a Mate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                void triggerHaptic("light");
                nav("/plan/new");
              }}
              className="h-11 rounded-full px-5 bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25 font-semibold"
            >
              <Plus size={16} className="mr-1.5" />
              Make a Plan
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                void triggerHaptic("light");
                nav("/scan");
              }}
              className="h-11 rounded-full px-4 bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25"
              title="Scan QR / NFC"
            >
              <QrCode size={16} />
            </Button>
          </div>
        </div>
      </header>

      {/* Six Marketplace Pillars Grid */}
      <section aria-label="Explore AirPal Verticals" className="mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">Life Made Easy</h2>
            <p className="text-xs text-mute mt-0.5">Everything you need across people, places, and experiences.</p>
          </div>
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
                className={cn(
                  "group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-card p-3.5 text-left ring-1 ring-line/80 shadow-xs transition-all hover:shadow-md hover:ring-brand/30 active:scale-[0.98] cursor-pointer",
                )}
              >
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 transition-opacity group-hover:opacity-100", v.gradient)} />
                <div className="relative z-10 flex items-start justify-between">
                  <div className={cn("grid h-9 w-9 place-items-center rounded-xl shadow-xs", v.iconBg)}>
                    <Icon size={18} />
                  </div>
                  {v.badge && (
                    <span className="rounded-full bg-paper px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-mute ring-1 ring-line">
                      {v.badge}
                    </span>
                  )}
                </div>
                <div className="relative z-10 mt-4">
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
                    {(nextTrip.attendees?.length || nextTrip.stops?.length)
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
                <p className="text-xs text-mute mt-1">
                  Keep your destinations, times, and mates connected on one shared live itinerary.
                </p>
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
              <p className="text-xs text-mute mt-0.5">
                Connect with verified local mates for dinners, events, workouts, or exploring the city safely.
              </p>
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
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {(m.interests || ["Events", "Coffee", "Walks"]).slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-medium text-mute ring-1 ring-line"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
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
                  Social Circles & Moments
                </span>
                <p className="font-display text-lg font-bold mt-2 text-ink">Communities Around Movement</p>
                <p className="mt-1 text-sm text-mute max-w-xl">
                  Connect with foodies, travellers, and locals planning things together — life made easy, not another endless feed.
                </p>
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
                const month = Number.isNaN(day.getTime())
                  ? ""
                  : day.toLocaleString(undefined, { month: "short" });
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
              <Button size="sm" variant="ghost" onClick={() => nav("/mate")} className="rounded-full px-4 ring-1 ring-line">
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
            Verified identity badges, safe public meetup guidelines, transparent pricing with Stripe protection, and 24/7 incident support.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-ink/70">
            <span className="rounded-full bg-paper px-2.5 py-1 ring-1 ring-line">✓ Identity Verified Mates</span>
            <span className="rounded-full bg-paper px-2.5 py-1 ring-1 ring-line">✓ Stripe Secure Payments</span>
            <span className="rounded-full bg-paper px-2.5 py-1 ring-1 ring-line">✓ Public Meetup Safety</span>
          </div>
        </div>
      </section>
    </div>
  );
}
