import React from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";
import type { IconSize, IconVariant } from "./types";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  /** Mandatory accessible label for screen readers and tooltips */
  label: string;
  variant?: "glass" | "brand" | "outline" | "ghost" | "paper";
  size?: "sm" | "md" | "lg";
  iconSize?: IconSize;
  iconVariant?: IconVariant;
  strokeWidth?: number;
  badge?: number | string;
  isLoading?: boolean;
}

const BUTTON_VARIANT_MAP = {
  glass: "bg-card/80 backdrop-blur-md ring-1 ring-line/80 text-ink hover:bg-card hover:ring-brand/30 shadow-xs",
  brand: "bg-brand text-white hover:bg-brand-ink shadow-[0_4px_12px_-4px_rgba(24,5,219,0.6)]",
  outline: "bg-card ring-1 ring-line text-ink hover:bg-paper hover:ring-brand/30 shadow-xs",
  ghost: "text-mute hover:text-ink hover:bg-paper/80",
  paper: "bg-paper ring-1 ring-line text-ink hover:bg-card shadow-xs",
};

const BUTTON_SIZE_MAP = {
  // Mobile-first touch target sizes (min 44px on mobile devices, responsive padding)
  sm: "h-9 w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-2 sm:p-1.5 rounded-full text-xs",
  md: "h-11 w-11 min-h-[44px] min-w-[44px] p-2.5 rounded-full text-sm",
  lg: "h-12 w-12 min-h-[48px] min-w-[48px] p-3 rounded-2xl text-base",
};

const DEFAULT_ICON_SIZE: Record<"sm" | "md" | "lg", IconSize> = {
  sm: "xs",
  md: "sm",
  lg: "md",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon: LucideComponent,
    label,
    variant = "glass",
    size = "md",
    iconSize,
    iconVariant,
    strokeWidth = 2,
    badge,
    isLoading = false,
    disabled,
    className,
    title,
    type = "button",
    ...rest
  },
  ref,
) {
  const actualIconSize = iconSize ?? DEFAULT_ICON_SIZE[size];
  const variantClass = BUTTON_VARIANT_MAP[variant] || BUTTON_VARIANT_MAP.glass;
  const sizeClass = BUTTON_SIZE_MAP[size] || BUTTON_SIZE_MAP.md;
  const isBrandSolid = variant === "brand";

  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={title || label}
      disabled={disabled || isLoading}
      className={cn(
        "relative inline-flex items-center justify-center shrink-0 transition-all select-none touch-manipulation cursor-pointer",
        "focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
        "active:scale-95 disabled:pointer-events-none disabled:opacity-50",
        sizeClass,
        variantClass,
        className,
      )}
      {...rest}
    >
      {isLoading ? (
        <Loader2
          size={typeof actualIconSize === "number" ? actualIconSize : 18}
          className="animate-spin text-current shrink-0"
        />
      ) : (
        <Icon
          icon={LucideComponent}
          size={actualIconSize}
          variant={iconVariant ?? (isBrandSolid ? "white" : "current")}
          strokeWidth={strokeWidth}
        />
      )}

      {badge !== undefined && badge !== null && (
        <span
          className={cn(
            "absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold shadow-xs",
            isBrandSolid
              ? "bg-white text-brand"
              : "bg-brand text-white",
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
});

IconButton.displayName = "IconButton";
