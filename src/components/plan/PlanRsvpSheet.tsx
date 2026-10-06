import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Check, HelpCircle, Minus, Plus, Smartphone, User, Users, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useLocation } from "wouter";
import { triggerHaptic } from "@/lib/native";
import { useScrollLock } from "@/hooks/useScrollLock";
import { PLAN_ANSWER_MAX, PLAN_PLUS_ONES_MAX, normalizeAnswer, normalizePlusOnes, type PlanGuestQuestion } from "@shared/plan";
import { cn } from "@/lib/cn";

export function PlanRsvpSheet({
  open,
  onClose,
  onSubmit,
  currentStatus,
  currentNotes = "",
  currentPlusOnes = 0,
  spotsLeft = null,
  requiresApproval = false,
  questions = [],
  currentAnswers = {},
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    status: "going" | "maybe" | "declined",
    name: string,
    notes?: string,
    plusOnes?: number,
    answers?: Record<string, string>,
  ) => void;
  currentStatus?: "going" | "maybe" | "declined" | null;
  currentNotes?: string;
  currentPlusOnes?: number;
  /** Host headcount spots left (null = no limit). Going queues to the waitlist at 0. */
  spotsLeft?: number | null;
  /** Host approves every guest — going taps land as requests. */
  requiresApproval?: boolean;
  /** Host questions (diet, transport, vibe). */
  questions?: PlanGuestQuestion[];
  currentAnswers?: Record<string, string>;
}) {
  const { user } = useAuth();
  const { mine } = useBio();
  const [, nav] = useLocation();

  const [status, setStatus] = useState<"going" | "maybe" | "declined">(currentStatus || "going");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState(currentNotes || "");
  const [plusOnes, setPlusOnes] = useState(() => normalizePlusOnes(currentPlusOnes));
  const [answers, setAnswers] = useState<Record<string, string>>(() => ({ ...currentAnswers }));

  const isFull = spotsLeft !== null && spotsLeft <= 0;

  // Reset from the latest RSVP only when the sheet transitions to open (never
  // wipe user's typed inputs on re-render while typing).
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    setStatus(currentStatus || "going");
    setNotes(currentNotes || "");
    setPlusOnes(normalizePlusOnes(currentPlusOnes));
    setAnswers({ ...(currentAnswers || {}) });
    if (user?.displayName) setName(user.displayName);
    else if (mine?.name) setName(mine.name);
    else if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("airpal.guest.name");
      if (storedName) setName(storedName);
    }
  }, [open, currentStatus, currentNotes, currentPlusOnes, currentAnswers, user, mine]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useScrollLock(open);

  if (!open || typeof document === "undefined") return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    void triggerHaptic(status === "going" ? "success" : "medium");
    const finalName = name.trim() || user?.displayName || "Guest Mate";
    const finalAnswers: Record<string, string> = {};
    for (const q of questions) {
      const v = normalizeAnswer(q, answers[q.id]);
      if (v) finalAnswers[q.id] = v;
    }
    onSubmit(
      status,
      finalName,
      notes.trim() || undefined,
      status === "going" ? plusOnes : 0,
      Object.keys(finalAnswers).length ? finalAnswers : undefined,
    );
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 [padding-bottom:var(--keyboard-height,0px)] transition-[padding] duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Sheet Content */}
      <div className="scroll-container relative w-full max-w-md max-h-[min(90vh,calc(var(--visual-viewport-height,100dvh)-1.5rem))] rounded-t-[32px] sm:rounded-[32px] bg-card p-6 ring-1 ring-line shadow-2xl safe-bottom transition-all duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-line/60">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">RSVP Status</span>
            <h2 className="font-display mt-0.5 text-xl font-bold text-ink">Your Response</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close RSVP"
            className="grid h-10 w-10 touch-manipulation place-items-center rounded-full text-mute hover:bg-paper hover:text-ink transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          {/* Status Selection Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("medium");
                setStatus("going");
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3.5 transition active:scale-95 text-center",
                status === "going"
                  ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500"
                  : "bg-paper text-ink ring-1 ring-line hover:bg-emerald-50/50 hover:text-emerald-800",
              )}
            >
              <Check size={22} />
              <span className="text-xs font-semibold">Going</span>
            </button>

            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                setStatus("maybe");
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3.5 transition active:scale-95 text-center",
                status === "maybe"
                  ? "bg-amber-500 text-white shadow-md ring-2 ring-amber-400"
                  : "bg-paper text-ink ring-1 ring-line hover:bg-amber-50/50 hover:text-amber-800",
              )}
            >
              <HelpCircle size={22} />
              <span className="text-xs font-semibold">Maybe</span>
            </button>

            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                setStatus("declined");
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3.5 transition active:scale-95 text-center",
                status === "declined"
                  ? "bg-zinc-700 text-white shadow-md ring-2 ring-zinc-500"
                  : "bg-paper text-ink ring-1 ring-line hover:bg-zinc-100/50",
              )}
            >
              <XCircle size={22} />
              <span className="text-xs font-semibold">Can't make it</span>
            </button>
          </div>

          {/* Party size — going only, counts toward the host guest limit */}
          {status === "going" && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-2.5 ring-1 ring-line">
              <span className="flex min-w-0 items-center gap-2">
                <Users size={16} className="shrink-0 text-mute" />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-ink">
                    Party{plusOnes > 0 ? ` · you +${plusOnes}` : " · just you"}
                  </span>
                  <span className="block truncate text-[11px] text-mute">
                    {requiresApproval
                      ? "The host approves every guest"
                      : isFull
                        ? "Full — you'll join the waitlist"
                        : "Bringing mates? They count as spots"}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label="Fewer plus-ones"
                  onClick={() => {
                    void triggerHaptic("light");
                    setPlusOnes((n) => normalizePlusOnes(n - 1));
                  }}
                  disabled={plusOnes <= 0}
                  className="grid h-11 w-11 place-items-center rounded-full bg-card text-ink ring-1 ring-line transition active:scale-95 disabled:opacity-40"
                >
                  <Minus size={16} />
                </button>
                <span className="w-6 text-center text-sm font-bold text-ink" aria-live="polite">
                  {plusOnes}
                </span>
                <button
                  type="button"
                  aria-label="More plus-ones"
                  onClick={() => {
                    void triggerHaptic("light");
                    setPlusOnes((n) => normalizePlusOnes(n + 1));
                  }}
                  disabled={plusOnes >= PLAN_PLUS_ONES_MAX}
                  className="grid h-11 w-11 place-items-center rounded-full bg-card text-ink ring-1 ring-line transition active:scale-95 disabled:opacity-40"
                >
                  <Plus size={16} />
                </button>
              </span>
            </div>
          )}

          {/* Name Input */}
          <div>
            <label className="text-xs font-semibold text-ink/80 block mb-1">Your Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex or Jordan"
                className="h-11 w-full rounded-2xl bg-paper pl-10 pr-4 text-[16px] sm:text-sm border border-line outline-none focus:ring-2 focus:ring-brand focus:border-brand"
              />
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="text-xs font-semibold text-ink/80 block mb-1">Note for the crew (optional)</label>
            <input
              type="text"
              value={notes || ""}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bringing drinks, arriving by 7pm!"
              className="h-11 w-full rounded-2xl bg-paper px-4 text-[16px] sm:text-sm border border-line outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

          {/* Host questions */}
          {questions.map((q) => (
            <div key={q.id}>
              <label className="text-xs font-semibold text-ink/80 block mb-1">{q.question}</label>
              {q.type === "choice" ? (
                <div className="flex flex-wrap gap-1.5">
                  {(q.options || []).map((opt) => {
                    const selected = (answers[q.id] || "") === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          void triggerHaptic("light");
                          setAnswers((prev) => ({ ...prev, [q.id]: selected ? "" : opt }));
                        }}
                        className={cn(
                          "inline-flex min-h-11 items-center rounded-full px-4 text-xs font-semibold transition active:scale-95",
                          selected
                            ? "bg-brand text-white shadow-xs"
                            : "bg-paper text-ink ring-1 ring-line hover:bg-line/40",
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  type="text"
                  value={answers[q.id] || ""}
                  maxLength={PLAN_ANSWER_MAX}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Your answer"
                  className="h-11 w-full rounded-2xl bg-paper px-4 text-[16px] sm:text-sm border border-line outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                />
              )}
            </div>
          ))}

          {/* Submit CTA */}
          <Button type="submit" className="w-full h-11 text-sm font-semibold mt-2">
            Confirm RSVP
          </Button>

          {/* Anonymous Callout to Upgrade */}
          {!user && (
            <div className="mt-3 rounded-2xl bg-amber-500/10 p-3 text-left ring-1 ring-amber-500/20">
              <div className="flex items-start gap-2.5">
                <Smartphone size={16} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300 leading-tight">
                    Want this plan saved to your account?
                  </p>
                  <p className="text-[11px] text-mute mt-0.5">Sign in with instant Mobile SMS code.</p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      nav(`/start?tab=phone&next=${encodeURIComponent(window.location.pathname)}`);
                    }}
                    className="mt-1.5 text-xs font-semibold text-accent underline block"
                  >
                    Quick Mobile Sign In →
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>,
    document.body,
  );
}
