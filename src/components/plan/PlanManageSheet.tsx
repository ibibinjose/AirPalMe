import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Lock, Megaphone, Pencil, Radar, Trash2, X } from "lucide-react";
import { PlanQuestionManager } from "./PlanQuestionManager";
import { useScrollLock } from "@/hooks/useScrollLock";
import {
  registerModalBackHandler,
  triggerHaptic,
  triggerHapticSelection,
  unregisterModalBackHandler,
} from "@/lib/native";
import { PLAN_CAPACITY_MAX, headcountTaken, normalizeCapacity, type HangoutPlan } from "@shared/plan";
import { cn } from "@/lib/cn";

function Switch({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        void triggerHapticSelection();
        onToggle();
      }}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition before:absolute before:-inset-3 before:content-['']",
        checked ? "bg-brand" : "bg-line",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
          checked ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

/** Host-only controls for a plan, tucked into one sheet so the thread stays a single living card. */
export function PlanManageSheet({
  open,
  onClose,
  plan,
  onUpdate,
  onEdit,
  onMessageGoing,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  plan: HangoutPlan;
  onUpdate: (patch: Partial<HangoutPlan>) => void;
  onEdit: () => void;
  onMessageGoing: () => void;
  onDelete: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    registerModalBackHandler(() => {
      onClose();
      return true;
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      unregisterModalBackHandler();
    };
  }, [open, onClose]);

  useScrollLock(open);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 [padding-bottom:var(--keyboard-height,0px)] transition-[padding] duration-200">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="scroll-container relative w-full max-w-md max-h-[min(90vh,calc(var(--visual-viewport-height,100dvh)-1.5rem))] rounded-t-[32px] sm:rounded-[32px] bg-card p-6 ring-1 ring-line shadow-2xl safe-bottom transition-all duration-200">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line/80 sm:hidden" />
        <div className="flex items-center justify-between border-b border-line/60 pb-3">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">
              Host controls
            </span>
            <h2 className="font-display mt-0.5 text-xl font-bold text-ink">Manage plan</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close manage plan"
            className="grid h-10 w-10 touch-manipulation place-items-center rounded-full text-mute transition hover:bg-paper hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              onClose();
              onEdit();
            }}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl bg-paper px-4 text-left ring-1 ring-line transition hover:bg-card active:scale-[0.99]"
          >
            <Pencil size={16} className="shrink-0 text-brand" />
            <span className="flex-1 text-sm font-semibold text-ink">Edit plan</span>
            <ChevronRight size={16} className="shrink-0 text-mute" />
          </button>
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              onClose();
              onMessageGoing();
            }}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl bg-paper px-4 text-left ring-1 ring-line transition hover:bg-card active:scale-[0.99]"
          >
            <Megaphone size={16} className="shrink-0 text-brand" />
            <span className="flex-1 text-sm font-semibold text-ink">Message everyone going</span>
            <ChevronRight size={16} className="shrink-0 text-mute" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3 ring-1 ring-line">
          <span className="inline-flex min-w-0 items-center gap-2 text-xs font-medium text-ink">
            {plan.isPublic ? (
              <Radar size={14} className="shrink-0 text-brand" />
            ) : (
              <Lock size={14} className="shrink-0 text-mute" />
            )}
            <span className="truncate">{plan.isPublic ? "Public · live on discover map" : "Private · invite-only"}</span>
          </span>
          <Switch
            checked={Boolean(plan.isPublic)}
            onToggle={() => onUpdate({ isPublic: !plan.isPublic })}
            label="Who can discover this plan"
          />
        </div>

        <div className="mt-4 rounded-2xl bg-paper px-4 py-2 ring-1 ring-line">
          <p className="pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">Who's going</p>
          {(
            [
              { key: "hideNames", label: "Guest names", hint: "Show who else is coming" },
              { key: "hideCount", label: "Headcount", hint: "Show going / maybe numbers" },
            ] as const
          ).map((row) => {
            const hidden = Boolean(plan.guestList?.[row.key]);
            return (
              <div key={row.key} className="flex items-center justify-between gap-3 border-t border-line/60 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-ink">{row.label}</span>
                  <span className="block truncate text-[11px] text-mute">{row.hint}</span>
                </span>
                <Switch
                  checked={!hidden}
                  onToggle={() =>
                    onUpdate({ guestList: { ...(plan.guestList || {}), [row.key]: !hidden } })
                  }
                  label={row.label}
                />
              </div>
            );
          })}
          <div className="flex items-center justify-between gap-3 border-t border-line/60 py-2.5">
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-ink">Max guests</span>
              <span className="block truncate text-[11px] text-mute">
                {plan.capacity && plan.capacity > 0
                  ? `${headcountTaken(plan)} of ${plan.capacity} spots filled`
                  : "No guest limit"}
              </span>
            </span>
            <input
              key={`cap-${plan.id}-${plan.capacity ?? "open"}`}
              type="number"
              min={1}
              max={PLAN_CAPACITY_MAX}
              defaultValue={plan.capacity ?? ""}
              placeholder="No limit"
              inputMode="numeric"
              aria-label="Max guests"
              onBlur={(e) => {
                const next = normalizeCapacity(e.currentTarget.value);
                if (next !== plan.capacity) onUpdate({ capacity: next });
                else e.currentTarget.value = plan.capacity != null ? String(plan.capacity) : "";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="h-11 w-24 shrink-0 rounded-2xl bg-card px-3 text-center text-sm text-ink border border-line outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line/60 py-2.5">
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-ink">Approve guests</span>
              <span className="block truncate text-[11px] text-mute">Going taps land as requests</span>
            </span>
            <Switch
              checked={Boolean(plan.requiresApproval)}
              onToggle={() => onUpdate({ requiresApproval: !plan.requiresApproval })}
              label="Approve guests"
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-paper px-4 py-2 ring-1 ring-line">
          <p className="pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">Guest questions</p>
          <PlanQuestionManager
            questions={plan.guestQuestions || []}
            onAdd={(q) =>
              onUpdate({
                guestQuestions: [...(plan.guestQuestions || []), { id: `q-${Date.now().toString(36)}`, ...q }],
              })
            }
            onRemove={(id) =>
              onUpdate({ guestQuestions: (plan.guestQuestions || []).filter((q) => q.id !== id) })
            }
          />
        </div>

        <div className="mt-6 border-t border-line/60 pt-4">
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("warning");
              onClose();
              onDelete();
            }}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-red-500 transition hover:text-red-600"
          >
            <Trash2 size={14} />
            <span>Delete hangout plan</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
