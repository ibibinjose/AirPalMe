import { useMemo } from "react";
import { useLocation } from "wouter";
import { CalendarDays, MapPin, Plus, Sparkles, Users } from "lucide-react";
import { usePlans } from "@/contexts/PlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { ACTIVITY_INTERESTS, interestOverlap, myInterestProfile } from "@shared/plan";
import { cn } from "@/lib/cn";
import { useLocalNow } from "@/hooks/useLocalNow";

function anonId(): string | undefined {
  try {
    return localStorage.getItem("airpal.anon.id") || undefined;
  } catch {
    return undefined;
  }
}

function formatWhen(date: string, time: string): string {
  try {
    const d = new Date(`${date}T${time || "18:00"}:00`);
    return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return date;
  }
}

/**
 * Public activities near you, matches-first. Joining is one tap (RSVP Going);
 * the card opens the full plan for co-planning.
 */
export function LiveActivities({ city }: { city?: string }) {
  const [, nav] = useLocation();
  const { plans, rsvpPlan } = usePlans();
  const { user } = useAuth();
  const { today } = useLocalNow();
  const uid = user?.uid || anonId();

  const profile = useMemo(() => myInterestProfile(plans, uid), [plans, uid]);

  const feed = useMemo(() => {
    return plans
      .filter((p) => p.isPublic && p.status === "open" && p.date >= today && (!city || p.city === city))
      .map((p) => ({ plan: p, match: interestOverlap(profile, p.interests) }))
      .sort((a, b) => b.match - a.match || a.plan.datetime.localeCompare(b.plan.datetime))
      .slice(0, 6);
  }, [plans, profile, city, today]);

  if (feed.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between px-4 md:px-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Live near you</p>
          <h2 className="font-display text-xl font-semibold">Join an activity</h2>
        </div>
        <button type="button" onClick={() => nav("/plan/new")} className="inline-flex items-center gap-1 text-sm text-brand">
          <Plus size={14} />
          Create
        </button>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1 md:px-6">
        {feed.map(({ plan, match }) => {
          const going = plan.attendees.some((a) => a.status === "going" && uid && a.id === uid);
          const goingCount = plan.attendees.filter((a) => a.status === "going").length;
          return (
            <article
              key={plan.id}
              className={cn(
                "w-64 shrink-0 rounded-3xl bg-card p-4 ring-1 ring-line transition active:scale-[0.99]",
                plan.isExperience && "ring-amber-500/30",
              )}
            >
              <button type="button" onClick={() => nav(`/plan/${plan.id}`)} className="block w-full text-left">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {match > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                      <Sparkles size={11} />
                      Matches you
                    </span>
                  )}
                  {plan.isExperience && (
                    <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30">
                      ${plan.pricePerPerson || 0} {plan.pricingModel === "deposit" && plan.depositConfig ? `($${plan.depositConfig.depositAmount} dep)` : ""}
                    </span>
                  )}
                </div>
                <p className="font-display mt-1.5 text-[16px] font-semibold leading-snug">{plan.title}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-mute">
                  <CalendarDays size={12} />
                  {formatWhen(plan.date, plan.time)}
                  <span aria-hidden>·</span>
                  <Users size={12} />
                  {goingCount} in
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-mute">
                  <MapPin size={12} className="shrink-0" />
                  <span className="truncate">{plan.destination || plan.city}</span>
                </p>
                {plan.interests && plan.interests.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {plan.interests.slice(0, 3).map((t) => (
                      <span key={t} className="rounded-full bg-paper px-2 py-0.5 text-[11px] text-mute ring-1 ring-line">
                        {ACTIVITY_INTERESTS.find((tag) => tag.id === t)?.label || t}
                      </span>
                    ))}
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (plan.isExperience || going) nav(`/plan/${plan.id}`);
                  else rsvpPlan(plan.id, "going");
                }}
                className={cn(
                  "mt-3 h-9 w-full rounded-full text-xs font-semibold transition active:scale-[0.99]",
                  going
                    ? "bg-paper text-ink ring-1 ring-line"
                    : plan.isExperience
                      ? "bg-amber-500 text-black font-bold hover:bg-amber-400"
                      : "bg-ink text-white hover:bg-ink/90",
                )}
              >
                {going ? "You're in · open plan" : plan.isExperience ? "View & Book Experience" : "Join in one tap"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
