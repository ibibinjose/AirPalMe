import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";
import type { IconBadgeSize, IconBadgeVariant, IconSize, IconVariant } from "./types";
import { BADGE_SIZE_MAP, BADGE_VARIANT_MAP } from "./utils";

export interface IconBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  variant?: IconBadgeVariant;
  size?: IconBadgeSize;
  iconSize?: IconSize;
  iconVariant?: IconVariant;
  strokeWidth?: number;
  children?: React.ReactNode;
}

export const IconBadge = React.forwardRef<HTMLDivElement, IconBadgeProps>(function IconBadge(
  {
    icon,
    variant = "brand",
    size = "md",
    iconSize,
    iconVariant,
    strokeWidth = 2,
    className,
    children,
    ...rest
  },
  ref,
) {
  const sizeConfig = BADGE_SIZE_MAP[size] || BADGE_SIZE_MAP.md;
  const variantClass = BADGE_VARIANT_MAP[variant] || BADGE_VARIANT_MAP.brand;
  const actualIconSize = iconSize ?? sizeConfig.defaultIcon;

  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center shrink-0 transition-transform select-none",
        sizeConfig.container,
        variantClass,
        className,
      )}
      {...rest}
    >
      {icon ? (
        <Icon
          icon={icon}
          size={actualIconSize}
          variant={iconVariant ?? (variant === "brand-solid" ? "white" : "current")}
          strokeWidth={strokeWidth}
        />
      ) : (
        children
      )}
    </div>
  );
});

IconBadge.displayName = "IconBadge";
