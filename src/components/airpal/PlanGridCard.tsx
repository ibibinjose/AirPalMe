import { Link } from "wouter";
import { Ticket } from "lucide-react";
import { formatPlanDate, type HangoutPlan } from "@shared/plan";
import { Photo } from "@/components/ui/Photo";
import { cn } from "@/lib/cn";

function countdown(date: string, time: string): string {
  try {
    const target = new Date(`${date}T${time}:00`);
    if (Number.isNaN(target.getTime())) return "";
    const diffDays = Math.floor((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `In ${diffDays} days`;
  } catch {
    return "";
  }
}

/**
 * Compact 2-column plan card: square rounded image, text below, one meta
 * line. Used across the rebuilt Plans hub (Upcoming / Discover / Past).
 */
export function PlanGridCard({ plan, dimmed = false }: { plan: HangoutPlan; dimmed?: boolean }) {
  const paid = Boolean(plan.isExperience && (plan.pricePerPerson || 0) > 0);
  const price = !plan.pricePerPerson
    ? "Free"
    : `$${Number(plan.pricePerPerson).toFixed(plan.pricePerPerson % 1 ? 2 : 0)}`;
  const when = countdown(plan.date, plan.time);
  const going = plan.attendees?.filter((a) => a.status === "going").length || 0;

  return (
    <Link
      href={`/plan/${plan.id}`}
      aria-label={plan.title}
      className={cn(
        "group block text-left transition active:scale-[0.98]",
        dimmed && "opacity-80",
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-[20px] bg-paper shadow-[0_4px_16px_rgba(18,22,20,0.10)] ring-1 ring-line">
        {plan.heroImage ? (
          <Photo
            src={plan.heroImage}
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-ink">
            <span className="font-display text-4xl font-bold text-white/90">
              {plan.title.trim()[0]?.toUpperCase() || "•"}
            </span>
          </div>
        )}
        <div className="hero-scrim absolute inset-0 opacity-80" />
        <span
          className={cn(
            "absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold shadow-sm",
            paid ? "bg-amber-400 text-slate-950" : "bg-white/95 text-ink",
          )}
        >
          {paid && <Ticket size={10} aria-hidden />}
          {price}
        </span>
        {when && !dimmed && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
            {when}
          </span>
        )}
      </div>
      <div className="px-1 pt-2">
        <p className="font-display truncate text-[15px] font-semibold leading-tight">{plan.title}</p>
        <p className="mt-0.5 truncate text-[12px] text-mute">
          {formatPlanDate(plan.date, plan.time)}
          {going > 0 ? ` · ${going} going` : ""}
        </p>
      </div>
    </Link>
  );
}
