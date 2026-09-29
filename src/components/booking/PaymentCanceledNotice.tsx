import { useState } from "react";
import { useSearch } from "wouter";
import { Info, X } from "lucide-react";
import { triggerHaptic } from "@/lib/native";
import { hasCanceledParam } from "@shared/booking";

/**
 * No-charge notice for Stripe cancel returns. Self-gating: renders null
 * unless the URL carries a canceled param. Mount near the top of every
 * cancel_url landing surface (/mate, /plan/:id, /experiences).
 */
export function PaymentCanceledNotice() {
  const search = useSearch();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !hasCanceledParam(search)) return null;
  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-line" role="status">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-600">
        <Info size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">Payment canceled</p>
        <p className="mt-0.5 text-[13px] leading-5 text-mute">
          You were not charged, and your booking is still pending.
        </p>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          void triggerHaptic("light");
          setDismissed(true);
        }}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-mute transition hover:bg-paper hover:text-ink active:scale-95"
      >
        <X size={16} />
      </button>
    </div>
  );
}
