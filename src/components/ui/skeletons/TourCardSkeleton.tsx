import { cn } from "@/lib/cn";

export function TourCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative min-h-[240px] w-full overflow-hidden rounded-3xl bg-card ring-1 ring-line/70",
        className,
      )}
    >
      {/* Full-bleed shimmer background */}
      <div className="absolute inset-0 bg-gradient-to-r from-line/30 via-line/65 to-line/30 bg-[length:200%_100%] animate-shimmer" />

      {/* Hero scrim */}
      <div className="hero-scrim absolute inset-0" />

      {/* Bottom text overlay */}
      <div className="absolute inset-x-0 bottom-0 p-5">
        <div className="h-3 w-28 rounded-full bg-white/40 mb-2" />
        <div className="h-7 w-3/4 rounded-lg bg-white/50" />
      </div>
    </div>
  );
}

export function TourCardSkeletonGrid({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading walking tours"
      className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <TourCardSkeleton key={i} />
      ))}
    </div>
  );
}
