import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Compass,
  Plus,
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  Share2,
  ArrowRight,
  Coffee,
  Utensils,
  Wine,
  Footprints,
  Car,
  PartyPopper,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePlans } from "@/contexts/PlanContext";
import { useEvents } from "@/contexts/EventsContext";
import { PlanGridCard } from "@/components/airpal/PlanGridCard";
import { PLAN_TYPES, formatPlanDate } from "@shared/plan";
import { useLocalNow } from "@/hooks/useLocalNow";
import { EVENT_NEAR_M, locatedNear } from "@/lib/location-scope";
import { triggerHaptic, triggerHapticSelection, shareNative } from "@/lib/native";
import { Photo } from "@/components/ui/Photo";
import { SearchBar } from "@/components/search/SearchBar";
import { openGlobalSearch } from "@/components/search/openSearch";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

type HubTab = "my" | "public" | "past" | "saved";
type Category = "all" | "experience" | "milestone" | "social";

const TABS: { id: HubTab; label: string }[] = [
  { id: "my", label: "Upcoming" },
  { id: "public", label: "Discover" },
  { id: "past", label: "Past" },
  { id: "saved", label: "Saved" },
];

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all", label: "All Types" },
  { id: "experience", label: "Experiences" },
  { id: "milestone", label: "Milestones" },
  { id: "social", label: "Social" },
];

const QUICK_STARTERS = [
  {
    icon: Coffee,
    label: "Coffee Catchup",
    desc: "Quick coffee & chat",
    type: "catchup" as const,
    color: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  {
    icon: Utensils,
    label: "Family Brunch",
    desc: "Weekend feast together",
    type: "lunch" as const,
    color: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  },
  {
    icon: Wine,
    label: "Night Out",
    desc: "Drinks, music & vibes",
    type: "nightout" as const,
    color: "bg-brand/10 text-brand",
  },
  {
    icon: Footprints,
    label: "Walk & Talk",
    desc: "Scenic trail or park walk",
    type: "walk" as const,
    color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  {
    icon: Car,
    label: "Road Trip",
    desc: "Weekend getaway drive",
    type: "trip" as const,
    color: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  {
    icon: PartyPopper,
    label: "Celebration",
    desc: "Birthday or milestone",
    type: "birthday" as const,
    color: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
];

function getCountdownBadge(date: string, time: string): string {
  try {
    const target = new Date(`${date}T${time || "12:00"}:00`);
    if (Number.isNaN(target.getTime())) return "";
    const diffDays = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `In ${diffDays} days`;
  } catch {
    return "";
  }
}

export function PlanHubPage() {
  const [, nav] = useLocation();
  const { plans, myPlans, publicPlans } = usePlans();
  const { savedEvents, calendarEvents } = useEvents();

  const { today, city, here, usingGps } = useLocalNow();

  const [tab, setTab] = useState<HubTab>("my");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");

  const effectiveCity = city && city !== "Choose a city" && city !== "Current location" ? city : "Sydney";

  const pastPlans = useMemo(() => {
    return plans.filter((p) => p.date < today || p.status === "completed").sort((a, b) => b.date.localeCompare(a.date));
  }, [plans, today]);

  const activeMyPlans = useMemo(() => {
    return myPlans
      .filter((p) => p.date >= today && p.status !== "completed")
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [myPlans, today]);

  const activePublicPlans = useMemo(() => {
    return publicPlans
      .filter((p) => p.date >= today && p.status !== "completed")
      .filter((p) => locatedNear({ geo: p.geo, city: p.city || p.destination }, here, city, usingGps, EVENT_NEAR_M))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [publicPlans, today, here, city, usingGps]);

  const nextUpcomingPlan = activeMyPlans[0] || null;

  const displayedPlans = useMemo(() => {
    let list = tab === "my" ? activeMyPlans : tab === "public" ? activePublicPlans : pastPlans;

    if (category === "experience") {
      list = list.filter((p) => p.isExperience);
    } else if (category === "milestone") {
      list = list.filter((p) => PLAN_TYPES[p.type]?.category === "Life Milestone");
    } else if (category === "social") {
      list = list.filter((p) => PLAN_TYPES[p.type]?.category !== "Life Milestone" && !p.isExperience);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.destination.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.creator.name.toLowerCase().includes(q) ||
          p.stops.some((s) => s.name.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [tab, activeMyPlans, activePublicPlans, pastPlans, category, searchQuery]);

  const savedDetailed = useMemo(() => {
    const seen = new Set<string>();
    const rows: { key: string; eventId: string; name: string; event?: (typeof calendarEvents)[number] }[] = [];
    for (const s of savedEvents) {
      if (seen.has(s.eventId)) continue;
      seen.add(s.eventId);
      rows.push({
        key: `saved-${s.eventId}`,
        eventId: s.eventId,
        name: s.name,
        event: calendarEvents.find((e) => e.id === s.eventId),
      });
    }
    for (const e of calendarEvents.filter((e) => e.isInterested)) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      rows.push({ key: `interested-${e.id}`, eventId: e.id, name: e.title, event: e });
    }
    return rows;
  }, [savedEvents, calendarEvents]);

  const handleSharePlan = async (e: React.MouseEvent, planId: string, planTitle: string) => {
    e.preventDefault();
    e.stopPropagation();
    void triggerHaptic("medium");
    const shareUrl = `${window.location.origin}/plan/${planId}`;
    const shared = await shareNative({
      title: planTitle,
      text: `Join my plan "${planTitle}" on AirPal:`,
      url: shareUrl,
      dialogTitle: `Invite to ${planTitle}`,
    });
    if (!shared) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Invite link copied to clipboard!");
      } catch {
        toast.message("Share link ready: " + shareUrl);
      }
    }
  };

  const handleStarterClick = (starter: (typeof QUICK_STARTERS)[number]) => {
    void triggerHaptic("light");
    nav(
      `/plan/new?title=${encodeURIComponent(starter.label)}&dest=${encodeURIComponent(effectiveCity)}&type=${starter.type}`,
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-10 pb-28">
      {/* Header — Plans: Liquid Glass Title & Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              <MapPin size={12} className="shrink-0" />
              <span>{effectiveCity}</span>
            </span>
            {activeMyPlans.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
                {activeMyPlans.length} upcoming
              </span>
            )}
          </div>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
            Plans &amp; Invites
          </h1>
          <p className="mt-0.5 text-xs text-mute font-medium">
            Shared itineraries with mates &amp; friends.
          </p>
        </div>

        <Button
          onClick={() => {
            void triggerHaptic("medium");
            nav("/plan/new");
          }}
          className="h-12 shrink-0 gap-2 rounded-full px-6 font-bold shadow-[0_6px_20px_rgba(18,22,20,0.12)] transition-transform active:scale-95"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>New Plan</span>
        </Button>
      </div>

      {/* Featured Spotlight: Next Upcoming Plan */}
      {tab === "my" && nextUpcomingPlan && (
        <div className="mt-6 overflow-hidden rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs transition-all hover:shadow-md md:p-6">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-line/60">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/15 text-brand">
                <Sparkles size={13} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-brand">
                Spotlight · Your Next Plan
              </span>
            </div>
            {getCountdownBadge(nextUpcomingPlan.date, nextUpcomingPlan.time) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white shadow-xs">
                <Clock size={12} />
                {getCountdownBadge(nextUpcomingPlan.date, nextUpcomingPlan.time)}
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-5 md:grid-cols-12 md:items-center">
            {nextUpcomingPlan.heroImage && (
              <div className="relative aspect-video md:aspect-4/3 md:col-span-4 overflow-hidden rounded-2xl ring-1 ring-line/40">
                <Photo
                  src={nextUpcomingPlan.heroImage}
                  alt={nextUpcomingPlan.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className={cn("flex flex-col justify-between", nextUpcomingPlan.heroImage ? "md:col-span-8" : "md:col-span-12")}>
              <div>
                <h2 className="font-display text-xl font-bold text-ink md:text-2xl">
                  {nextUpcomingPlan.title}
                </h2>

                <div className="mt-2.5 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-medium text-mute md:text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={14} className="text-brand" />
                    {formatPlanDate(nextUpcomingPlan.date, nextUpcomingPlan.time)}
                  </span>
                  {(nextUpcomingPlan.destination || nextUpcomingPlan.city) && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={14} className="text-emerald-500" />
                      {nextUpcomingPlan.destination || nextUpcomingPlan.city}
                    </span>
                  )}
                  {nextUpcomingPlan.stops.length > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-mute/60" />
                      {nextUpcomingPlan.stops.length} stop{nextUpcomingPlan.stops.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>

                {nextUpcomingPlan.notes && (
                  <p className="mt-2 line-clamp-2 text-xs text-mute/90 md:text-sm">
                    {nextUpcomingPlan.notes}
                  </p>
                )}

                {nextUpcomingPlan.attendees && nextUpcomingPlan.attendees.length > 0 && (
                  <div className="mt-3.5 flex items-center gap-2">
                    <div className="flex -space-x-2 overflow-hidden">
                      {nextUpcomingPlan.attendees.slice(0, 5).map((att, idx) => (
                        <div
                          key={att.id || idx}
                          className="inline-grid h-7 w-7 place-items-center rounded-full bg-paper font-semibold text-[11px] text-ink ring-2 ring-card shadow-xs"
                          title={att.name}
                        >
                          {att.name.trim()[0]?.toUpperCase() || "•"}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-mute">
                      {nextUpcomingPlan.attendees.filter((a) => a.status === "going").length} going
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => {
                    void triggerHaptic("light");
                    nav(`/plan/${nextUpcomingPlan.id}`);
                  }}
                  className="h-10 rounded-full px-5 font-bold shadow-xs text-sm"
                >
                  <span>View Itinerary</span>
                  <ArrowRight size={15} />
                </Button>

                <Button
                  variant="outlined"
                  onClick={(e) => handleSharePlan(e, nextUpcomingPlan.id, nextUpcomingPlan.title)}
                  className="h-10 rounded-full px-4 text-xs font-semibold text-ink ring-1 ring-line hover:bg-mute/5"
                >
                  <Share2 size={14} className="mr-1.5" />
                  <span>Share Invite</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Starter Templates */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-mute">
            Quick Starters
          </h2>
          <span className="text-xs text-mute">1-tap to start</span>
        </div>

        <div className="no-scrollbar -mx-4 mt-3 flex items-center gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
          {QUICK_STARTERS.map((starter) => (
            <button
              key={starter.label}
              type="button"
              onClick={() => handleStarterClick(starter)}
              className="group flex w-44 shrink-0 flex-col justify-between rounded-2xl bg-card p-3.5 text-left ring-1 ring-line transition-shadow duration-200 hover:ring-brand/30 hover:shadow-sm active:scale-95 sm:w-auto"
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    starter.color,
                  )}
                >
                  <starter.icon size={19} />
                </span>
                <ArrowRight size={15} className="text-mute opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="mt-3">
                <span className="block truncate text-sm font-bold text-ink">
                  {starter.label}
                </span>
                <span className="block truncate text-[11px] text-mute">
                  {starter.desc}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Navigation & Search — sticky so long lists keep their filters */}
      <div className="sticky-pagebar z-20 -mx-4 mt-8 bg-paper/85 px-4 pt-3 backdrop-blur-xl border-b border-line/60">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {TABS.map((t) => {
              const active = tab === t.id;
              const count =
                t.id === "my"
                  ? activeMyPlans.length
                  : t.id === "public"
                  ? activePublicPlans.length
                  : t.id === "past"
                  ? pastPlans.length
                  : savedDetailed.length;

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    void triggerHapticSelection();
                    setTab(t.id);
                  }}
                  className={cn(
                    "flex min-h-[44px] items-center gap-2 rounded-full px-4 text-xs font-bold transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                    active
                      ? "bg-brand text-white shadow-xs"
                      : "bg-card text-mute hover:text-ink ring-1 ring-line/80 hover:bg-paper",
                  )}
                >
                  <span>{t.label}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-extrabold tabular-nums",
                        active ? "bg-white/20 text-white" : "bg-mute/15 text-mute",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search and Category Filters */}
        <div className="mt-4 flex flex-col gap-3 pb-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              sizeVariant="md"
              variant="card"
              placeholder="Search plans by title, city, or stops…"
              aria-label="Search plans"
              showFullSearchAction={Boolean(searchQuery.trim())}
              fullSearchLabel="Full Search"
              onFullSearch={(q) => openGlobalSearch({ query: q, category: "plan" })}
            />
          </div>

          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  setCategory(c.id);
                }}
                className={cn(
                  "min-h-[44px] shrink-0 rounded-xl px-3 text-xs font-semibold ring-1 transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  category === c.id
                    ? "bg-ink text-white ring-transparent shadow-xs"
                    : "bg-card text-mute ring-line hover:text-ink hover:bg-paper",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area: Plans / Saved List */}
      <div className="mt-6">
        {tab === "saved" ? (
          savedDetailed.length === 0 ? (
            <div className="rounded-3xl bg-card p-8 md:p-12 text-center ring-1 ring-line shadow-xs">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <Heart size={24} />
              </div>
              <h2 className="font-display text-xl font-bold text-ink">Nothing saved yet</h2>
              <p className="mt-1.5 text-sm text-mute max-w-sm mx-auto">
                Tap the heart on any event in {effectiveCity} to save it here for upcoming hangouts.
              </p>
              <div className="mt-6">
                <Button
                  onClick={() => {
                    void triggerHaptic("light");
                    nav("/calendar");
                  }}
                  className="h-11 rounded-full px-6 font-bold shadow-xs"
                >
                  <span>What&apos;s on</span>
                </Button>
              </div>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {savedDetailed.map(({ key, eventId, name, event }) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      nav(`/calendar?event=${eventId}`);
                    }}
                    className="flex w-full cursor-pointer touch-manipulation items-center gap-3.5 rounded-2xl bg-card p-4 text-left ring-1 ring-line transition hover:ring-brand/30 hover:shadow-xs active:scale-[0.99]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 font-bold">
                      <Calendar size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">
                        {event?.title || name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-mute">
                        {event ? `${event.timeLabel}${event.venue ? ` · ${event.venue}` : ""}` : "Saved event"}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-bold text-brand flex items-center gap-1">
                      View <ArrowRight size={13} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : displayedPlans.length === 0 ? (
          <div className="rounded-3xl bg-card p-8 md:p-12 text-center ring-1 ring-line shadow-xs">
            <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand">
              <Compass size={28} />
            </div>
            <h2 className="font-display text-xl font-bold text-ink">
              {searchQuery
                ? `No plans matched "${searchQuery}"`
                : tab === "my"
                ? "No upcoming plans scheduled"
                : tab === "public"
                ? "No public plans nearby"
                : "No past plans recorded"}
            </h2>
            <p className="mt-1.5 text-sm text-mute max-w-sm mx-auto">
              {searchQuery
                ? "Try searching for a different destination, activity, or keyword."
                : tab === "my"
                ? "Create a hangout, invite friends with a shareable link, and experience it together."
                : tab === "public"
                ? "Be the first to host a public plan or experience in your city."
                : "Your completed hangouts and experiences will appear here as memories."}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {searchQuery ? (
                <Button
                  variant="outlined"
                  onClick={() => setSearchQuery("")}
                  className="h-11 rounded-full px-5 text-xs font-semibold ring-1 ring-line"
                >
                  <span>Clear Search</span>
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    void triggerHaptic("medium");
                    nav("/plan/new");
                  }}
                  className="h-11 rounded-full px-6 font-bold shadow-[0_6px_20px_rgba(18,22,20,0.12)]"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>Create a Plan</span>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {displayedPlans.map((plan) => (
              <PlanGridCard key={plan.id} plan={plan} dimmed={tab === "past"} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

