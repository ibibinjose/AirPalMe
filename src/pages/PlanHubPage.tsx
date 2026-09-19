import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Clock, Compass, Plus, Radar, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePlans } from "@/contexts/PlanContext";
import { useAuth } from "@/contexts/AuthContext";

import { PlanCard } from "@/components/plan/PlanCard";
import { EventTile } from "@/components/event/EventTile";
import { PLAN_TYPES } from "@shared/plan";
import { cn } from "@/lib/cn";
import { useLocalNow } from "@/hooks/useLocalNow";
import { EVENT_NEAR_M, locatedNear } from "@/lib/location-scope";

type HubTab = "my" | "public" | "past";
type Category = "all" | "experience" | "milestone" | "social";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all", label: "All plans" },
  { id: "experience", label: "Experiences" },
  { id: "milestone", label: "Milestones" },
  { id: "social", label: "Social" },
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
  const { user } = useAuth();

  const { today, city, here, usingGps } = useLocalNow();

  const [tab, setTab] = useState<HubTab>("my");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");

  const userAttendeeId =
    user?.uid || (typeof window !== "undefined" ? localStorage.getItem("airpal.anon.id") : null) || undefined;

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

  const tabs: { id: HubTab; label: string; count: number; icon: typeof Users }[] = [
    { id: "my", label: "My plans", count: activeMyPlans.length, icon: Users },
    { id: "public", label: "Public", count: activePublicPlans.length, icon: Radar },
    { id: "past", label: "Past", count: pastPlans.length, icon: Clock },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-10 pb-28">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-ink">Plans</h1>
          <p className="text-sm text-mute mt-1">With family and friends. Ticketed nights live under Events.</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <Button onClick={() => nav("/plan/new")} className="h-11 shrink-0 gap-2 rounded-full px-5 shadow-xs">
            <Plus size={17} />
            <span>Create plan</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => nav("/circle")}
            className="h-11 shrink-0 rounded-full px-4 ring-1 ring-line"
          >
            Circle
          </Button>
          <Button
            variant="ghost"
            onClick={() => nav("/event/new")}
            className="h-11 shrink-0 rounded-full px-4 ring-1 ring-line"
          >
            Ticketed event
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-wider text-mute mb-2">Quick-start with your people</p>
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
              className="shrink-0 rounded-full border border-line bg-card px-3.5 py-1.5 text-xs font-semibold text-ink shadow-xs hover:bg-paper transition"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-full ring-1 ring-line bg-paper p-1 shadow-xs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-bold transition",
                tab === t.id ? "bg-brand text-white" : "text-mute hover:text-ink",
              )}
            >
              <t.icon size={14} className={t.id === "public" && tab !== "public" ? "text-brand" : undefined} />
              <span>
                {t.label} ({t.count})
              </span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plans or places…"
            aria-label="Search plans"
            className="h-10 w-full rounded-full bg-card pl-10 pr-4 text-sm text-ink ring-1 ring-line outline-none placeholder:text-mute shadow-xs focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="no-scrollbar mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            aria-pressed={category === c.id}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition",
              category === c.id
                ? "border-brand bg-brand text-white"
                : "border-line bg-paper text-mute hover:border-brand/40 hover:text-ink",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Plans List */}
      <div className="mt-5">
        {displayedPlans.length === 0 ? (
          <div className="rounded-3xl ring-1 ring-line bg-card p-8 md:p-12 text-center shadow-xs">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand/10 text-brand border border-brand/20">
              <Compass size={32} />
            </div>
            <h2 className="font-display text-xl font-bold text-ink">
              {searchQuery ? "No plans match your search" : tab === "my" ? "No upcoming plans yet" : "Nothing here yet"}
            </h2>
            <p className="text-sm text-mute mt-1.5 max-w-md mx-auto">
              {tab === "my"
                ? "Make a plan with family and friends, share a link, go together."
                : "Check back soon — or host a ticketed event people nearby can join."}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Button onClick={() => nav("/plan/new")} className="h-11 rounded-full px-6 shadow-xs font-bold">
                <Plus size={16} />
                <span>Create plan</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => nav("/event/new")}
                className="h-11 rounded-full px-5 ring-1 ring-line font-bold"
              >
                Ticketed event
              </Button>
              {tab !== "public" && (
                <Button
                  variant="ghost"
                  onClick={() => setTab("public")}
                  className="h-11 rounded-full ring-1 ring-line px-5 font-bold"
                >
                  <Radar size={15} className="text-brand" />
                  <span>Browse public</span>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {displayedPlans.map((plan) =>
              plan.isExperience || plan.heroImage ? (
                <EventTile key={plan.id} plan={plan} />
              ) : (
                <div key={plan.id} className="col-span-2 sm:col-span-1">
                  <PlanCard plan={plan} userAttendeeId={userAttendeeId} />
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
