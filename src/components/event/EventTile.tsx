import { Link } from "wouter";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import { formatPlanDate, type HangoutPlan } from "@shared/plan";
import { cn } from "@/lib/cn";

export function EventTile({ plan }: { plan: HangoutPlan }) {
  const paid = Boolean(plan.isExperience && (plan.pricePerPerson || 0) > 0);
  const price =
    plan.pricingModel === "free" || !plan.pricePerPerson
      ? "Free"
      : `$${Number(plan.pricePerPerson).toFixed(plan.pricePerPerson % 1 ? 2 : 0)}`;

  return (
    <Link
      href={`/plan/${plan.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-card text-left ring-1 ring-line shadow-xs transition hover:-translate-y-0.5 hover:ring-brand/30"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-paper">
        {plan.heroImage ? (
          <img
            src={plan.heroImage}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center bg-brand/10 text-brand">
            <span className="font-display text-3xl font-bold">{plan.title[0]}</span>
          </div>
        )}
        <span
          className={cn(
            "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-bold",
            paid ? "bg-amber-400 text-slate-950" : "bg-white text-ink",
          )}
        >
          {paid ? (
            <span className="inline-flex items-center gap-1">
              <Ticket size={11} /> {price}
            </span>
          ) : (
            "Free"
          )}
        </span>
      </div>
      <div className="p-3">
        <p className="font-display text-[15px] font-bold leading-tight line-clamp-2">{plan.title}</p>
        <p className="mt-1 flex items-center gap-1 text-[12px] text-mute">
          <CalendarDays size={12} /> {formatPlanDate(plan.date, plan.time)}
        </p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-mute">
          <MapPin size={12} /> {plan.destination}
        </p>
      </div>
    </Link>
  );
}
