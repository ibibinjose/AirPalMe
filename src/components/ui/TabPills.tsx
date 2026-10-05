import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { triggerHapticSelection } from "@/lib/native";

export type TabPillItem<T extends string> = {
  id: T;
  label: string;
  icon?: LucideIcon;
  badge?: string;
};

/**
 * The one tab-pill language for menus across the app (host, admin,
 * business). `contained` is the segmented control; `scroll` is the
 * horizontal chip row. Active is always brand-on-white.
 */
export function TabPills<T extends string>({
  items,
  active,
  onChange,
  layout = "scroll",
  ariaLabel = "Sections",
  className,
}: {
  items: Array<TabPillItem<T>>;
  active: T;
  onChange: (id: T) => void;
  layout?: "contained" | "scroll";
  ariaLabel?: string;
  className?: string;
}) {
  if (layout === "contained") {
    return (
      <nav
        aria-label={ariaLabel}
        className={cn("flex gap-1 rounded-full bg-card/80 p-1 ring-1 ring-line shadow-sm backdrop-blur", className)}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const on = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                void triggerHapticSelection();
                onChange(item.id);
              }}
              aria-pressed={on}
              className={cn(
                "flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                on ? "bg-brand font-semibold text-white shadow-sm" : "font-medium text-mute hover:text-ink",
              )}
            >
              {Icon && <Icon size={15} className="shrink-0" aria-hidden />}
              <span className="truncate capitalize">{item.label}</span>
              {item.badge && (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    on ? "bg-white/20 text-white" : "bg-paper text-mute ring-1 ring-line",
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    );
  }
  return (
    <nav aria-label={ariaLabel} className={cn("no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const on = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              void triggerHapticSelection();
              onChange(item.id);
            }}
            aria-pressed={on}
            className={cn(
              "flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-95 touch-manipulation cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              on ? "bg-brand text-white shadow-xs" : "bg-card text-mute ring-1 ring-line hover:text-ink hover:bg-paper",
            )}
          >
            {Icon && <Icon size={14} className="shrink-0" aria-hidden />}
            <span className="whitespace-nowrap">{item.label}</span>
            {item.badge && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  on ? "bg-white/20 text-white" : "bg-paper text-mute ring-1 ring-line",
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
