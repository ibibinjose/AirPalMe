import { useState, useEffect } from "react";
import { Check, HelpCircle, Smartphone, User, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useLocation } from "wouter";
import { triggerHaptic } from "@/lib/native";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/lib/cn";

export function PlanRsvpSheet({
  open,
  onClose,
  onSubmit,
  currentStatus,
  currentNotes = "",
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (status: "going" | "maybe" | "declined", name: string, notes?: string) => void;
  currentStatus?: "going" | "maybe" | "declined" | null;
  currentNotes?: string;
}) {
  const { user } = useAuth();
  const { mine } = useBio();
  const [, nav] = useLocation();

  const [status, setStatus] = useState<"going" | "maybe" | "declined">(currentStatus || "going");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState(currentNotes);

  // Reset from the latest RSVP every time the sheet opens (never show a
  // previous plan's status/notes), prefill the name, lock scroll, Esc closes.
  useEffect(() => {
    if (!open) return;
    setStatus(currentStatus || "going");
    setNotes(currentNotes);
    if (user?.displayName) setName(user.displayName);
    else if (mine?.name) setName(mine.name);
    else if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("airpal.guest.name");
      if (storedName) setName(storedName);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open, currentStatus, currentNotes, user, mine, onClose]);

  useScrollLock(open);

  if (!open) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    void triggerHaptic(status === "going" ? "success" : "medium");
    const finalName = name.trim() || user?.displayName || "Guest Mate";
    onSubmit(status, finalName, notes.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 [padding-bottom:var(--keyboard-height,0px)] transition-[padding] duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Sheet Content */}
      <div className="scroll-container relative w-full max-w-md max-h-[min(90vh,calc(var(--visual-viewport-height,100dvh)-1.5rem))] rounded-t-[32px] sm:rounded-[32px] bg-card p-6 ring-1 ring-line shadow-2xl safe-bottom transition-all duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-line/60">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">RSVP Status</span>
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
                className="h-11 w-full rounded-2xl bg-paper pl-10 pr-4 text-sm border border-line outline-none focus:ring-2 focus:ring-brand focus:border-brand"
              />
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="text-xs font-semibold text-ink/80 block mb-1">Note for the crew (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bringing drinks, arriving by 7pm!"
              className="h-11 w-full rounded-2xl bg-paper px-4 text-sm border border-line outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

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
                    className="mt-1.5 text-xs font-semibold text-brand underline block"
                  >
                    Quick Mobile Sign In →
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
