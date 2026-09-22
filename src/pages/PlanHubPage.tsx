import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Compass, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePlans } from "@/contexts/PlanContext";
import { useEvents } from "@/contexts/EventsContext";

import { PlanGridCard } from "@/components/airpal/PlanGridCard";
import { PillRow } from "@/components/design-system/companions";
import { PLAN_TYPES } from "@shared/plan";
import { useLocalNow } from "@/hooks/useLocalNow";
import { EVENT_NEAR_M, locatedNear } from "@/lib/location-scope";

type HubTab = "my" | "public" | "past" | "saved";
type Category = "all" | "experience" | "milestone" | "social";

const TABS: { id: HubTab; label: string; color: string }[] = [
  { id: "my", label: "Upcoming", color: "#121614" },
  { id: "public", label: "Discover", color: "#e86a33" },
  { id: "past", label: "Past", color: "#6a726c" },
  { id: "saved", label: "Saved", color: "#2fa866" },
];

const CATEGORIES: { id: Category; label: string; color: string }[] = [
  { id: "all", label: "All", color: "#1805db" },
  { id: "experience", label: "Experiences", color: "#e86a33" },
  { id: "milestone", label: "Milestones", color: "#2b7cd3" },
  { id: "social", label: "Social", color: "#2fa866" },
];

function templateSuggestions(city: string) {
  const dest = city && city !== "Current location" && city !== "Choose a city" ? city : "Nearby";
  return [
    { label: "👨‍👩‍👧 Family brunch", destination: dest, type: "lunch" as const },
    { label: "☕ Coffee with friends", destination: dest, type: "catchup" as const },
    { label: "🌃 Night out nearby", destination: dest, type: "nightout" as const },
    { label: "🚶 Walk nearby", destination: dest, type: "walk" as const },
  ];
}

export function PlanHubPage() {
  const [, nav] = useLocation();
  const { plans, myPlans, publicPlans } = usePlans();
  const { savedEvents, calendarEvents } = useEvents();

  const { today, city, here, usingGps } = useLocalNow();

  const [tab, setTab] = useState<HubTab>("my");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-10 pb-28">
      {/* Header — Plans: one screen, one primary action */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[28px] md:text-4xl font-bold tracking-tight text-ink">Plans</h1>
        <Button
          onClick={() => nav("/plan/new")}
          className="h-12 shrink-0 gap-1.5 rounded-full px-5 shadow-[0_6px_20px_rgba(24,5,219,0.35)]"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>New Plan</span>
        </Button>
      </div>

      <div className="mt-5">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
          {templateSuggestions(city).map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() =>
                nav(
                  `/plan/new?title=${encodeURIComponent(item.label.slice(2).trim())}&dest=${encodeURIComponent(item.destination)}&type=${item.type}`,
                )
              }
              className="shrink-0 rounded-full bg-brand/10 px-4 py-2 text-[13px] font-semibold text-brand transition active:scale-[0.97]"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="mt-5">
        <PillRow options={TABS} value={tab} onChange={setTab} label="Plan sections" />
        <div className="relative mt-3">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plans…"
            aria-label="Search plans"
            className="h-12 w-full rounded-full bg-card pl-11 pr-4 text-[15px] text-ink shadow-[0_4px_16px_rgba(18,22,20,0.08)] ring-1 ring-line outline-none placeholder:text-mute focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            aria-pressed={category === c.id}
            className="h-10 shrink-0 cursor-pointer touch-manipulation rounded-full px-4 text-[14px] font-semibold shadow-sm transition active:scale-[0.96] ring-1 ring-line"
            style={
              category === c.id
                ? { backgroundColor: c.color, color: "#fff", borderColor: "transparent" }
                : { backgroundColor: `${c.color}14`, color: c.color }
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Plans List */}
      <div className="mt-5">
        {tab === "saved" ? (
          savedDetailed.length === 0 ? (
            <div className="rounded-3xl ring-1 ring-line bg-card p-8 md:p-12 text-center shadow-xs">
              <h2 className="font-display text-xl font-bold text-ink">Nothing saved yet</h2>
              <p className="text-sm text-mute mt-1.5 max-w-md mx-auto">
                Tap the heart on any place or event and it waits for you here.
              </p>
              <div className="mt-6">
                <Button onClick={() => nav("/explore")} className="h-11 rounded-full px-6 shadow-xs font-bold">
                  <span>Explore</span>
                </Button>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {savedDetailed.map(({ key, eventId, name, event }) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => nav(`/calendar?event=${eventId}`)}
                    className="flex w-full cursor-pointer touch-manipulation items-center gap-3 rounded-2xl bg-card px-4 py-3.5 text-left ring-1 ring-line transition hover:ring-brand/30 active:scale-[0.99]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">
                        {event?.title || name}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-mute">
                        {event ? `${event.timeLabel}${event.venue ? ` · ${event.venue}` : ""}` : "Saved event"}
                      </span>
                    </span>
                    <span className="shrink-0 text-[14px] font-semibold text-brand">Open →</span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : displayedPlans.length === 0 ? (
          <div className="rounded-[24px] bg-card p-8 text-center shadow-[0_4px_16px_rgba(18,22,20,0.08)] ring-1 ring-line">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-[18px] bg-brand/10 text-brand">
              <Compass size={28} />
            </div>
            <h2 className="font-display text-xl font-bold text-ink">
              {searchQuery ? "No matches" : tab === "my" ? "No upcoming plans" : "Nothing here"}
            </h2>
            <p className="text-sm text-mute mt-1 max-w-xs mx-auto">
              {tab === "my" ? "Make a plan, share a link, go together." : "Check back soon."}
            </p>
            <div className="mt-5">
              <Button
                onClick={() => nav("/plan/new")}
                className="h-12 rounded-full px-6 font-bold shadow-[0_6px_20px_rgba(24,5,219,0.35)]"
              >
                <Plus size={16} />
                <span>New Plan</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 lg:grid-cols-3">
            {displayedPlans.map((plan) => (
              <PlanGridCard key={plan.id} plan={plan} dimmed={tab === "past"} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
