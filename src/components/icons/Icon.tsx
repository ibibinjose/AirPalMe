import React from "react";
import { cn } from "@/lib/cn";
import type { AirPalIconProps } from "./types";
import { resolveIconSize, resolveIconVariantClass } from "./utils";

export const Icon = React.forwardRef<SVGSVGElement, AirPalIconProps>(function Icon(
  { icon: LucideComponent, size = "md", variant = "current", strokeWidth = 2, className, title, ...rest },
  ref,
) {
  const numericSize = resolveIconSize(size);
  const variantClass = resolveIconVariantClass(variant);

  return (
    <LucideComponent
      ref={ref}
      size={numericSize}
      strokeWidth={strokeWidth}
      className={cn("shrink-0 transition-colors", variantClass, className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
    </LucideComponent>
  );
});

Icon.displayName = "AirPalIcon";
