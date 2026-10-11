import { useState } from "react";
import { Clock, ChevronDown, Calendar } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { get7DayBreakdown, DayBreakdownItem } from "@/lib/trading-hours";
import { isOpenAt } from "@/lib/hours";
import { useLocalNow } from "@/hooks/useLocalNow";
import { cn } from "@/lib/cn";

export interface TradingHoursScheduleViewProps {
  hours?: string;
  placeName?: string;
  className?: string;
  variant?: "inline" | "badge" | "button" | "row";
}

export function TradingHoursScheduleView({
  hours,
  placeName = "Venue",
  className,
  variant = "badge",
}: TradingHoursScheduleViewProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const local = useLocalNow();

  if (!hours || !hours.trim()) return null;

  const weekdayIndex = local ? local.now.getDay() : new Date().getDay();
  const breakdown: DayBreakdownItem[] = get7DayBreakdown(hours, weekdayIndex);
  const todayItem = breakdown.find((b) => b.isToday) || breakdown[0];

  const openStatus = local ? isOpenAt(hours, local.now, local.timeZone) : null;

  return (
    <>
      {variant === "row" && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={cn(
            "flex w-full items-center gap-3 p-4 text-left transition hover:bg-surface/50 active:scale-[0.99]",
            className,
          )}
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent">
            <Clock size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-medium text-ink">{hours}</span>
              {openStatus != null && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    openStatus ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600",
                  )}
                >
                  {openStatus ? "Open" : "Closed"}
                </span>
              )}
            </div>
            <p className="text-xs text-mute mt-0.5">Tap to view full 7-day schedule</p>
          </div>
          <ChevronDown size={18} className="shrink-0 text-mute" />
        </button>
      )}

      {variant === "badge" && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={cn(
            "group inline-flex items-center gap-1.5 rounded-full bg-paper/80 backdrop-blur-xs px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-line/60 hover:ring-brand/40 transition shadow-xs",
            className,
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              openStatus === true ? "bg-emerald-500 animate-pulse" : openStatus === false ? "bg-rose-500" : "bg-gold",
            )}
          />
          <span>{hours}</span>
          <ChevronDown
            size={12}
            className="text-mute group-hover:text-accent transition-transform group-hover:translate-y-0.5"
          />
        </button>
      )}

      {variant === "button" && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline",
            className,
          )}
        >
          <Calendar size={13} />
          <span>View 7-day hours</span>
        </button>
      )}

      {variant === "inline" && (
        <div className={cn("space-y-2 rounded-2xl border border-line bg-card p-3.5", className)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-mute">
              <Clock size={13} className="text-accent" />
              <span>Trading Hours (7 Days)</span>
            </div>
            {openStatus != null && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  openStatus ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600",
                )}
              >
                {openStatus ? "Open Now" : "Closed"}
              </span>
            )}
          </div>

          <div className="grid gap-1.5 text-xs">
            {breakdown.map((item) => (
              <div
                key={item.dayKey}
                className={cn(
                  "flex items-center justify-between rounded-xl px-2.5 py-1.5 transition",
                  item.isToday ? "bg-brand/10 font-bold text-accent ring-1 ring-brand/20" : "text-ink",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span>{item.dayName}</span>
                  {item.isToday && (
                    <span className="rounded-md bg-brand text-[10px] font-bold text-white px-1.5 py-0.2">Today</span>
                  )}
                </div>
                <span className={cn(item.status === "closed" ? "text-mute font-normal" : "font-semibold")}>
                  {item.hoursText}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-Day Hours Sheet */}
      {sheetOpen && (
        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title={`Trading Hours · ${placeName}`}
          className="sm:max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl bg-brand/[0.04] p-3 border border-brand/20">
              <div>
                <p className="text-xs font-bold text-accent uppercase tracking-wider">Today ({todayItem.dayName})</p>
                <p className="text-sm font-semibold text-ink">{todayItem.hoursText}</p>
              </div>
              {openStatus != null && (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-bold",
                    openStatus
                      ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/30"
                      : "bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/30",
                  )}
                >
                  {openStatus ? "Open Now" : "Closed"}
                </span>
              )}
            </div>

            {/* 7-Day Table */}
            <div className="divide-y divide-line/60 rounded-2xl border border-line bg-card overflow-hidden">
              {breakdown.map((item) => (
                <div
                  key={item.dayKey}
                  className={cn(
                    "flex items-center justify-between p-3 text-xs transition",
                    item.isToday ? "bg-brand/10 font-bold text-accent" : "hover:bg-surface/50 text-ink",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold w-24">{item.dayName}</span>
                    {item.isToday && (
                      <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">Today</span>
                    )}
                  </div>
                  <span className={cn(item.status === "closed" ? "text-mute font-normal" : "font-semibold text-right")}>
                    {item.hoursText}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-center text-[11px] text-mute">
              Trading hours may vary on public holidays and special events.
            </p>
          </div>
        </Sheet>
      )}
    </>
  );
}
