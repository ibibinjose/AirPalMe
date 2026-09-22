import { cn } from "@/lib/cn";

export function PlaceCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative aspect-square overflow-hidden rounded-3xl bg-card ring-1 ring-line/70",
        className,
      )}
    >
      {/* Shimmer background image placeholder */}
      <div className="absolute inset-0 bg-gradient-to-r from-line/30 via-line/65 to-line/30 bg-[length:200%_100%] animate-shimmer" />

      {/* Dark scrim gradient to match PlaceCard */}
      <div className="hero-scrim absolute inset-0" />

      {/* Top badges (deal / open-now) */}
      <div className="absolute left-3 top-3 flex items-center gap-1.5">
        <div className="h-5 w-14 rounded-full bg-white/35 backdrop-blur-xs" />
        <div className="h-5 w-18 rounded-full bg-white/25 backdrop-blur-xs" />
      </div>

      {/* Bottom info section */}
      <div className="absolute inset-x-0 bottom-0 p-3.5 pr-12">
        <div className="h-4.5 w-3/4 rounded-md bg-white/50 mb-1.5" />
        <div className="h-3.5 w-2/5 rounded-md bg-white/35" />
      </div>

      {/* Bottom right handle pill */}
      <div className="absolute bottom-2.5 right-2.5 h-7 w-7 rounded-full bg-white/30 backdrop-blur-xs" />
    </div>
  );
}

export function PlaceCardSkeletonGrid({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading places"
      className={cn("grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <PlaceCardSkeleton key={i} />
      ))}
    </div>
  );
}
