import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Sparkles, GripVertical, AlertTriangle, Zap, Tag } from "lucide-react";
import type { CalendarEvent } from "@shared/event";
import {
  getMonthGrid,
  toDateStr,
  CATEGORY_THEMES,
  BOOKING_THEMES,
  getEventSlotTagTheme,
  type CalendarTagMode,
} from "@/lib/calendar-utils";
import { useCalendarDrag } from "./CalendarDragContext";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/native";
import { track } from "@/lib/analytics";

const WEEKDAYS = [
  { short: "Mon", full: "Monday", isWeekend: false, dayIndex: 1 },
  { short: "Tue", full: "Tuesday", isWeekend: false, dayIndex: 2 },
  { short: "Wed", full: "Wednesday", isWeekend: false, dayIndex: 3 },
  { short: "Thu", full: "Thursday", isWeekend: false, dayIndex: 4 },
  { short: "Fri", full: "Friday", isWeekend: false, dayIndex: 5 },
  { short: "Sat", full: "Saturday", isWeekend: true, dayIndex: 6 },
  { short: "Sun", full: "Sunday", isWeekend: true, dayIndex: 0 },
];

interface CalendarMonthGridProps {
  currentDate: Date;
  onChangeMonth: (date: Date) => void;
  selectedDate?: string;
  onSelectDate: (dateStr?: string) => void;
  events: CalendarEvent[];
  todayStr?: string;
  onRescheduleEvent?: (eventId: string, targetDateStr: string) => void;
}

export function CalendarMonthGrid({
  currentDate,
  onChangeMonth,
  selectedDate,
  onSelectDate,
  events,
  todayStr,
}: CalendarMonthGridProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const gridRef = useRef<HTMLDivElement>(null);
  const {
    draggedEvent,
    dragOverDate,
    dragCollision,
    isDragging,
    autoSnapOnCollision,
    setAutoSnapOnCollision,
    startDrag,
    endDrag,
    setDragOverDate,
    dropOnDate,
  } = useCalendarDrag();

  const [tagMode, setTagMode] = useState<CalendarTagMode>("category");

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" }).format(currentDate);
  }, [currentDate]);

  const cells = useMemo(() => {
    return getMonthGrid(year, month, events, todayStr);
  }, [year, month, events, todayStr]);

  const monthEventsCount = useMemo(() => {
    return cells.reduce((acc, c) => (c.isCurrentMonth ? acc + c.events.length : acc), 0);
  }, [cells]);

  const currentDayColIndex = useMemo(() => {
    const today = new Date();
    const day = today.getDay(); // 0 = Sun, 1 = Mon ...
    return (day + 6) % 7; // 0 = Mon, 5 = Sat, 6 = Sun
  }, []);

  const prevMonth = useCallback(() => {
    void triggerHaptic("light");
    onChangeMonth(new Date(year, month - 1, 1));
    void track("calendar_month_navigate", { direction: "previous", year, month: month - 1 });
  }, [year, month, onChangeMonth]);

  const nextMonth = useCallback(() => {
    void triggerHaptic("light");
    onChangeMonth(new Date(year, month + 1, 1));
    void track("calendar_month_navigate", { direction: "next", year, month: month + 1 });
  }, [year, month, onChangeMonth]);

  const jumpToday = useCallback(() => {
    void triggerHaptic("medium");
    const today = new Date();
    onChangeMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onSelectDate(toDateStr(today));
    void track("calendar_jump_today", { fromMonth: `${year}-${month}` });
  }, [year, month, onChangeMonth, onSelectDate]);

  const handleDateSelect = useCallback(
    (dateStr: string, isSelected: boolean) => {
      void triggerHaptic(isSelected ? "light" : "success");
      onSelectDate(isSelected ? undefined : dateStr);
      void track("calendar_date_select", { date: dateStr, action: isSelected ? "deselect" : "select" });
    },
    [onSelectDate],
  );

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gridRef.current?.contains(document.activeElement)) return;

      const currentIndex = cells.findIndex((c) => c.dateStr === selectedDate);
      if (currentIndex === -1) return;

      let newIndex = currentIndex;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          newIndex = Math.max(0, currentIndex - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          newIndex = Math.min(cells.length - 1, currentIndex + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          newIndex = Math.max(0, currentIndex - 7);
          break;
        case "ArrowDown":
          e.preventDefault();
          newIndex = Math.min(cells.length - 1, currentIndex + 7);
          break;
        default:
          return;
      }

      if (newIndex !== currentIndex) {
        onSelectDate(cells[newIndex]?.dateStr);
        void triggerHaptic("light");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cells, selectedDate, onSelectDate]);

  return (
    <div className="rounded-3xl bg-card p-4 ring-1 ring-line/80 shadow-sm md:p-6" ref={gridRef}>
      {/* Month Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-semibold text-ink md:text-2xl" id="calendar-month-label">
                {monthLabel}
              </h2>
              {monthEventsCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-ink ring-1 ring-line/70">
                  <Sparkles size={11} className="text-gold" />
                  <span>{monthEventsCount} events</span>
                </span>
              )}
            </div>
            <p className="text-xs text-mute mt-0.5">Tap any day or drag events to reschedule</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Color Tags Mode Selector */}
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
              onClick={() => {
                setTagMode("category");
                void triggerHaptic("light");
              }}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-95",
                tagMode === "category"
                  ? "bg-ink text-white shadow-2xs"
                  : "text-mute hover:text-ink",
              )}
              title="Color-code tags by event type (Market, Live Music, Food, Culture, Workshop, etc.)"
            >
              <span>By Type</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={tagMode === "booking"}
              onClick={() => {
                setTagMode("booking");
                void triggerHaptic("light");
              }}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-95",
                tagMode === "booking"
                  ? "bg-ink text-white shadow-2xs"
                  : "text-mute hover:text-ink",
              )}
              title="Color-code tags by booking / task status (Confirmed, Tentative, Rescheduled, Available)"
            >
              <span>By Booking</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={jumpToday}
              aria-label="Jump to today's date"
              className="rounded-full bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:bg-line transition ring-1 ring-line/60 active:scale-95 min-h-[36px]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-paper text-ink hover:bg-line transition ring-1 ring-line/60 active:scale-95"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-paper text-ink hover:bg-line transition ring-1 ring-line/60 active:scale-95"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Active Drag Helper Banner */}
      {isDragging && draggedEvent && (
        <div
          className={cn(
            "mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl px-4 py-2.5 shadow-md animate-fade-in text-xs transition-colors duration-200",
            dragOverDate && dragCollision?.hasCollision
              ? "bg-amber-600 text-white ring-2 ring-amber-700/50"
              : "bg-brand text-white ring-2 ring-brand-ink/20",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            {dragOverDate && dragCollision?.hasCollision ? (
              <AlertTriangle size={15} className="text-amber-200 shrink-0 animate-pulse" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-amber-300 animate-ping" />
            )}
            <div>
              <span>
                Rescheduling: <strong className="font-bold underline">{draggedEvent.title}</strong>
              </span>
              {dragOverDate && dragCollision?.hasCollision ? (
                <span className="ml-1 text-amber-100 block sm:inline">
                  ⚠️ <strong>Conflict on {dragOverDate}:</strong> {dragCollision.reason}.{" "}
                  {autoSnapOnCollision && dragCollision.nearestOpening ? (
                    <span className="font-semibold underline">
                      Will snap to nearest opening: {dragCollision.nearestOpening.dayBadge} ({dragCollision.nearestOpening.formattedDate})
                    </span>
                  ) : (
                    <span>Auto-snap disabled (will prompt).</span>
                  )}
                </span>
              ) : (
                <span className="text-white/85 hidden sm:inline ml-1">
                  (currently on {draggedEvent.date}) — Hover or drop on any date slot below
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={() => setAutoSnapOnCollision(!autoSnapOnCollision)}
              title="Toggle automatic snapping to nearest available open slot on collision"
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition active:scale-95",
                autoSnapOnCollision
                  ? "bg-white/25 text-white hover:bg-white/35"
                  : "bg-black/30 text-white/70 hover:text-white",
              )}
            >
              <Zap size={11} className={autoSnapOnCollision ? "text-amber-300" : "text-white/50"} />
              <span>Auto-Snap: {autoSnapOnCollision ? "ON" : "OFF"}</span>
            </button>
            <button
              type="button"
              onClick={endDrag}
              className="rounded-full bg-white/20 hover:bg-white/30 px-2.5 py-1 text-[11px] font-semibold text-white transition active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Weekday Column Headers Bar */}
      <div
        className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center pb-2 mb-1"
        role="row"
        aria-label="Weekday column headers"
      >
        {WEEKDAYS.map((day, idx) => {
          const isTodayCol = idx === currentDayColIndex;
          return (
            <div
              key={day.short}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 rounded-xl transition select-none",
                day.isWeekend
                  ? "bg-amber-500/10 text-amber-950 ring-1 ring-amber-300/60 font-semibold"
                  : "bg-paper/80 text-ink ring-1 ring-line/50",
                isTodayCol && "ring-1.5 ring-brand shadow-2xs",
              )}
              role="columnheader"
              aria-label={`${day.full}${day.isWeekend ? " (Weekend column)" : ""}${isTodayCol ? " (Today's column)" : ""}`}
            >
              <div className="flex items-center gap-1">
                <span className="font-bold text-[11px] sm:text-xs uppercase tracking-wider">
                  {day.short}
                </span>
                {isTodayCol && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse shrink-0"
                    title="Current day column"
                    aria-hidden="true"
                  />
                )}
              </div>
              <span className="hidden md:block text-[10px] text-mute font-medium leading-tight mt-0.5">
                {day.isWeekend ? (
                  <span className="font-semibold text-amber-800">Weekend</span>
                ) : (
                  day.full
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Calendar Grid Cells by Column */}
      <div
        className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-1"
        role="grid"
        aria-labelledby="calendar-month-label"
        aria-describedby="calendar-legend"
      >
        {cells.map((cell, idx) => {
          const colIndex = idx % 7;
          const isWeekendCol = colIndex >= 5;
          const isSelected = selectedDate === cell.dateStr;
          const hasEvents = cell.events.length > 0;
          const eventCount = cell.events.length;
          const isOver = dragOverDate === cell.dateStr;

          return (
            <button
              key={cell.dateStr}
              type="button"
              onClick={() => handleDateSelect(cell.dateStr, isSelected)}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "move";
                if (dragOverDate !== cell.dateStr) {
                  setDragOverDate(cell.dateStr);
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOverDate(cell.dateStr);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                if (dragOverDate === cell.dateStr) {
                  setDragOverDate(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void dropOnDate(cell.dateStr);
              }}
              role="gridcell"
              aria-label={`${cell.dayNumber} ${monthLabel}${hasEvents ? `, ${eventCount} event${eventCount > 1 ? "s" : ""}` : ""}${isOver ? ", Drop to reschedule here" : ""}`}
              aria-selected={isSelected}
              aria-current={cell.isToday ? "date" : undefined}
              tabIndex={isSelected || (!selectedDate && cell.isToday) ? 0 : -1}
              className={cn(
                "group relative flex min-h-[68px] sm:min-h-[84px] md:min-h-[102px] lg:min-h-[112px] flex-col justify-between rounded-2xl p-1.5 sm:p-2 transition-all text-xs select-none active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1 text-left",
                // Non-current month
                !cell.isCurrentMonth && "opacity-35 hover:opacity-60 bg-paper/20 ring-1 ring-line/40",
                // Current month default state
                cell.isCurrentMonth && !isSelected && !cell.isToday && (
                  isWeekendCol
                    ? "bg-amber-500/[0.04] text-ink ring-1 ring-amber-200/50 hover:bg-amber-100/50 hover:ring-amber-300/70"
                    : "bg-card text-ink ring-1 ring-line/80 hover:bg-paper/90 hover:ring-line"
                ),
                // Today styling
                cell.isToday && !isSelected && "bg-amber-50/90 text-ink ring-2 ring-amber-400 shadow-xs hover:bg-amber-100/80",
                // Selected styling
                isSelected && "bg-ink text-white shadow-md ring-2 ring-ink",
                // Active Dragging over this cell
                isDragging && !isOver && "ring-dashed ring-brand/35 hover:ring-brand/60",
                isOver && (
                  dragCollision?.hasCollision
                    ? "ring-2 ring-amber-500 bg-amber-500/20 scale-[1.03] shadow-lg z-20"
                    : "ring-2 ring-brand bg-brand/15 scale-[1.03] shadow-lg z-20"
                ),
              )}
            >
              {/* Drop Target Overlay when dragged over */}
              {isOver && (
                dragCollision?.hasCollision ? (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-amber-600/95 text-white p-1 shadow-lg pointer-events-none animate-in fade-in zoom-in-95 text-center">
                    <AlertTriangle size={15} className="text-amber-200 mb-0.5 animate-bounce" />
                    <span className="text-[10px] font-bold leading-tight line-clamp-1">
                      {dragCollision.isOverlapping ? "Time Overlap" : "Slot Full"}
                    </span>
                    <span className="text-[8px] text-amber-100 font-semibold mt-0.5 px-1 leading-tight">
                      {autoSnapOnCollision && dragCollision.nearestOpening
                        ? `Snaps to ${dragCollision.nearestOpening.dayBadge}`
                        : "Conflict detected"}
                    </span>
                  </div>
                ) : (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-brand text-white p-1 shadow-lg pointer-events-none animate-in fade-in zoom-in-95 text-center">
                    <Sparkles size={14} className="text-amber-300 animate-spin mb-0.5" />
                    <span className="text-[10px] font-bold leading-tight">Drop to Move</span>
                    <span className="text-[8px] text-white/85 font-medium">{cell.dayNumber} {monthLabel.split(" ")[0]} · Available</span>
                  </div>
                )
              )}

              {/* Day Number Header Row */}
              <div className="flex items-center justify-between w-full">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold leading-none transition",
                    isSelected
                      ? "bg-white text-ink font-bold shadow-xs"
                      : cell.isToday
                        ? "bg-amber-400 text-ink font-bold shadow-xs"
                        : cell.isCurrentMonth
                          ? "text-ink group-hover:bg-line/70"
                          : "text-mute/60",
                  )}
                >
                  {cell.dayNumber}
                </span>

                {/* Today Pill or Event Count Badge */}
                {cell.isToday && !isSelected ? (
                  <span className="hidden sm:inline-block rounded-full bg-amber-200/80 px-1.5 py-0.2 text-[9px] font-bold text-amber-900 uppercase tracking-tight">
                    Today
                  </span>
                ) : hasEvents ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums",
                      isSelected
                        ? "bg-white/20 text-white"
                        : cell.hasGoing
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-paper text-mute group-hover:text-ink ring-1 ring-line/50",
                    )}
                  >
                    {eventCount}
                  </span>
                ) : null}
              </div>

              {/* Day Cell Event Previews */}
              {hasEvents && (
                <div className="mt-1 w-full flex-1 flex flex-col justify-end">
                  {/* Desktop: Miniature Event Ribbons with Color-Coded Tags */}
                  <div className="hidden md:flex flex-col gap-1 w-full overflow-hidden">
                    {cell.events.slice(0, 2).map((ev) => {
                      const isThisDragged = draggedEvent?.id === ev.id;
                      const tagTheme = getEventSlotTagTheme(ev, tagMode);

                      return (
                        <div
                          key={ev.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            startDrag(ev, e);
                          }}
                          onDragEnd={() => {
                            endDrag();
                          }}
                          className={cn(
                            "group/event relative flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-tight truncate w-full transition cursor-grab active:cursor-grabbing hover:ring-1 hover:ring-brand shadow-2xs select-none",
                            isThisDragged && "opacity-40 ring-2 ring-brand ring-dashed",
                            isSelected
                              ? "bg-white/20 text-white border-l-2 border-l-white"
                              : tagTheme.tagClass,
                          )}
                          title={`${ev.title} · ${tagTheme.label} (${ev.timeLabel}) — Drag to reschedule`}
                        >
                          <GripVertical size={9} className="opacity-40 shrink-0 -ml-0.5 group-hover/event:opacity-90" aria-hidden="true" />
                          
                          {/* Color-coded Tag Label */}
                          <span
                            className={cn(
                              "shrink-0 rounded px-1 py-0.2 text-[8px] font-extrabold uppercase tracking-tight leading-none",
                              isSelected
                                ? "bg-white text-ink font-bold"
                                : "bg-white/80 text-ink/90 shadow-2xs ring-1 ring-black/10",
                            )}
                          >
                            {tagTheme.shortTag}
                          </span>

                          <span className="truncate font-semibold flex-1">{ev.title}</span>

                          {/* Secondary status indicator when in category mode */}
                          {tagMode === "category" && ev.isGoing && (
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 ring-1 ring-emerald-300"
                              title="Confirmed Booking"
                            />
                          )}
                          {tagMode === "category" && ev.isRescheduled && (
                            <span
                              className="text-[9px] font-bold text-orange-700 shrink-0"
                              title="Rescheduled"
                            >
                              ↺
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {cell.events.length > 2 && (
                      <div
                        className={cn(
                          "text-[9px] font-semibold px-1 tracking-tight leading-none pt-0.5",
                          isSelected ? "text-white/80" : "text-mute",
                        )}
                      >
                        +{cell.events.length - 2} more
                      </div>
                    )}
                  </div>

                  {/* Mobile: Compact Color-Coded Mini Tags */}
                  <div className="flex md:hidden flex-wrap items-center justify-center gap-0.5 pt-1">
                    {cell.events.slice(0, 2).map((ev) => {
                      const tagTheme = getEventSlotTagTheme(ev, tagMode);
                      return (
                        <span
                          key={ev.id}
                          title={`${ev.title} (${tagTheme.label})`}
                          className={cn(
                            "inline-flex items-center rounded-xs px-1 py-0.2 text-[7px] font-bold uppercase tracking-tight shadow-2xs",
                            isSelected ? "bg-white text-ink" : tagTheme.tagClass,
                          )}
                        >
                          {tagTheme.shortTag.slice(0, 3)}
                        </span>
                      );
                    })}
                    {cell.events.length > 2 && (
                      <span className="text-[8px] font-bold text-mute leading-none">
                        +{cell.events.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Dynamic Color-Coded Tags Legend */}
      <div
        className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t border-line/60 pt-3 text-[11px] text-mute"
        id="calendar-legend"
        role="region"
        aria-label="Calendar color-coded tags legend"
      >
        <span className="flex items-center gap-1.5" role="img" aria-label="Weekend column indicator">
          <span className="h-2 w-3 rounded-xs bg-amber-400/40 ring-1 ring-amber-400/80" aria-hidden="true" />
          <span>Weekend</span>
        </span>

        <span className="h-3 w-px bg-line/80 hidden sm:inline-block" aria-hidden="true" />

        <span className="text-[10px] font-bold uppercase tracking-wider text-ink/70">
          {tagMode === "category" ? "Event Types:" : "Booking Statuses:"}
        </span>

        {tagMode === "category" ? (
          <>
            {Object.entries(CATEGORY_THEMES).map(([catKey, theme]) => (
              <span key={catKey} className="flex items-center gap-1.5">
                <span className={cn("h-2.5 w-2.5 rounded-xs border-l-2", theme.dotClass, theme.borderClass)} aria-hidden="true" />
                <span className="font-medium text-ink/85">{theme.label}</span>
              </span>
            ))}
          </>
        ) : (
          <>
            {Object.entries(BOOKING_THEMES).map(([statusKey, theme]) => (
              <span key={statusKey} className="flex items-center gap-1.5">
                <span className={cn("h-2.5 w-2.5 rounded-xs border-l-2", theme.dotClass, theme.borderClass)} aria-hidden="true" />
                <span className="font-medium text-ink/85">{theme.label}</span>
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
