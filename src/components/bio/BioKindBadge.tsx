import { Store, UserRound } from "lucide-react";
import { isBusinessKind, type BioKind } from "@shared/bio";
import { cn } from "@/lib/cn";

/**
 * Corner icon for avatars: a Store mark for businesses, a person mark for
 * individuals. Pair with a relative avatar frame.
 */
export function BioKindIcon({ kind, className }: { kind?: BioKind | null; className?: string }) {
  const business = isBusinessKind(kind);
  const Icon = business ? Store : UserRound;
  return (
    <span
      role="img"
      aria-label={business ? "Business profile" : "Individual profile"}
      title={business ? "Business" : "Individual"}
      className={cn(
        "grid h-6 w-6 place-items-center rounded-full shadow-sm ring-2 ring-paper",
        business ? "bg-gold text-ink" : "bg-brand text-white",
        className,
      )}
    >
      <Icon size={13} strokeWidth={2.2} aria-hidden />
    </span>
  );
}

/** Individual vs Business identifier shown on profiles and account surfaces. */
export function BioKindBadge({ kind, className }: { kind?: BioKind | null; className?: string }) {
  const business = isBusinessKind(kind);
  const Icon = business ? Store : UserRound;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
        business ? "bg-gold/10 text-gold ring-gold/25" : "bg-paper text-mute ring-line",
        className,
      )}
    >
      <Icon size={11} strokeWidth={2} aria-hidden />
      {business ? "Business" : "Individual"}
    </span>
  );
}
