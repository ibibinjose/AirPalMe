import { cn } from "@/lib/cn";
export * from "./skeletons";

export function ShimmerCard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative overflow-hidden rounded-3xl bg-card p-4 ring-1 ring-line/80 md:p-5", className)}
    >
      <div className="relative mb-3.5 h-44 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-line/30 via-line/65 to-line/30 bg-[length:200%_100%] animate-shimmer md:h-52" />
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 rounded-full bg-line/70" />
          <div className="h-5 w-16 rounded-full bg-line/50" />
        </div>
        <div className="h-6 w-3/4 rounded-lg bg-gradient-to-r from-line/40 via-line/75 to-line/40 bg-[length:200%_100%] animate-shimmer" />
        <div className="h-4 w-1/2 rounded-md bg-line/50" />
        <div className="pt-2 flex items-center justify-between">
          <div className="h-8 w-24 rounded-full bg-line/60" />
          <div className="h-8 w-16 rounded-full bg-line/40" />
        </div>
      </div>
    </div>
  );
}

export function ShimmerList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerCard key={i} />
      ))}
    </div>
  );
}
