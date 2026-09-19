import { useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CalendarDays,
  Download,
  Sun,
  Sunset,
  Moon,
  Calendar as CalendarIcon,
} from "lucide-react";
import type { CalendarEvent } from "@shared/event";
import { toDateStr, formatRelativeBadge } from "@/lib/calendar-utils";
import { downloadMultipleIcs } from "@/lib/calendar-export";
import { useCalendarDrag } from "./CalendarDragContext";
import { CalendarEventCard } from "./CalendarEventCard";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/native";
import { track } from "@/lib/analytics";
import { toast } from "sonner";

interface CalendarDayViewProps {
  currentDate: Date;
  onChangeDate: (date: Date) => void;
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
  onSelectTag?: (tag: string) => void;
}

export function CalendarDayView({
  currentDate,
  onChangeDate,
  events,
  onSelectEvent,
  onSelectTag,
}: CalendarDayViewProps) {
  const { dragOverDate, dragCollision, setDragOverDate, dropOnDate } = useCalendarDrag();

  const currentDateStr = toDateStr(currentDate);
  const relativeBadge = formatRelativeBadge(currentDateStr);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(currentDate);
  }, [currentDate]);

  // Day navigation
  const prevDay = useCallback(() => {
    void triggerHaptic("light");
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    onChangeDate(prev);
    void track("calendar_date_select", { date: toDateStr(prev), source: "day_nav_prev" });
  }, [currentDate, onChangeDate]);

  const nextDay = useCallback(() => {
    void triggerHaptic("light");
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    onChangeDate(next);
    void track("calendar_date_select", { date: toDateStr(next), source: "day_nav_next" });
  }, [currentDate, onChangeDate]);

  const jumpToday = useCallback(() => {
    void triggerHaptic("medium");
    const today = new Date();
    onChangeDate(today);
    void track("calendar_jump_today", { date: toDateStr(today) });
  }, [onChangeDate]);

  // Quick 7-day mini-strip (centered on current day: -3 to +3)
  const miniStripDays = useMemo(() => {
    const list = [];
    const todayStr = toDateStr(new Date());
    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + offset);
      const dStr = toDateStr(d);
      const dayCount = events.filter((e) => e.date === dStr).length;
      list.push({
        date: d,
        dateStr: dStr,
        dayName: new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(d),
        dayNum: d.getDate(),
        isCurrent: dStr === currentDateStr,
        isToday: dStr === todayStr,
        count: dayCount,
      });
    }
    return list;
  }, [currentDate, currentDateStr, events]);

  // Events on this active day
  const dayEvents = useMemo(() => {
    return events.filter((e) => e.date === currentDateStr).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [events, currentDateStr]);

  // Group events by time of day
  const timeBuckets = useMemo(() => {
    const morning: CalendarEvent[] = [];
    const afternoon: CalendarEvent[] = [];
    const evening: CalendarEvent[] = [];

    for (const ev of dayEvents) {
      const match = ev.startsAt.match(/T(\d{2}):/);
      const hour = match ? parseInt(match[1], 10) : 12;
      if (hour < 12) {
        morning.push(ev);
      } else if (hour < 17) {
        afternoon.push(ev);
      } else {
        evening.push(ev);
      }
    }

    return [
      {
        id: "morning",
        label: "Morning",
        sublabel: "Before 12:00 PM",
        icon: Sun,
        items: morning,
        iconColor: "text-amber-500",
      },
      {
        id: "afternoon",
        label: "Afternoon",
        sublabel: "12:00 PM – 5:00 PM",
        icon: Sunset,
        items: afternoon,
        iconColor: "text-orange-500",
      },
      {
        id: "evening",
        label: "Evening & Night",
        sublabel: "After 5:00 PM",
        icon: Moon,
        items: evening,
        iconColor: "text-indigo-400",
      },
    ];
  }, [dayEvents]);

  const handleExportDay = () => {
    if (dayEvents.length === 0) return;
    downloadMultipleIcs(dayEvents, `sydney-day-${currentDateStr}.ics`);
    toast.success(`Exported ${dayEvents.length} events for ${formattedDate}!`);
  };

  const isOver = dragOverDate === currentDateStr;
  const hasConflict = isOver && dragCollision?.hasCollision;

  return (
    <div className="space-y-6">
      {/* Day Header Card */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          if (dragOverDate !== currentDateStr) {
            setDragOverDate(currentDateStr);
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          if (dragOverDate === currentDateStr) {
            setDragOverDate(null);
          }
        }}
        onDrop={async (e) => {
          e.preventDefault();
          void triggerHaptic("medium");
          await dropOnDate(currentDateStr);
        }}
        className={cn(
          "rounded-3xl bg-card p-4 ring-1 ring-line/80 shadow-sm transition-all duration-200 md:p-6",
          isOver &&
            (hasConflict
              ? "bg-amber-100/90 ring-2 ring-amber-500 scale-[1.01]"
              : "bg-brand/10 ring-2 ring-brand scale-[1.01]"),
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-line/60">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-semibold text-ink md:text-2xl" id="calendar-day-label">
                {formattedDate}
              </h2>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-bold ring-1",
                  relativeBadge.highlight ? "bg-amber-500 text-white ring-amber-600" : "bg-paper text-ink ring-line/80",
                )}
              >
                {relativeBadge.label}
              </span>
              {dayEvents.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-ink ring-1 ring-line/70">
                  <Sparkles size={11} className="text-gold" />
                  <span>{dayEvents.length} events</span>
                </span>
              )}
            </div>
            <p className="text-xs text-mute mt-1">Detailed daily agenda • Drop dragged events here to reschedule</p>
          </div>

          <div className="flex items-center gap-2">
            {dayEvents.length > 0 && (
              <button
                type="button"
                onClick={handleExportDay}
                className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-xs font-medium text-ink ring-1 ring-line/70 hover:bg-line transition active:scale-95 cursor-pointer"
              >
                <Download size={13} className="text-mute" />
                <span>Export (.ics)</span>
              </button>
            )}

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={jumpToday}
                className="rounded-full bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:bg-line transition ring-1 ring-line/60 active:scale-95 cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={prevDay}
                aria-label="Previous day"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-paper text-ink hover:bg-line transition ring-1 ring-line/60 active:scale-95 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={nextDay}
                aria-label="Next day"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-paper text-ink hover:bg-line transition ring-1 ring-line/60 active:scale-95 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* 7-Day Mini Horizontal Navigator */}
        <div className="flex items-center justify-between gap-1.5 pt-3 overflow-x-auto no-scrollbar">
          {miniStripDays.map((m) => (
            <button
              key={m.dateStr}
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                onChangeDate(m.date);
              }}
              className={cn(
                "flex-1 min-w-[42px] flex flex-col items-center py-2 px-1 rounded-xl transition cursor-pointer active:scale-95",
                m.isCurrent
                  ? "bg-brand text-white shadow-xs"
                  : m.isToday
                    ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300"
                    : "hover:bg-paper text-mute hover:text-ink",
              )}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider">{m.dayName}</span>
              <span className="text-sm font-bold mt-0.5">{m.dayNum}</span>
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full mt-1",
                  m.count > 0 ? (m.isCurrent ? "bg-gold" : "bg-brand") : "opacity-0",
                )}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Events Breakdown by Time of Day */}
      {dayEvents.length > 0 ? (
        <div className="space-y-8">
          {timeBuckets.map((bucket) => {
            if (bucket.items.length === 0) return null;
            const Icon = bucket.icon;

            return (
              <section key={bucket.id} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-line/60 pb-2">
                  <Icon size={16} className={bucket.iconColor} />
                  <h3 className="font-display text-base font-bold text-ink">{bucket.label}</h3>
                  <span className="text-xs text-mute font-medium">({bucket.sublabel})</span>
                  <span className="ml-auto rounded-full bg-paper px-2 py-0.5 text-[11px] font-bold text-ink ring-1 ring-line/70">
                    {bucket.items.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {bucket.items.map((event) => (
                    <CalendarEventCard
                      key={event.id}
                      event={event}
                      onSelect={onSelectEvent}
                      onSelectTag={onSelectTag}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        /* Empty Day State */
        <div className="rounded-3xl bg-card p-10 text-center ring-1 ring-line/80">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-paper text-mute ring-1 ring-line">
            <CalendarIcon size={26} />
          </div>
          <h3 className="font-display text-lg font-bold text-ink">No events scheduled for this day</h3>
          <p className="mt-1 text-xs text-mute max-w-sm mx-auto">
            There are no events matching your active filters on {formattedDate}. You can drag events from other views
            here or check surrounding dates.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={jumpToday}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-ink transition active:scale-95 cursor-pointer"
            >
              <CalendarDays size={13} />
              <span>Go to Today</span>
            </button>
            <button
              type="button"
              onClick={nextDay}
              className="inline-flex items-center gap-1.5 rounded-full bg-paper px-4 py-2 text-xs font-medium text-ink ring-1 ring-line hover:bg-line transition active:scale-95 cursor-pointer"
            >
              <span>Next Day</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
