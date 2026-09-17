import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

const TINT: Record<string, string> = {
  live: "bg-emerald-500/10 text-emerald-700",
  paused: "bg-amber-500/15 text-amber-700",
  submitted: "bg-amber-500/15 text-amber-700",
  under_review: "bg-amber-500/15 text-amber-700",
  approved: "bg-brand/10 text-brand",
  scheduled: "bg-brand/10 text-brand",
  closed: "bg-ink/10 text-mute",
  rejected: "bg-red-500/10 text-red-700",
  draft: "bg-ink/10 text-mute",
  archived: "bg-ink/10 text-mute",
};

/** One status chip for every promotions surface (business, admin, detail). */
export function PromoStatusChip({
  status,
  featured,
  className,
}: {
  status: string;
  featured?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
          TINT[status] || TINT.draft,
        )}
      >
        {status.replace("_", " ")}
      </span>
      {featured && <Star size={13} className="text-gold" />}
    </span>
  );
}
