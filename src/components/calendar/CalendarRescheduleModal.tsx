import { useState, useMemo, useEffect } from "react";
import { X, Calendar as CalendarIcon, Clock, RotateCcw, Check, AlertTriangle, Zap, CheckCircle2 } from "lucide-react";
import type { CalendarEvent } from "@shared/event";
import { useEvents } from "@/contexts/EventsContext";
import {
  computeRescheduledTimes,
  toDateStr,
  formatRelativeBadge,
  checkSlotCollision,
} from "@/lib/calendar-utils";
import { triggerHaptic } from "@/lib/native";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { useScrollLock } from "@/hooks/useScrollLock";

interface CalendarRescheduleModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
}

export function CalendarRescheduleModal({ event, onClose }: CalendarRescheduleModalProps) {
  const { calendarEvents, rescheduleEvent, resetEventSchedule } = useEvents();
  const [selectedDate, setSelectedDate] = useState<string>(event?.date || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useScrollLock(Boolean(event));

  useEffect(() => {
    if (event) setSelectedDate(event.date);
    else setSelectedDate("");
  }, [event?.id, event?.date]);

  useEffect(() => {
    if (!event) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [event, onClose]);

  // Generate shortcut date slots (Today, Tomorrow, Upcoming Weekend days, etc.)
  const quickSlots = useMemo(() => {
    const today = new Date();
    const slots: Array<{ label: string; sublabel: string; dateStr: string; isWeekend: boolean }> = [];

    for (let i = 0; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = toDateStr(d);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const rel = formatRelativeBadge(dateStr);
      const weekday = new Intl.DateTimeFormat("en-AU", { weekday: "short" }).format(d);
      const monthDay = new Intl.DateTimeFormat("en-AU", { month: "short", day: "numeric" }).format(d);

      slots.push({
        label: rel.label,
        sublabel: `${weekday}, ${monthDay}`,
        dateStr,
        isWeekend,
      });
    }
    return slots;
  }, []);

  // Compute collision on selected date
  const collision = useMemo(() => {
    if (!event || !selectedDate) return null;
    return checkSlotCollision(event, selectedDate, calendarEvents);
  }, [event, selectedDate, calendarEvents]);

  if (!event) return null;

  const currentPreviewTimes = computeRescheduledTimes(
    event.startsAt,
    event.endsAt,
    selectedDate || event.date,
  );

  const handleConfirm = async () => {
    if (!selectedDate || selectedDate === event.date) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    void triggerHaptic("success");
    const success = await rescheduleEvent(event.id, selectedDate);
    setIsSubmitting(false);

    if (success) {
      const rel = formatRelativeBadge(selectedDate).label;
      if (collision?.hasCollision) {
        toast.warning(`Rescheduled "${event.title}" to ${rel} despite conflict`, {
          description: collision.reason,
          action: {
            label: "Undo",
            onClick: () => {
              void resetEventSchedule(event.id);
              toast.info(`Restored "${event.title}" to original date`);
            },
          },
        });
      } else {
        toast.success(`Rescheduled "${event.title}" to ${rel}`, {
          action: {
            label: "Undo",
            onClick: () => {
              void resetEventSchedule(event.id);
              toast.info(`Restored "${event.title}" to original date`);
            },
          },
        });
      }
      onClose();
    }
  };

  const handleReset = async () => {
    void triggerHaptic("light");
    await resetEventSchedule(event.id);
    toast.info(`Restored "${event.title}" to original date`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center [padding-bottom:var(--keyboard-height,0px)] transition-[padding] duration-200">
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 bg-ink/60 backdrop-blur-xs transition-opacity"
        aria-label="Close modal"
        onClick={onClose}
      />

      {/* Sheet Content */}
      <div className="scroll-container relative z-10 max-h-[min(90dvh,calc(var(--visual-viewport-height,100dvh)-1.5rem))] w-full rounded-t-3xl bg-card p-5 shadow-2xl ring-1 ring-line sm:max-w-md sm:rounded-3xl sm:p-6 overflow-y-auto transition-all duration-200">
        {/* Mobile Pull Tab */}
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-line/60">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-brand uppercase tracking-wider mb-1">
              <CalendarIcon size={14} />
              <span>Reschedule Event</span>
            </div>
            <h3 className="font-display text-lg font-bold text-ink leading-snug">
              {event.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper text-mute hover:text-ink transition ring-1 ring-line/80"
          >
            <X size={15} />
          </button>
        </div>

        {/* Current Schedule Summary */}
        <div className="my-4 rounded-2xl bg-paper/90 p-3.5 ring-1 ring-line/60 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-mute font-medium">Currently scheduled:</span>
            <span className="font-semibold text-ink">
              {formatRelativeBadge(event.date).label} ({event.date})
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-mute font-medium flex items-center gap-1">
              <Clock size={12} />
              Time window:
            </span>
            <span className="font-semibold text-ink">{event.timeLabel}</span>
          </div>

          {event.isRescheduled && (
            <div className="pt-2 border-t border-line/50 flex items-center justify-between text-xs">
              <span className="text-amber-700 font-medium">Custom scheduled</span>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              >
                <RotateCcw size={11} />
                <span>Reset to original date</span>
              </button>
            </div>
          )}
        </div>

        {/* Choose Target Date Slot */}
        <div className="space-y-3">
          <label htmlFor="calendar-custom-date" className="block text-xs font-semibold text-ink uppercase tracking-wider">
            Select New Date Slot
          </label>

          {/* Quick Date Buttons */}
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {quickSlots.slice(0, 8).map((slot) => {
              const isSelected = selectedDate === slot.dateStr;
              const isCurrent = event.date === slot.dateStr;
              const slotCollision = checkSlotCollision(event, slot.dateStr, calendarEvents);

              return (
                <button
                  key={slot.dateStr}
                  type="button"
                  onClick={() => {
                    setSelectedDate(slot.dateStr);
                    void triggerHaptic("light");
                  }}
                  className={cn(
                    "flex flex-col items-start rounded-xl p-2.5 text-left transition ring-1 text-xs",
                    isSelected
                      ? (
                        slotCollision.hasCollision
                          ? "bg-amber-600 text-white ring-amber-600 shadow-xs font-semibold"
                          : "bg-brand text-white ring-brand shadow-xs font-semibold"
                      )
                      : "bg-card text-ink ring-line/80 hover:bg-paper",
                    isCurrent && !isSelected && "border-l-2 border-l-amber-500",
                    !isSelected && slotCollision.hasCollision && "bg-amber-500/[0.06] ring-amber-300/60",
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold truncate">{slot.label}</span>
                    {isCurrent ? (
                      <span className={cn("text-[9px] font-medium", isSelected ? "text-white/80" : "text-amber-600")}>
                        (Current)
                      </span>
                    ) : slotCollision.hasCollision ? (
                      <span className={cn("text-[9px] font-bold inline-flex items-center gap-0.5", isSelected ? "text-amber-100" : "text-amber-700")}>
                        <AlertTriangle size={9} />
                        <span>Conflict</span>
                      </span>
                    ) : null}
                  </div>
                  <span className={cn("text-[10px] mt-0.5", isSelected ? "text-white/80" : "text-mute")}>
                    {slot.sublabel}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Manual Date Input Picker */}
          <div className="pt-2">
            <label htmlFor="calendar-custom-date" className="block text-[11px] font-medium text-mute mb-1">
              Or pick any specific date:
            </label>
            <input
              id="calendar-custom-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-xl bg-paper px-3 py-2 text-xs text-ink ring-1 ring-line/80 outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {/* Collision Warning Box or Clean Preview */}
          {selectedDate && selectedDate !== event.date && (
            collision?.hasCollision ? (
              <div className="rounded-2xl bg-amber-500/10 p-3.5 ring-1 ring-amber-400/50 text-xs text-amber-950 space-y-2.5 animate-in fade-in">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-amber-900">Slot Collision / Overlap</p>
                    <p className="text-[11px] text-amber-800 leading-snug">{collision.reason}</p>
                  </div>
                </div>

                {collision.nearestOpening && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-amber-300/40">
                    <span className="text-amber-800 text-[11px] font-medium">Nearest available opening:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(collision.nearestOpening!.dateStr);
                        void triggerHaptic("medium");
                        toast.info(`Snapped to opening on ${collision.nearestOpening!.formattedDate}`);
                      }}
                      className="inline-flex items-center justify-center gap-1 rounded-full bg-amber-500/25 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-500/35 transition ring-1 ring-amber-500/40 active:scale-95 shadow-2xs"
                    >
                      <Zap size={12} className="text-amber-700" />
                      <span>Snap to {collision.nearestOpening.dayBadge} ({collision.nearestOpening.formattedDate})</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-500/10 p-3 ring-1 ring-emerald-500/30 text-xs flex items-center justify-between text-emerald-950 dark:text-emerald-200">
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>Available: {formatRelativeBadge(selectedDate).label} ({currentPreviewTimes.timeLabel}) · No conflicts</span>
                </div>
              </div>
            )
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-line/60">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-xs font-medium text-mute hover:text-ink transition"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!selectedDate || selectedDate === event.date || isSubmitting}
            onClick={handleConfirm}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-semibold shadow-sm transition active:scale-95",
              collision?.hasCollision
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-brand text-white hover:opacity-95",
              (!selectedDate || selectedDate === event.date || isSubmitting) && "opacity-50 cursor-not-allowed",
            )}
          >
            <Check size={14} />
            <span>{collision?.hasCollision ? "Force Schedule Anyway" : "Confirm Reschedule"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
