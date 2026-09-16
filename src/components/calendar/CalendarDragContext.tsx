import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import type { CalendarEvent } from "@shared/event";
import { useEvents } from "@/contexts/EventsContext";
import { triggerHaptic } from "@/lib/native";
import { toast } from "sonner";
import {
  formatRelativeBadge,
  checkSlotCollision,
  type SlotCollisionResult,
} from "@/lib/calendar-utils";

interface CalendarDragContextValue {
  draggedEvent: CalendarEvent | null;
  dragOverDate: string | null;
  dragCollision: SlotCollisionResult | null;
  isDragging: boolean;
  autoSnapOnCollision: boolean;
  setAutoSnapOnCollision: (enabled: boolean) => void;
  startDrag: (event: CalendarEvent, e?: React.DragEvent) => void;
  endDrag: () => void;
  setDragOverDate: (dateStr: string | null) => void;
  dropOnDate: (targetDateStr: string, forceOverride?: boolean) => Promise<boolean>;
  checkDateCollision: (targetDateStr: string) => SlotCollisionResult | null;
  reschedulingEvent: CalendarEvent | null;
  setReschedulingEvent: (event: CalendarEvent | null) => void;
}

const CalendarDragContext = createContext<CalendarDragContextValue | undefined>(undefined);

export function CalendarDragProvider({ children }: { children: ReactNode }) {
  const { calendarEvents, rescheduleEvent, resetEventSchedule } = useEvents();
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [autoSnapOnCollision, setAutoSnapOnCollision] = useState<boolean>(true);
  const [reschedulingEvent, setReschedulingEvent] = useState<CalendarEvent | null>(null);

  const startDrag = useCallback((event: CalendarEvent, e?: React.DragEvent) => {
    setDraggedEvent(event);
    void triggerHaptic("light");
    if (e) {
      e.dataTransfer.setData("application/airpalme-event-id", event.id);
      e.dataTransfer.setData("text/plain", event.id);
      e.dataTransfer.effectAllowed = "move";
    }
  }, []);

  const endDrag = useCallback(() => {
    setDraggedEvent(null);
    setDragOverDate(null);
  }, []);

  // Compute collision dynamically for the current drag hover target
  const dragCollision = useMemo(() => {
    if (!draggedEvent || !dragOverDate) return null;
    return checkSlotCollision(draggedEvent, dragOverDate, calendarEvents);
  }, [draggedEvent, dragOverDate, calendarEvents]);

  const checkDateCollision = useCallback(
    (targetDateStr: string): SlotCollisionResult | null => {
      const activeEvent = draggedEvent || reschedulingEvent;
      if (!activeEvent) return null;
      return checkSlotCollision(activeEvent, targetDateStr, calendarEvents);
    },
    [draggedEvent, reschedulingEvent, calendarEvents],
  );

  const dropOnDate = useCallback(
    async (targetDateStr: string, forceOverride = false): Promise<boolean> => {
      if (!draggedEvent) return false;
      const eventToMove = draggedEvent;
      const fromDate = eventToMove.date;

      setDraggedEvent(null);
      setDragOverDate(null);

      if (fromDate === targetDateStr) {
        toast.info(`"${eventToMove.title}" is already scheduled on this day.`);
        return false;
      }

      // Check collision on drop target
      const collision = checkSlotCollision(eventToMove, targetDateStr, calendarEvents);
      const targetFormatted = formatRelativeBadge(targetDateStr).label;

      if (collision.hasCollision && !forceOverride) {
        if (autoSnapOnCollision && collision.nearestOpening) {
          const snapDate = collision.nearestOpening.dateStr;
          void triggerHaptic("medium");
          const success = await rescheduleEvent(eventToMove.id, snapDate);

          if (success) {
            toast.warning(
              `Conflict avoided: Snapped to ${collision.nearestOpening.dayBadge} (${collision.nearestOpening.formattedDate})`,
              {
                description: `Slot on ${targetFormatted} had a collision (${collision.reason}). Automatically routed to the nearest available opening.`,
                action: {
                  label: `Force to ${targetFormatted}`,
                  onClick: () => {
                    void rescheduleEvent(eventToMove.id, targetDateStr);
                    toast.info(`Scheduled "${eventToMove.title}" on ${targetFormatted} despite conflict.`);
                  },
                },
                duration: 8000,
              },
            );
            return true;
          }
        } else {
          void triggerHaptic("warning");
          toast.error(`Slot Conflict: ${collision.reason}`, {
            description: collision.nearestOpening
              ? `Recommended opening: ${collision.nearestOpening.dayBadge} (${collision.nearestOpening.formattedDate})`
              : "No nearby open slot found without time overlap.",
            action: collision.nearestOpening
              ? {
                  label: `Snap to ${collision.nearestOpening.dayBadge}`,
                  onClick: () => {
                    void rescheduleEvent(eventToMove.id, collision.nearestOpening!.dateStr);
                    toast.success(`Moved to ${collision.nearestOpening!.formattedDate}`);
                  },
                }
              : {
                  label: "Schedule Anyway",
                  onClick: () => {
                    void rescheduleEvent(eventToMove.id, targetDateStr);
                    toast.info(`Scheduled on ${targetFormatted}`);
                  },
                },
            duration: 8000,
          });
          return false;
        }
      }

      // No collision or force overridden
      void triggerHaptic("success");
      const success = await rescheduleEvent(eventToMove.id, targetDateStr);
      if (success) {
        toast.success(`Rescheduled "${eventToMove.title}" to ${targetFormatted}`, {
          description: `Moved from ${formatRelativeBadge(fromDate).label}`,
          action: {
            label: "Undo",
            onClick: () => {
              void resetEventSchedule(eventToMove.id);
              toast.info(`Restored "${eventToMove.title}" to original date`);
            },
          },
          duration: 6000,
        });
        return true;
      }
      return false;
    },
    [draggedEvent, calendarEvents, autoSnapOnCollision, rescheduleEvent, resetEventSchedule],
  );

  return (
    <CalendarDragContext.Provider
      value={{
        draggedEvent,
        dragOverDate,
        dragCollision,
        isDragging: Boolean(draggedEvent),
        autoSnapOnCollision,
        setAutoSnapOnCollision,
        startDrag,
        endDrag,
        setDragOverDate,
        dropOnDate,
        checkDateCollision,
        reschedulingEvent,
        setReschedulingEvent,
      }}
    >
      {children}
    </CalendarDragContext.Provider>
  );
}

export function useCalendarDrag() {
  const ctx = useContext(CalendarDragContext);
  if (!ctx) {
    throw new Error("useCalendarDrag must be used within a CalendarDragProvider");
  }
  return ctx;
}
