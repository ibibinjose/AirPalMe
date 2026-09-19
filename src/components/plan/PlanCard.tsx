import { useMemo } from "react";
import { Link } from "wouter";
import { Calendar, MapPin, Sparkles, Lock, Radar, CreditCard } from "lucide-react";
import {
  type HangoutPlan,
  PLAN_THEMES,
  PLAN_TYPES,
  EXPERIENCE_CATEGORIES,
  formatPlanDate,
  isTicketed,
} from "@shared/plan";
import { PLAN_TYPE_ICONS } from "./planTypeIcons";
import { cn } from "@/lib/cn";

export function PlanCard({ plan, userAttendeeId }: { plan: HangoutPlan; userAttendeeId?: string }) {
  const theme = PLAN_THEMES[plan.theme] || PLAN_THEMES.gold;
  const typeInfo = PLAN_TYPES[plan.type] || PLAN_TYPES.custom;
  const TypeIcon = PLAN_TYPE_ICONS[plan.type] || Sparkles;

  const goingAttendees = useMemo(() => plan.attendees.filter((a) => a.status === "going"), [plan.attendees]);

  const userRsvp = useMemo(() => {
    if (!userAttendeeId) return null;
    return plan.attendees.find((a) => a.id === userAttendeeId)?.status;
  }, [plan.attendees, userAttendeeId]);

  const countdown = useMemo(() => {
    try {
      const target = new Date(`${plan.date}T${plan.time}:00`);
      if (Number.isNaN(target.getTime())) return "";
      const now = new Date();
      const diffMs = target.getTime() - now.getTime();
      if (diffMs <= 0) return "Happening Now";
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 0) return `Today at ${plan.time}`;
      if (diffDays === 1) return `Tomorrow at ${plan.time}`;
      return `In ${diffDays} days`;
    } catch {
      return "";
    }
  }, [plan.date, plan.time]);

  const spotsLeft = useMemo(() => {
    if (!plan.capacity) return undefined;
    return Math.max(0, plan.capacity - goingAttendees.length);
  }, [plan.capacity, goingAttendees.length]);

  return (
    <Link
      href={`/plan/${plan.id}`}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-[28px] bg-card p-5 ring-1 ring-line shadow-xs transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-md hover:ring-brand/30 active:scale-[0.99]",
        plan.isExperience && "ring-amber-200 hover:ring-amber-300",
      )}
    >
      {/* Top Background Gradient Tint */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full opacity-15 blur-2xl transition-opacity group-hover:opacity-25"
        style={{ background: plan.isExperience ? "#f59e0b" : theme.accentColor }}
      />

      <div>
        {/* Cover Photo Header if available */}
        {plan.heroImage && (
          <div className="relative -mx-5 -mt-5 mb-4 h-36 w-[calc(100%+2.5rem)] overflow-hidden">
            <img
              src={plan.heroImage}
              alt={plan.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-black/30 to-transparent" />
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-md ring-1 ring-white/20">
                {plan.isExperience ? (
                  <>
                    <span>
                      {plan.experienceCategory ? EXPERIENCE_CATEGORIES[plan.experienceCategory]?.emoji : "✨"}
                    </span>
                    <span>
                      {plan.experienceCategory ? EXPERIENCE_CATEGORIES[plan.experienceCategory]?.label : "Experience"}
                    </span>
                  </>
                ) : (
                  <>
                    <TypeIcon size={12} />
                    <span>{typeInfo.label}</span>
                  </>
                )}
              </span>
              {countdown && (
                <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md ring-1 ring-white/20">
                  {countdown}
                </span>
              )}
            </div>

            {/* Experience Pricing Ribbon */}
            {plan.isExperience && (
              <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5">
                <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-black text-black shadow-md">
                  {isTicketed(plan) ? `$${plan.pricePerPerson} ticket` : "Free"}
                </span>
                {plan.pricingModel === "deposit" && plan.depositConfig && (
                  <span className="rounded-full bg-black/70 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-400/40">
                    ${plan.depositConfig.depositAmount} Deposit
                  </span>
                )}
                {plan.durationMode === "multi_day" && (
                  <span className="rounded-full bg-black/70 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-white/90 ring-1 ring-white/20">
                    Retreat
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {!plan.heroImage && (
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink ring-1 ring-line">
              {plan.isExperience ? (
                <>
                  <span>{plan.experienceCategory ? EXPERIENCE_CATEGORIES[plan.experienceCategory]?.emoji : "✨"}</span>
                  <span>
                    {plan.experienceCategory ? EXPERIENCE_CATEGORIES[plan.experienceCategory]?.label : "Experience"}
                  </span>
                </>
              ) : (
                <>
                  <TypeIcon size={12} className="text-gold" />
                  <span>{typeInfo.label}</span>
                </>
              )}
            </span>

            {plan.isExperience ? (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30">
                {isTicketed(plan) ? `$${plan.pricePerPerson}` : "Free"}
              </span>
            ) : countdown ? (
              <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">
                {countdown}
              </span>
            ) : null}
          </div>
        )}

        {/* Title and Host */}
        <p className="text-[11px] font-medium text-mute uppercase tracking-wider">Hosted by {plan.creator.name}</p>
        <h3 className="font-display mt-0.5 text-lg font-bold text-ink group-hover:text-brand transition-colors line-clamp-2">
          {plan.title}
        </h3>

        {plan.notes && <p className="mt-1.5 text-xs text-mute line-clamp-2 leading-relaxed">{plan.notes}</p>}

        {/* Date & Destination */}
        <div className="mt-4 space-y-1.5 border-t border-line/60 pt-3">
          <div className="flex items-center gap-2 text-xs font-medium text-ink/90">
            <Calendar size={13} className="shrink-0 text-brand" />
            <span className="truncate">{formatPlanDate(plan.date, plan.time)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-mute">
            <MapPin size={13} className="shrink-0 text-gold" />
            <span className="truncate">{plan.destination || plan.city}</span>
          </div>
        </div>
      </div>

      {/* Footer: Attendees, Spots Left & Status */}
      <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-3">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {plan.attendees.slice(0, 3).map((att) => (
              <span
                key={att.id}
                className="grid h-7 w-7 place-items-center rounded-full bg-paper text-[10px] font-bold text-ink ring-2 ring-card shadow-xs uppercase"
                title={`${att.name} (${att.status})`}
              >
                {att.name.charAt(0)}
              </span>
            ))}
          </div>
          <span className="text-xs font-semibold text-ink">{goingAttendees.length} going</span>
          {spotsLeft !== undefined && (
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">· {spotsLeft} left</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {userRsvp === "going" && (
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30 uppercase">
              You're In
            </span>
          )}
          {userRsvp === "maybe" && (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30 uppercase">
              Maybe
            </span>
          )}
          {plan.isExperience && (
            <span title="Bookable Paid Experience" className="text-amber-500">
              <CreditCard size={14} />
            </span>
          )}
          {plan.isPublic ? (
            <span title="Public Hangout" className="text-mute hover:text-brand">
              <Radar size={14} />
            </span>
          ) : (
            <span title="Private Invite-Only" className="text-mute">
              <Lock size={13} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
