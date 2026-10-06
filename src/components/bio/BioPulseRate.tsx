import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Star } from "lucide-react";
import { fetchBioPulse } from "@/lib/pulse-store";
import type { BioPulseResult } from "@shared/pulse";

/**
 * Bio-page Pulse check: when the bio's property has a live Pulse, invite the
 * visitor to rate their experience. Renders nothing while loading, offline,
 * or when no Pulse is live — the bio never shows a dead card.
 */
export function BioPulseRate({ propertyId }: { propertyId: string }) {
  const [, nav] = useLocation();
  const [result, setResult] = useState<BioPulseResult | null>(null);

  useEffect(() => {
    let alive = true;
    setResult(null);
    void fetchBioPulse(propertyId)
      .then((r) => {
        if (alive) setResult(r);
      })
      .catch(() => {
        if (alive) setResult({ found: false });
      });
    return () => {
      alive = false;
    };
  }, [propertyId]);

  if (!result || !result.found) return null;
  const { publicToken, title } = result;
  return (
    <section
      aria-label="Rate your experience"
      className="mt-8 rounded-[28px] bg-neutral-900 p-6 text-white shadow-xs"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
        <Star size={13} /> AirPal Pulse
      </p>
      <h3 className="font-display mt-2 text-xl font-bold tracking-tight">Rate your experience</h3>
      <p className="mt-1 text-sm leading-6 text-white/70">
        {title} · takes under a minute, anonymous by default.
      </p>
      <button
        type="button"
        onClick={() => nav(`/pulse/${publicToken}`)}
        className="mt-4 h-11 w-full rounded-full bg-white text-sm font-bold text-zinc-950 transition hover:bg-white/90 active:scale-[0.98]"
      >
        Start rate
      </button>
    </section>
  );
}
