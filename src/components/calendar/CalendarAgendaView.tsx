import { CalendarDays, Sparkles, Download, ArrowDownCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { CalendarEvent } from "@shared/event";
import { groupEventsByDate, CATEGORY_THEMES } from "@/lib/calendar-utils";
import { downloadMultipleIcs } from "@/lib/calendar-export";
import { CalendarEventCard } from "./CalendarEventCard";
import { useCalendarDrag } from "./CalendarDragContext";
import { cn } from "@/lib/cn";
import { track } from "@/lib/analytics";

interface CalendarAgendaViewProps {
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
  onResetFilters?: () => void;
  onSelectTag?: (tag: string) => void;
}

export function CalendarAgendaView({ events, onSelectEvent, onResetFilters, onSelectTag }: CalendarAgendaViewProps) {
  const groups = groupEventsByDate(events);
  const { isDragging, draggedEvent, dragOverDate, dragCollision, autoSnapOnCollision, setDragOverDate, dropOnDate } =
    useCalendarDrag();

  const handleExportDay = (dateStr: string, dayEvents: CalendarEvent[], displayDate: string) => {
    downloadMultipleIcs(dayEvents, `sydney-events-${dateStr}.ics`);
    toast.success(`Exported ${dayEvents.length} event${dayEvents.length > 1 ? "s" : ""} for ${displayDate}`);
    void track("calendar_agenda_export_day", { date: dateStr, count: dayEvents.length });
  };

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl ring-1 ring-line bg-card p-10 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-paper text-mute">
          <CalendarDays size={26} />
        </div>
        <h3 className="font-display mt-4 text-xl font-semibold text-ink">No events found</h3>
        <p className="mt-1.5 max-w-sm text-sm text-mute">
          No events match your current filter or selected date. Explore our local community schedule to find something
          exciting.
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-ink transition"
          >
            <Sparkles size={14} />
            <span>Show all events</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => {
        const isOver = dragOverDate === group.dateStr;
        const hasConflict = isOver && dragCollision?.hasCollision;

        return (
          <section
            key={group.dateStr}
            className={cn(
              "relative rounded-3xl transition-all duration-200 p-2 sm:p-3 -m-2 sm:-m-3",
              isOver &&
                (hasConflict
                  ? "bg-amber-500/10 ring-2 ring-amber-500 shadow-md"
                  : "bg-brand/10 ring-2 ring-brand shadow-md"),
              isDragging && !isOver && "ring-1 ring-line/40 hover:ring-brand/50",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dragOverDate !== group.dateStr) {
                setDragOverDate(group.dateStr);
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOverDate(group.dateStr);
            }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              if (dragOverDate === group.dateStr) {
                setDragOverDate(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              void dropOnDate(group.dateStr);
            }}
          >
            {/* Date section header */}
            <div className="z-20 mb-3.5 flex flex-wrap items-center justify-between gap-2 rounded-2xl ring-1 ring-line bg-paper/95 px-4 py-2.5 shadow-xs backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider shadow-xs",
                    group.isToday ? "bg-amber-400 text-ink" : "bg-brand text-white",
                  )}
                >
                  {group.dayBadge}
                </span>
                <h3 className="font-display text-base font-semibold text-ink md:text-lg">{group.displayDate}</h3>

                {/* Color-Coded Event Category Tags */}
                <div className="hidden sm:flex flex-wrap items-center gap-1.5 ml-1">
                  {Array.from(new Set(group.events.map((e) => e.category))).map((cat) => {
                    const theme = CATEGORY_THEMES[cat];
                    if (!theme) return null;
                    return (
                      <span
                        key={cat}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                          theme.badgeClass,
                        )}
                        title={`Contains ${theme.label} event`}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", theme.dotClass)} aria-hidden="true" />
                        <span>{theme.label}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-mute">
                  {group.events.length} {group.events.length === 1 ? "event" : "events"}
                </span>

                {/* Day export button */}
                <button
                  type="button"
                  onClick={() => handleExportDay(group.dateStr, group.events, group.displayDate)}
                  title={`Export events on ${group.displayDate} to calendar`}
                  className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-line ring-1 ring-line/80 transition active:scale-95"
                >
                  <Download size={12} className="text-mute" />
                  <span>Save Day (.ics)</span>
                </button>
              </div>
            </div>

            {/* Drag drop target banner */}
            {isOver &&
              (hasConflict ? (
                <div className="mb-4 flex flex-col sm:flex-row items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-500 bg-amber-500/15 p-3.5 text-center text-xs font-bold text-amber-950 shadow-xs animate-in fade-in">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 animate-bounce" />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                    <span>⚠️ Conflict: {dragCollision.reason}.</span>
                    {autoSnapOnCollision && dragCollision.nearestOpening ? (
                      <span className="underline decoration-amber-600 text-amber-900 font-semibold">
                        Auto-snapping to {dragCollision.nearestOpening.dayBadge} (
                        {dragCollision.nearestOpening.formattedDate})
                      </span>
                    ) : (
                      <span className="text-amber-900">Auto-snap disabled (will prompt).</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-4 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand bg-brand/15 p-3.5 text-center text-xs font-bold text-accent shadow-xs animate-in fade-in">
                  <ArrowDownCircle size={18} className="animate-bounce" />
                  <span>
                    Slot Available: Drop "{draggedEvent?.title}" to move here ({group.displayDate})
                  </span>
                </div>
              ))}

            {/* Day's Event Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {group.events.map((event) => (
                <CalendarEventCard key={event.id} event={event} onSelect={onSelectEvent} onSelectTag={onSelectTag} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
