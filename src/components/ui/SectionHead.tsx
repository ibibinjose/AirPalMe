import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The one section header: gold kicker, display title, optional sub and link.
 * Keeps every surface on the same type hierarchy.
 */
export function SectionHead({
  kicker,
  title,
  sub,
  href,
  linkLabel = "See all",
  align = "left",
  className,
}: {
  kicker: string;
  title: string;
  sub?: string;
  href?: string;
  linkLabel?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" && "text-center", className)}>
      <p
        className={cn(
          "flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-gold",
          align === "center" && "justify-center",
        )}
      >
        {kicker}
      </p>
      <div className={cn("mt-1 flex items-end justify-between gap-3", align === "center" && "justify-center")}>
        <h2 className="font-display text-balance text-2xl font-bold leading-[1.1] tracking-tight">{title}</h2>
        {href && (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-bold text-brand hover:underline"
          >
            {linkLabel} <ArrowRight size={14} />
          </Link>
        )}
      </div>
      {sub && <p className={cn("mt-1 max-w-md text-sm leading-relaxed text-mute", align === "center" && "mx-auto")}>{sub}</p>}
    </div>
  );
}
