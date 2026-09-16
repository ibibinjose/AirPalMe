import { Clock } from "lucide-react";
import { formatTime12h } from "@shared/plan";
import { getStopIconDef } from "./stopIcons";
import { cn } from "@/lib/cn";

/**
 * Read-only guest view of the itinerary schedule: icon-only stop tiles with
 * AM/PM times, as mates will see it. Used by preview mode on both the plan
 * detail page and the create page.
 */
export function ItineraryPreview({
  stops,
  caption = "Preview — how mates will see this schedule",
}: {
  stops: Array<{ id?: string; name: string; time?: string; icon?: string }>;
  caption?: string;
}) {
  if (stops.length === 0) {
    return (
      <p className="rounded-2xl bg-paper px-4 py-5 text-center text-xs text-mute ring-1 ring-line">
        No stops yet — the preview will appear here once stops are added.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-mute">{caption}</p>
      <ol className="space-y-2">
        {stops.map((stop, idx) => {
          const iconDef = getStopIconDef(stop.icon);
          const StopIcon = iconDef.icon;
          return (
            <li
              key={stop.id ?? `${stop.name}-${idx}`}
              className="flex items-center gap-3 rounded-2xl bg-paper px-3.5 py-2.5 ring-1 ring-line"
            >
              <span className="w-5 shrink-0 text-center text-[11px] font-bold tabular-nums text-mute">
                {idx + 1}
              </span>
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1",
                  iconDef.bgClass,
                  iconDef.colorClass,
                  iconDef.ringClass,
                )}
                title={iconDef.label}
                aria-label={iconDef.label}
              >
                <StopIcon size={18} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{stop.name}</span>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium tabular-nums text-mute">
                <Clock size={12} className="shrink-0" />
                {formatTime12h(stop.time) || "Time TBA"}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
