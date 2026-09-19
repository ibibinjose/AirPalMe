import { cn } from "@/lib/cn";

export function CalendarEventCardSkeleton({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative flex flex-col rounded-3xl bg-card p-4 ring-1 ring-line/80 shadow-xs md:p-5", className)}
    >
      {/* Top Banner / Image (if not compact) */}
      {!compact && (
        <div className="relative mb-3.5 h-44 w-full overflow-hidden rounded-2xl bg-paper/80 ring-1 ring-line/40 md:h-52">
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-line/30 via-line/65 to-line/30 bg-[length:200%_100%] animate-shimmer" />

          {/* Scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/15 to-transparent" />

          {/* Top pills */}
          <div className="absolute left-3 top-3 flex items-center gap-1.5">
            <div className="h-5 w-20 rounded-full bg-white/40 backdrop-blur-xs" />
            <div className="h-5 w-16 rounded-full bg-white/25 backdrop-blur-xs" />
          </div>
        </div>
      )}

      {/* Date & Time Row */}
      <div className="flex items-center gap-2 mb-2">
        <div className="h-4 w-4 rounded bg-line/60" />
        <div className="h-4 w-32 rounded-md bg-gradient-to-r from-line/40 via-line/70 to-line/40 bg-[length:200%_100%] animate-shimmer" />
      </div>

      {/* Title */}
      <div className="h-6 w-4/5 rounded-lg bg-gradient-to-r from-line/50 via-line/80 to-line/50 bg-[length:200%_100%] animate-shimmer mb-2" />

      {/* Location / Venue */}
      <div className="flex items-center gap-1.5 mb-3">
        <div className="h-3.5 w-3.5 rounded-full bg-line/50" />
        <div className="h-3.5 w-1/2 rounded-md bg-line/50" />
      </div>

      {/* Description Snippet */}
      <div className="space-y-1.5 mb-4 flex-1">
        <div className="h-3.5 w-full rounded-md bg-line/40" />
        <div className="h-3.5 w-4/5 rounded-md bg-line/35" />
      </div>

      {/* Bottom Actions Row */}
      <div className="pt-2 border-t border-line/50 flex items-center justify-between">
        <div className="h-9 w-28 rounded-full bg-gradient-to-r from-line/50 via-line/80 to-line/50 bg-[length:200%_100%] animate-shimmer" />
        <div className="flex items-center gap-1.5">
          <div className="h-8 w-8 rounded-full bg-line/40" />
          <div className="h-8 w-8 rounded-full bg-line/40" />
          <div className="h-8 w-8 rounded-full bg-line/40" />
        </div>
      </div>
    </div>
  );
}

export function CalendarEventSkeletonList({
  count = 3,
  compact = false,
  className,
}: {
  count?: number;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading calendar events"
      className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CalendarEventCardSkeleton key={i} compact={compact} />
      ))}
    </div>
  );
}
