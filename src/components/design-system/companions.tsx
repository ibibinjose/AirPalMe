import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { openGlobalSearch } from "@/components/search/GlobalSearchModal";

/**
 * AirPal companion design primitives (§24–§28, §43 of the brief).
 * Soft clay: white cards on mist, one brand action, short labels.
 */

export function SectionHeader({
  title,
  actionLabel,
  actionHref,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="font-display text-[20px] font-semibold tracking-tight">{title}</h2>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="shrink-0 text-[14px] font-semibold text-brand">
          {actionLabel} →
        </Link>
      ) : actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 cursor-pointer text-[14px] font-semibold text-brand"
        >
          {actionLabel} →
        </button>
      ) : null}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 overflow-x-auto rounded-full bg-card p-1 ring-1 ring-line no-scrollbar"
    >
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "h-9 flex-1 cursor-pointer touch-manipulation rounded-full px-4 text-[14px] font-semibold whitespace-nowrap transition active:scale-[0.98]",
            value === o.id ? "bg-brand text-white shadow-[0_6px_14px_-8px_rgba(18,22,20,0.3)]" : "text-mute hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PillRow<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string; color?: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div aria-label={label} className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {options.map((o) => {
        const on = value === o.id;
        const solid = o.color || "#121614";
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={on}
            className={cn(
              "h-10 shrink-0 cursor-pointer touch-manipulation rounded-full px-4 text-[14px] font-semibold shadow-sm transition active:scale-[0.96]",
              !on && "ring-1 ring-line",
            )}
            style={
              on
                ? { backgroundColor: solid, color: "#fff" }
                : { backgroundColor: `${solid}14`, color: solid }
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function AirPalSearchField({ placeholder = "Search AirPal" }: { placeholder?: string }) {
  return (
    <button
      type="button"
      onClick={openGlobalSearch}
      className="apple-liquid-glass-light flex h-[52px] w-full cursor-pointer touch-manipulation items-center gap-2.5 rounded-full px-5 text-left ring-1 ring-white/80 transition-all hover:ring-brand/40 active:scale-[0.99] shadow-sm hover:shadow-md"
    >
      <Search size={18} className="shrink-0 text-brand" />
      <span className="truncate text-[15px] font-medium text-mute">{placeholder}</span>
    </button>
  );
}

export function GlassPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "apple-liquid-glass-card rounded-3xl p-5 ring-1 ring-white/80",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardShell({
  children,
  className,
  href,
  onClick,
  label,
}: {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  label?: string;
}) {
  const cls = cn(
    "block overflow-hidden rounded-[28px] bg-card text-left ring-1 ring-line/80 shadow-xs transition-all duration-280 active:scale-[0.99]",
    (href || onClick) && "hover-lift hover:ring-brand/40",
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cls} aria-label={label}>
        {children}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(cls, "w-full cursor-pointer")} aria-label={label}>
        {children}
      </button>
    );
  }
  return <div className={cls}>{children}</div>;
}

/**
 * Colourful category tiles (Image #1 language): soft tinted rounded squares
 * with a saturated icon. Reserved for quick actions / categories — never
 * for primary CTAs, which stay AirPal Blue.
 */
export function CategoryTile({
  icon: Icon,
  label,
  href,
  tint,
  fg,
}: {
  icon: typeof Search;
  label: string;
  href: string;
  tint: string;
  fg: string;
}) {
  return (
    <Link
      href={href}
      className="group flex touch-manipulation flex-col items-center gap-1.5 transition-all duration-200 active:scale-[0.94]"
    >
      <span
        className="grid h-[68px] w-[68px] place-items-center rounded-[22px] shadow-[0_4px_14px_rgba(18,22,20,0.08)] ring-1 ring-black/5 transition-all duration-280 group-hover:-translate-y-1 group-hover:shadow-[0_8px_20px_rgba(18,22,20,0.12)]"
        style={{ backgroundColor: tint }}
      >
        <Icon size={28} style={{ color: fg }} strokeWidth={2.2} className="transition-transform duration-200 group-hover:scale-105" />
      </span>
      <span className="px-1 text-center text-[12px] font-semibold leading-tight text-ink group-hover:text-brand transition-colors">{label}</span>
    </Link>
  );
}

/** Floating rating pill that sits on imagery (Image #3 language). */
export function RatingBadge({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-bold text-ink shadow-sm">
      <span aria-hidden className="text-amber-500">★</span> {value.toFixed(1)}
    </span>
  );
}

/** Circular arrow CTA that sits on trip cards (Image #1 language). */
export function ArrowCta() {
  return (
    <span
      aria-hidden="true"
      className="grid h-11 w-11 place-items-center rounded-full bg-brand text-white shadow-[0_8px_16px_-8px_rgba(18,22,20,0.3)] transition group-hover:scale-105"
    >
      <span className="text-[18px] font-bold leading-none">↗</span>
    </span>
  );
}

/** Avatar stack for trip companions (Image #1 language). */
export function AvatarStack({ names }: { names: string[] }) {
  const shown = names.filter(Boolean).slice(0, 2);
  const extra = Math.max(0, names.filter(Boolean).length - shown.length);
  if (shown.length === 0 && extra === 0) return null;
  return (
    <span className="inline-flex items-center" aria-hidden>
      {shown.map((n, i) => (
        <span
          key={`${n}-${i}`}
          className="grid h-9 w-9 place-items-center rounded-full bg-white font-display text-[13px] font-bold text-ink ring-2 ring-white/80"
          style={{ marginLeft: i === 0 ? 0 : -10 }}
        >
          {n.trim()[0]?.toUpperCase() || "•"}
        </span>
      ))}
      {extra > 0 && (
        <span
          className="grid h-9 w-9 place-items-center rounded-full bg-white/95 text-[12px] font-bold text-ink ring-2 ring-white/80"
          style={{ marginLeft: -10 }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-shimmer rounded-xl bg-gradient-to-r from-line via-paper to-line", className)}
    />
  );
}

export function CardSkeletonRow({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-hidden" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-64 shrink-0 overflow-hidden rounded-2xl bg-card ring-1 ring-line">
          <SkeletonBlock className="h-36 rounded-none" />
          <div className="space-y-2 p-3">
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Thumb-reachable primary action (principle 8): a floating bar pinned above
 * the tab dock. One primary action; everything else stays secondary inline.
 * Detail pages using this must hide the global + Create (see AppShell).
 */
export function StickyAction({
  primary,
  secondary,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
}) {
  // Portaled to body: page wrappers use transform (pull-to-refresh), which
  // would trap `fixed` mid-page. Same pattern as Sheet.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed-element fixed inset-x-0 bottom-24 lg:bottom-6 z-30 pointer-events-none">
      <div className="mx-auto max-w-lg px-4">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-card/95 p-2 shadow-xl ring-1 ring-line backdrop-blur-xl">
          <div className="min-w-0 flex-1">{primary}</div>
          {secondary}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
