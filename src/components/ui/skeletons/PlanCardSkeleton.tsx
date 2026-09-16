import { cn } from "@/lib/cn";

export function PlanCardSkeleton({
  hasCover = false,
  className,
}: {
  hasCover?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-[28px] bg-card p-5 ring-1 ring-line shadow-xs min-h-[260px]",
        className,
      )}
    >
      {/* Top cover header (if hasCover) */}
      {hasCover && (
        <div className="relative -mx-5 -mt-5 mb-4 h-36 w-[calc(100%+2.5rem)] overflow-hidden bg-line/40">
          <div className="absolute inset-0 bg-gradient-to-r from-line/30 via-line/65 to-line/30 bg-[length:200%_100%] animate-shimmer" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-black/30 to-transparent" />
        </div>
      )}

      <div>
        {/* Top Type / Badge row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-line/60" />
            <div className="h-6 w-24 rounded-full bg-gradient-to-r from-line/40 via-line/70 to-line/40 bg-[length:200%_100%] animate-shimmer" />
          </div>
          <div className="h-6 w-20 rounded-full bg-line/40" />
        </div>

        {/* Title */}
        <div className="h-6 w-4/5 rounded-lg bg-gradient-to-r from-line/50 via-line/80 to-line/50 bg-[length:200%_100%] animate-shimmer mt-4 mb-2" />

        {/* Destination / Venue line */}
        <div className="flex items-center gap-1.5 mb-4">
          <div className="h-3.5 w-3.5 rounded-full bg-line/50" />
          <div className="h-3.5 w-1/2 rounded-md bg-line/40" />
        </div>
      </div>

      {/* Footer info: Attendees + RSVP status */}
      <div className="pt-4 border-t border-line/60 flex items-center justify-between">
        {/* Attendee Avatar Pile */}
        <div className="flex items-center">
          <div className="flex -space-x-2">
            <div className="h-7 w-7 rounded-full bg-line/70 ring-2 ring-card" />
            <div className="h-7 w-7 rounded-full bg-line/60 ring-2 ring-card" />
            <div className="h-7 w-7 rounded-full bg-line/50 ring-2 ring-card" />
          </div>
          <div className="ml-2 h-4 w-12 rounded-md bg-line/40" />
        </div>

        {/* Action / Spots left pill */}
        <div className="h-8 w-24 rounded-full bg-gradient-to-r from-line/50 via-line/80 to-line/50 bg-[length:200%_100%] animate-shimmer" />
      </div>
    </div>
  );
}

export function PlanCardSkeletonGrid({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading plans"
      className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <PlanCardSkeleton key={i} hasCover={i % 2 === 0} />
      ))}
    </div>
  );
}
