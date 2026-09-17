import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  Beer,
  Clock,
  Coffee,
  Compass,
  Footprints,
  HeartHandshake,
  Palette,
  Plus,
  Radar,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePlans } from "@/contexts/PlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { PlanCard } from "@/components/plan/PlanCard";
import { PLAN_TYPES } from "@shared/plan";
import { cn } from "@/lib/cn";
import { useLocalNow } from "@/hooks/useLocalNow";

type HubTab = "my" | "public" | "past";
type Category = "all" | "experience" | "milestone" | "social";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all", label: "All plans" },
  { id: "experience", label: "Experiences" },
  { id: "milestone", label: "Milestones" },
  { id: "social", label: "Social" },
];

const TEMPLATE_SUGGESTIONS = [
  { label: "☕ Harbour Coffee Walk", destination: "Circus Quay, Sydney", type: "casual" },
  { label: "🍻 Rocks Pub Crawl", destination: "The Rocks, Sydney", type: "nightlife" },
  { label: "🎨 MCA Art Tour", destination: "Museum of Contemporary Art", type: "culture" },
  { label: "🏃 Bondi Coastal Run", destination: "Bondi to Coogee Coastal Walk", type: "activity" },
];

export function PlanHubPage() {
  const [, nav] = useLocation();
  const { plans, myPlans, publicPlans } = usePlans();
  const { user } = useAuth();
  const { today } = useLocalNow();

  const [tab, setTab] = useState<HubTab>("my");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");

  const userAttendeeId =
    user?.uid ||
    (typeof window !== "undefined" ? localStorage.getItem("airpal.anon.id") : null) ||
    undefined;

  const pastPlans = useMemo(() => {
    return plans
      .filter((p) => p.date < today || p.status === "completed")
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [plans, today]);

  const activeMyPlans = useMemo(() => {
    return myPlans
      .filter((p) => p.date >= today && p.status !== "completed")
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [myPlans, today]);

  const activePublicPlans = useMemo(() => {
    return publicPlans
      .filter((p) => p.date >= today && p.status !== "completed")
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [publicPlans, today]);

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
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-0.5 text-xs font-black uppercase tracking-[0.16em] text-slate-950 border border-ink shadow-xs">
            <Sparkles size={13} />
            <span>Make Plans · Sydney 🇦🇺</span>
          </div>
          <h1 className="font-display mt-2 text-3xl md:text-4xl font-extrabold text-ink">Hangouts & Plans</h1>
          <p className="text-sm text-mute mt-1">Organise hangouts with your crew, build itineraries, or join a public plan.</p>
        </div>
        <Button onClick={() => nav("/plan/new")} className="h-11 shrink-0 gap-2 self-start rounded-full px-5 md:self-auto shadow-xs">
          <Plus size={17} />
          <span>New plan</span>
        </Button>
      </div>

      {/* AirPal Companion Banner */}
      <div className="mt-6 rounded-3xl border-2 border-ink bg-gradient-to-r from-brand/10 via-amber-500/10 to-purple-500/10 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-xs">
            <HeartHandshake size={22} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">AirPal Mate Priority</p>
            <h3 className="font-display text-base font-bold text-ink">Going alone or need someone to join?</h3>
            <p className="text-xs text-mute">Find a verified AirPal Mate in Sydney to accompany you to any event or hangout.</p>
          </div>
        </div>
        <Button
          size="sm"
          className="shrink-0 gap-1.5 font-bold shadow-xs self-start sm:self-auto"
          onClick={() => nav("/companion")}
        >
          <span>Find an AirPal</span>
          <ArrowRight size={15} />
        </Button>
      </div>

      {/* Quick Hangout Template Chips */}
      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-wider text-mute mb-2">Quick-start Sydney templates</p>
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
          {TEMPLATE_SUGGESTIONS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => nav(`/plan/new?title=${encodeURIComponent(item.label.slice(2))}&dest=${encodeURIComponent(item.destination)}`)}
              className="shrink-0 rounded-full border border-ink bg-card px-3.5 py-1.5 text-xs font-semibold text-ink shadow-xs hover:bg-paper transition"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-full border-2 border-ink bg-paper p-1 shadow-xs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-bold transition",
                tab === t.id ? "bg-ink text-white" : "text-mute hover:text-ink",
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
            className="h-10 w-full rounded-full bg-card pl-10 pr-4 text-sm text-ink border-2 border-ink outline-none placeholder:text-mute focus:border-brand shadow-xs"
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
              "shrink-0 rounded-full border-2 px-3.5 py-1.5 text-[13px] font-bold transition",
              category === c.id
                ? "border-ink bg-ink text-white"
                : "border-ink/40 bg-paper text-mute hover:border-ink hover:text-ink",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Plans List */}
      <div className="mt-5">
        {displayedPlans.length === 0 ? (
          <div className="rounded-3xl border-2 border-ink bg-card p-8 md:p-12 text-center shadow-xs">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand/10 text-brand border border-brand/20">
              <Compass size={32} />
            </div>
            <h2 className="font-display text-xl font-bold text-ink">
              {searchQuery ? "No plans match your search" : tab === "my" ? "No upcoming plans yet" : "Nothing here yet"}
            </h2>
            <p className="text-sm text-mute mt-1.5 max-w-md mx-auto">
              {tab === "my"
                ? "Create a hangout, invite mates with a link, and build the itinerary together."
                : "Check back soon — or start a public plan and meet people nearby."}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Button onClick={() => nav("/plan/new")} className="h-11 rounded-full px-6 shadow-xs font-bold">
                <Plus size={16} />
                <span>Create a plan</span>
              </Button>
              {tab !== "public" && (
                <Button variant="ghost" onClick={() => setTab("public")} className="h-11 rounded-full border-2 border-ink px-5 font-bold">
                  <Radar size={15} className="text-brand" />
                  <span>Browse public</span>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayedPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} userAttendeeId={userAttendeeId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
