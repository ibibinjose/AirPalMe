import { useState } from "react";
import { Star } from "lucide-react";
import { PLAN_REVIEW_MAX } from "@shared/plan";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

/** Post-experience nudge: stars required, a few words optional. */
export function PlanReviewPrompt({ onSubmit }: { onSubmit: (input: { rating: number; review?: string }) => void }) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  return (
    <div className="mt-4 rounded-3xl bg-card p-6 ring-1 ring-gold/30 shadow-xs">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">How was it?</p>
      <h2 className="font-display text-xl font-bold text-ink">Rate this experience</h2>
      <div className="mt-3 flex items-center gap-1.5" role="radiogroup" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={rating === s}
            aria-label={`${s} star${s === 1 ? "" : "s"}`}
            onClick={() => {
              void triggerHaptic("light");
              setRating(s);
            }}
            className="grid h-12 w-12 place-items-center rounded-full transition active:scale-90"
          >
            <Star
              size={26}
              className={cn(s <= rating ? "fill-gold text-gold" : "fill-line text-line")}
            />
          </button>
        ))}
      </div>
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        maxLength={PLAN_REVIEW_MAX}
        rows={2}
        placeholder="What made it good? (optional, host sees this)"
        aria-label="Review words"
        className="mt-3 min-h-20 w-full rounded-2xl bg-paper px-4 py-3 text-sm border border-line outline-none focus:ring-2 focus:ring-brand focus:border-brand"
      />
      <button
        type="button"
        disabled={!rating}
        onClick={() => {
          void triggerHaptic("success");
          onSubmit({ rating, review: review.trim() || undefined });
        }}
        className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full bg-brand text-sm font-semibold text-white shadow-xs hover:bg-brand/90 transition active:scale-[0.99] disabled:opacity-40"
      >
        Submit review
      </button>
    </div>
  );
}
