import { cn } from "@/lib/cn";
import { BRAND_TAGLINE } from "@/lib/brand";

export function BrandMark({
  compact = false,
  invert = false,
  withTagline = false,
}: {
  compact?: boolean;
  invert?: boolean;
  withTagline?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5 shrink-0 select-none", invert ? "text-white" : "text-ink")}>
      <img
        src="/logo-mark.png"
        alt=""
        className={cn(
          "rounded-xl bg-white object-contain shrink-0",
          compact ? "h-8 w-8 p-0.5" : "h-9 w-9 p-1",
        )}
      />
      {!compact && (
        <div className="flex flex-col text-left justify-center min-w-0">
          <span className="font-display text-[20px] sm:text-[22px] font-bold leading-none tracking-tight truncate">
            AirPal<span className={invert ? "text-white/70" : "text-brand"}>.me</span>
          </span>
          {withTagline && (
            <span
              className={cn(
                "text-[10px] font-semibold tracking-wider uppercase mt-0.5 leading-none",
                invert ? "text-white/75" : "text-gold",
              )}
            >
              {BRAND_TAGLINE}
            </span>
          )}
        </div>
      )}
    </span>
  );
}
