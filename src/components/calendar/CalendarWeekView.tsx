import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Sparkles, GripVertical, Clock, MapPin, Tag, Download } from "lucide-react";
import type { CalendarEvent } from "@shared/event";
import {
  getWeekDays,
  toDateStr,
  formatTime,
  getEventSlotTagTheme,
  type CalendarTagMode,
  formatRelativeBadge,
} from "@/lib/calendar-utils";
import { downloadMultipleIcs } from "@/lib/calendar-export";
import { useCalendarDrag } from "./CalendarDragContext";
import { CalendarEventCard } from "./CalendarEventCard";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/native";
import { track } from "@/lib/analytics";
import { toast } from "sonner";

interface CalendarWeekViewProps {
  currentDate: Date;
  onChangeDate: (date: Date) => void;
  selectedDate?: string;
  onSelectDate: (dateStr?: string) => void;
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
  onSelectTag?: (tag: string) => void;
}

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarWeekView({
  currentDate,
  onChangeDate,
  selectedDate,
  onSelectDate,
  events,
  onSelectEvent,
  onSelectTag,
}: CalendarWeekViewProps) {
  const [tagMode, setTagMode] = useState<CalendarTagMode>("category");
  const { draggedEvent, dragOverDate, dragCollision, startDrag, endDrag, setDragOverDate, dropOnDate } =
    useCalendarDrag();

  // Get the 7 days of the active week
  const weekDays = useMemo(() => {
    return getWeekDays(currentDate, events);
  }, [currentDate, events]);

  // Week range label (e.g., "7 Sep – 13 Sep 2026")
  const weekLabel = useMemo(() => {
    if (weekDays.length === 0) return "";
    const first = weekDays[0].date;
    const last = weekDays[6].date;
    const sameMonth = first.getMonth() === last.getMonth();
    const sameYear = first.getFullYear() === last.getFullYear();

    const startStr = new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: sameMonth ? undefined : "short",
    }).format(first);

    const endStr = new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      year: sameYear ? undefined : "numeric",
    }).format(last);

    const yearStr = new Intl.DateTimeFormat(undefined, { year: "numeric" }).format(last);

    return `${startStr} – ${endStr}, ${yearStr}`;
  }, [weekDays]);

  const totalWeekEvents = useMemo(() => {
    return weekDays.reduce((acc, d) => acc + d.events.length, 0);
  }, [weekDays]);

  // Navigate weeks
  const prevWeek = useCallback(() => {
    void triggerHaptic("light");
    const next = new Date(currentDate);
    next.setDate(next.getDate() - 7);
    onChangeDate(next);
    void track("calendar_date_select", { date: toDateStr(next), action: "week_nav_prev" });
  }, [currentDate, onChangeDate]);

  const nextWeek = useCallback(() => {
    void triggerHaptic("light");
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    onChangeDate(next);
    void track("calendar_date_select", { date: toDateStr(next), action: "week_nav_next" });
  }, [currentDate, onChangeDate]);

  const jumpToday = useCallback(() => {
    void triggerHaptic("medium");
    const today = new Date();
    onChangeDate(today);
    onSelectDate(toDateStr(today));
    void track("calendar_jump_today", { date: toDateStr(today) });
  }, [onChangeDate, onSelectDate]);

  // Filter events for the selected day if any, or all week's events
  const activeDisplayEvents = useMemo(() => {
    if (selectedDate) {
      const match = weekDays.find((d) => d.dateStr === selectedDate);
      return match ? match.events : [];
    }
    // All week events sorted by time
    const allWeek = weekDays.flatMap((d) => d.events);
    return allWeek.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [weekDays, selectedDate]);

  const handleExportWeek = () => {
    const allWeek = weekDays.flatMap((d) => d.events);
    if (allWeek.length === 0) return;
    downloadMultipleIcs(allWeek, `sydney-week-events-${Date.now().toString().slice(-4)}.ics`);
    toast.success(`Exported ${allWeek.length} events for the week!`);
  };

  return (
    <div className="space-y-6">
      {/* Week Navigation Header Card */}
      <div className="rounded-3xl bg-card p-4 ring-1 ring-line/80 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-semibold text-ink md:text-2xl" id="calendar-week-label">
                {weekLabel}
              </h2>
              {totalWeekEvents > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-ink ring-1 ring-line/70">
                  <Sparkles size={11} className="text-gold" />
                  <span>{totalWeekEvents} events</span>
                </span>
              )}
            </div>
            <p className="text-xs text-mute mt-0.5">Week view • Drag events across columns or click a day to inspect</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tag coloring mode */}
            <div
              className="inline-flex items-center gap-1 rounded-full bg-paper p-1 ring-1 ring-line/70 shadow-2xs"
              role="radiogroup"
              aria-label="Color tag mode"
            >
              <Tag size={12} className="text-brand ml-1.5 hidden sm:inline" aria-hidden="true" />
              <button
                type="button"
                role="radio"
                aria-checked={tagMode === "category"}
                onClick={() => setTagMode("category")}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 cursor-pointer",
                  tagMode === "category" ? "bg-brand text-white shadow-2xs" : "text-mute hover:text-ink",
                )}
              >
                <span>By Type</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={tagMode === "booking"}
                onClick={() => setTagMode("booking")}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 cursor-pointer",
                  tagMode === "booking" ? "bg-brand text-white shadow-2xs" : "text-mute hover:text-ink",
                )}
              >
                <span>By Booking</span>
              </button>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={jumpToday}
                aria-label="Jump to today"
                className="rounded-full bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:bg-line transition ring-1 ring-line/60 active:scale-95 min-h-[36px] cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={prevWeek}
                aria-label="Previous week"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-paper text-ink hover:bg-line transition ring-1 ring-line/60 active:scale-95 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={nextWeek}
                aria-label="Next week"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-paper text-ink hover:bg-line transition ring-1 ring-line/60 active:scale-95 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* 7-Day Columns Grid */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 pt-2">
          {weekDays.map((day, idx) => {
            const isSelected = selectedDate === day.dateStr;
            const isOver = dragOverDate === day.dateStr;
            const hasConflict = isOver && dragCollision?.hasCollision;

            return (
              <div
                key={day.dateStr}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverDate !== day.dateStr) {
                    setDragOverDate(day.dateStr);
                  }
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  if (dragOverDate === day.dateStr) {
                    setDragOverDate(null);
                  }
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  void triggerHaptic("medium");
                  await dropOnDate(day.dateStr);
                }}
                className={cn(
                  "group relative flex flex-col rounded-2xl p-2.5 transition-all duration-150 min-h-[180px]",
                  day.isToday ? "bg-amber-50/50 ring-1.5 ring-amber-300" : "bg-paper/80 ring-1 ring-line/60",
                  isSelected && "ring-2 ring-brand bg-card shadow-xs",
                  isOver &&
                    (hasConflict
                      ? "bg-amber-100/90 ring-2 ring-amber-500 scale-[1.02]"
                      : "bg-brand/15 ring-2 ring-brand scale-[1.02]"),
                )}
              >
                {/* Day Header Button */}
                <button
                  type="button"
                  onClick={() => {
                    void triggerHaptic("light");
                    onSelectDate(isSelected ? undefined : day.dateStr);
                  }}
                  className="flex items-center justify-between pb-2 text-left cursor-pointer border-b border-line/50 mb-2"
                >
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-semibold text-mute">{WEEKDAY_NAMES[idx]}</span>
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition",
                        day.isToday
                          ? "bg-amber-500 text-white shadow-2xs"
                          : isSelected
                            ? "bg-brand text-white"
                            : "text-ink group-hover:bg-card",
                      )}
                    >
                      {day.dayNumber}
                    </span>
                  </div>

                  {day.events.length > 0 && (
                    <span className="rounded-full bg-card px-1.5 py-0.5 text-[10px] font-bold text-ink ring-1 ring-line/70">
                      {day.events.length}
                    </span>
                  )}
                </button>

                {/* Event Pills inside Day Column */}
                <div className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar max-h-56">
                  {day.events.map((ev) => {
                    const tagTheme = getEventSlotTagTheme(ev, tagMode);
                    const timeLabel = formatTime(ev.startsAt);
                    const isDraggingThis = draggedEvent?.id === ev.id;

                    return (
                      <div
                        key={ev.id}
                        draggable
                        onDragStart={(e) => startDrag(ev, e)}
                        onDragEnd={endDrag}
                        onClick={(e) => {
                          e.stopPropagation();
                          void triggerHaptic("light");
                          if (onSelectEvent) onSelectEvent(ev);
                        }}
                        className={cn(
                          "group/card relative rounded-xl p-2 text-left transition-all duration-150 cursor-pointer select-none",
                          tagTheme.tagClass,
                          isDraggingThis ? "opacity-30 scale-95" : "hover:shadow-xs hover:scale-[1.02]",
                        )}
                        title={`${ev.title} • ${timeLabel}`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold opacity-85">
                            <Clock size={10} />
                            <span>{timeLabel}</span>
                          </span>
                          <span
                            className={cn(
                              "inline-block rounded-full px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wide",
                              tagTheme.badgeClass,
                            )}
                          >
                            {tagTheme.shortTag}
                          </span>
                        </div>

                        <p className="line-clamp-2 text-xs font-bold leading-snug tracking-tight text-ink">
                          {ev.title}
                        </p>

                        <div className="mt-1 flex items-center justify-between text-[10px] opacity-75">
                          <span className="line-clamp-1 flex items-center gap-1">
                            <MapPin size={9} />
                            <span>{(ev.venue || "The Rocks").split(",")[0]}</span>
                          </span>
                          <span className="cursor-grab text-mute group-hover/card:text-ink">
                            <GripVertical size={11} />
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {day.events.length === 0 && (
                    <div className="flex h-24 flex-col items-center justify-center rounded-xl border border-dashed border-line/70 text-center p-2">
                      <span className="text-[11px] font-medium text-mute/80">No events</span>
                      <span className="text-[9px] text-mute/60">Drop to move</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day / Visible Week Events Detail Section */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-xl font-bold text-ink">
              {selectedDate ? `Events for ${formatRelativeBadge(selectedDate).label}` : "Schedule for This Week"}
            </h3>
            <p className="text-xs text-mute mt-0.5">
              {selectedDate
                ? `${activeDisplayEvents.length} event${activeDisplayEvents.length === 1 ? "" : "s"} scheduled on this date`
                : `${activeDisplayEvents.length} event${activeDisplayEvents.length === 1 ? "" : "s"} across the 7-day period`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedDate && (
              <button
                type="button"
                onClick={() => onSelectDate(undefined)}
                className="rounded-full bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:bg-line transition ring-1 ring-line/70 cursor-pointer"
              >
                View all 7 days
              </button>
            )}
            {activeDisplayEvents.length > 0 && (
              <button
                type="button"
                onClick={handleExportWeek}
                className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-ink ring-1 ring-line/80 hover:bg-paper transition active:scale-95 shadow-xs cursor-pointer"
              >
                <Download size={13} className="text-mute" />
                <span>Export Week (.ics)</span>
              </button>
            )}
          </div>
        </div>

        {/* Event Cards Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {activeDisplayEvents.map((event) => (
            <CalendarEventCard key={event.id} event={event} onSelect={onSelectEvent} onSelectTag={onSelectTag} />
          ))}
        </div>

        {activeDisplayEvents.length === 0 && (
          <div className="rounded-3xl bg-card p-8 text-center ring-1 ring-line/80">
            <p className="text-sm font-semibold text-ink">No events found for this selection</p>
            <p className="mt-1 text-xs text-mute">
              Try clicking another day above or resetting search filters in the sidebar.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
