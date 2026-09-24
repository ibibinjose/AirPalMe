import { CalendarDays } from "lucide-react";
import { ItineraryPreview } from "@/components/plan/ItineraryPreview";
import { scheduleDays, type HangoutPlan } from "@shared/plan";

/**
 * D4 — trip orchestration view over the existing network: the host's
 * multi-day schedule rendered as day groups. No new engine, no new route —
 * the same stops, attendees, and discussions underneath.
 */
export function TripItinerary({ plan }: { plan: HangoutPlan }) {
  const days = scheduleDays(plan.multiDaySchedule);
  if (days.length === 0) return null;
  return (
    <section className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs" aria-label="Trip itinerary">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20">
          <CalendarDays size={17} />
        </span>
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Trip itinerary</h2>
          <p className="text-xs text-mute">
            {days.length} day{days.length === 1 ? "" : "s"} · stays, experiences, and mates in one plan
          </p>
        </div>
      </div>
      <ol className="mt-4 space-y-3">
        {days.map((d) => (
          <li key={d.dayNumber} className="rounded-2xl bg-paper p-4 ring-1 ring-line/60">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold">
              Day {d.dayNumber}
              {d.date ? ` · ${d.date}` : ""}
            </p>
            <p className="font-display mt-0.5 text-[17px] font-semibold">{d.title}</p>
            {d.description && <p className="mt-0.5 text-[13px] text-mute">{d.description}</p>}
            <div className="mt-2">
              <ItineraryPreview stops={d.stops} caption={`Day ${d.dayNumber} stops`} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
