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
      <div className="mb-4 flex items-end justify-between px-4 md:px-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-brand border border-brand/20">
            <Sparkles size={12} /> Live near you
          </span>
          <h2 className="font-display mt-1 text-2xl font-extrabold text-ink">Join an activity</h2>
        </div>
        <button
          type="button"
          onClick={() => nav("/plan/new")}
          className="inline-flex h-9 items-center gap-1.5 rounded-2xl bg-ink px-4 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
        >
          <Plus size={14} />
          <span>Create</span>
        </button>
      </div>
      <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
        {feed.map(({ plan, match }) => {
          const going = plan.attendees.some((a) => a.status === "going" && uid && a.id === uid);
          const goingCount = plan.attendees.filter((a) => a.status === "going").length;
          return (
            <article
              key={plan.id}
              className={cn(
                "w-72 shrink-0 rounded-3xl border-2 border-ink bg-card p-5 shadow-xs hover:-translate-y-0.5 transition flex flex-col justify-between",
                plan.isExperience && "border-brand/40 bg-brand/5",
              )}
            >
              <button type="button" onClick={() => nav(`/plan/${plan.id}`)} className="block w-full text-left">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {match > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-black text-white border border-brand-ink shadow-xs">
                      <Sparkles size={11} />
                      Matches you
                    </span>
                  )}
                  {plan.isExperience && (
                    <span className="inline-flex items-center rounded-full bg-slate-950 px-2.5 py-0.5 text-[10px] font-bold text-white border border-ink">
                      ${plan.pricePerPerson || 0} {plan.pricingModel === "deposit" && plan.depositConfig ? `($${plan.depositConfig.depositAmount} dep)` : ""}
                    </span>
                  )}
                </div>
                <h3 className="font-display mt-2 text-lg font-bold text-ink leading-snug line-clamp-2">{plan.title}</h3>
                <div className="mt-2 space-y-1 text-xs text-mute font-medium">
                  <p className="flex items-center gap-1.5">
                    <CalendarDays size={13} className="text-brand shrink-0" />
                    <span>{formatWhen(plan.date, plan.time)}</span>
                    <span aria-hidden>·</span>
                    <Users size={13} className="text-brand shrink-0" />
                    <span className="font-semibold text-ink">{goingCount} in</span>
                  </p>
                  <p className="flex items-center gap-1.5 truncate">
                    <MapPin size={13} className="shrink-0 text-brand" />
                    <span className="truncate">{plan.destination || plan.city}</span>
                  </p>
                </div>
                {plan.interests && plan.interests.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {plan.interests.slice(0, 3).map((t) => (
                      <span key={t} className="rounded-full bg-paper px-2.5 py-0.5 text-[11px] font-semibold text-ink border border-line">
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
                  "mt-4 h-10 w-full rounded-2xl text-xs font-black transition cursor-pointer shadow-xs border border-ink",
                  going
                    ? "bg-emerald-500/15 text-emerald-900 border-emerald-500/30"
                    : plan.isExperience
                      ? "bg-ink text-white hover:bg-slate-800"
                      : "bg-brand text-white hover:bg-brand-ink",
                )}
              >
                {going ? "You're in · open plan" : plan.isExperience ? "View & Book Experience" : "Join in one tap →"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
