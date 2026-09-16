import { cn } from "@/lib/cn";

export function TonightEventCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative h-40 w-56 shrink-0 overflow-hidden rounded-3xl bg-card ring-1 ring-line/70",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-line/30 via-line/65 to-line/30 bg-[length:200%_100%] animate-shimmer" />
      <div className="hero-scrim absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 p-3 text-left">
        <div className="h-3 w-20 rounded-full bg-white/40 mb-1.5" />
        <div className="h-4.5 w-36 rounded-md bg-white/50" />
      </div>
    </div>
  );
}

export function TonightEventSkeletonRow({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading tonight events"
      className={cn("no-scrollbar flex gap-3 overflow-x-hidden px-4 md:px-6", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <TonightEventCardSkeleton key={i} />
      ))}
    </div>
  );
}
