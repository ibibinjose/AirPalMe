import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { CalendarPlus, MapPin, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { usePlans } from "@/contexts/PlanContext";
import { useScrollLock } from "@/hooks/useScrollLock";
import { createSubmitGuard } from "@/lib/submit-guard";
import { triggerHaptic } from "@/lib/native";
import { formatPlanDate } from "@shared/plan";

export type TripStopDraft = {
  name: string;
  placeId?: string;
  address?: string;
  notes?: string;
};

/**
 * Contextual "Add to Trip" picker for place/event detail pages. Picks one of
 * the user's upcoming plans and appends the stop, confirming with the plan
 * name ("Added to Melbourne Trip") instead of a generic toast.
 */
export function AddToTripSheet({
  open,
  onClose,
  stop,
}: {
  open: boolean;
  onClose: () => void;
  stop: TripStopDraft;
}) {
  const [, nav] = useLocation();
  const { myPlans, addStop } = usePlans();
  const guardRef = useRef(createSubmitGuard());

  const upcoming = useMemo(
    () =>
      myPlans
        .filter((p) => p.status !== "completed")
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6),
    [myPlans],
  );

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const pick = (planId: string, title: string) => {
    if (!guardRef.current.tryAcquire()) return;
    void triggerHaptic("light");
    const updated = addStop(planId, { ...stop }, { silent: true });
    if (!updated) {
      // Login gate took over (sign-in prompt) — re-arm for the retry.
      guardRef.current.release();
      return;
    }
    toast.success(`Added to "${title}"`);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add to trip"
        className="scroll-container relative max-h-[min(80vh,calc(var(--visual-viewport-height,100dvh)-1.5rem))] w-full max-w-md overflow-y-auto rounded-t-[32px] bg-card p-5 ring-1 ring-line shadow-2xl safe-bottom sm:rounded-[32px] sm:p-6"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">Add to trip</p>
        <h2 className="font-display mt-0.5 truncate text-xl font-bold text-ink">{stop.name}</h2>

        {upcoming.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {upcoming.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => pick(p.id, p.title)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-paper p-3 text-left ring-1 ring-line transition hover:ring-brand/40 active:scale-[0.99]"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                    <MapPin size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ink">{p.title}</span>
                    <span className="block truncate text-xs text-mute">
                      {formatPlanDate(p.date, p.time)}
                      {p.destination ? ` · ${p.destination}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-mute">No upcoming trips yet — start one and this stop lands inside it.</p>
        )}

        <button
          type="button"
          onClick={() => {
            onClose();
            nav("/plan/new");
          }}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-[0.99]"
        >
          {upcoming.length > 0 ? <Plus size={16} /> : <CalendarPlus size={16} />}
          <span>{upcoming.length > 0 ? "New trip" : "Plan a trip"}</span>
        </button>
      </div>
    </div>,
    document.body,
  );
}
