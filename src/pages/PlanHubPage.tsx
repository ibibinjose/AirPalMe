import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Compass, Plus, Radar, Search, Users, Clock } from "lucide-react";
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
      <div className="flex flex-col gap-4 border-b border-line/60 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-ink">Plans</h1>
          <p className="text-sm text-mute mt-1">Hangouts with your crew — create one or join a public plan.</p>
        </div>
        <Button onClick={() => nav("/plan/new")} className="h-11 shrink-0 gap-2 self-start rounded-full px-5 md:self-auto">
          <Plus size={17} />
          <span>New plan</span>
        </Button>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-full bg-paper p-1 ring-1 ring-line" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition",
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
            className="h-10 w-full rounded-full bg-card pl-10 pr-4 text-sm text-ink ring-1 ring-line outline-none placeholder:text-mute focus:border-brand"
          />
        </div>
      </div>

      <div className="no-scrollbar mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            aria-pressed={category === c.id}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium ring-1 transition",
              category === c.id ? "bg-ink text-white ring-ink" : "bg-paper text-mute ring-line hover:text-ink",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {displayedPlans.length === 0 ? (
          <div className="rounded-3xl bg-card p-8 md:p-12 text-center ring-1 ring-line">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand/10 text-brand">
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
              <Button onClick={() => nav("/plan/new")} className="h-11 rounded-full px-6">
                <Plus size={16} />
                <span>Create a plan</span>
              </Button>
              {tab !== "public" && (
                <Button variant="ghost" onClick={() => setTab("public")} className="h-11 rounded-full px-5 ring-1 ring-line">
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
