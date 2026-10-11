import type { LucideIcon } from "lucide-react";

/** Standard icon size tokens mapped to AirPal spacing and typography scales */
export type IconSize =
  | "2xs" // 12px
  | "xs" // 14px
  | "sm" // 16px (standard input / button icon)
  | "md" // 18px (default navigation & action icon)
  | "base" // 20px
  | "lg" // 24px (header / hero action)
  | "xl" // 28px
  | "2xl" // 32px (feature highlight)
  | "3xl" // 40px (display / empty state)
  | number;

/** Brand-consistent color variants defined in index.css */
export type IconVariant =
  | "brand" // #1805db (AirPal Blue)
  | "brand-ink" // #0e0394 (Deep Navy)
  | "ink" // #121614 (Primary Dark Neutral)
  | "mute" // #6a726c (Muted Grey)
  | "line" // #e4e7ee (Subtle Line/Border)
  | "white" // #ffffff
  | "current" // currentColor (inherits from parent)
  // AirPal celebration palette
  | "rose" // #f43f5e
  | "blush" // #ffc2d1
  | "ember" // #e63946
  | "burnt" // #e76f51
  | "mango" // #ffb703
  | "lime" // #a3e635
  | "leaf" // #22c55e
  | "forest" // #1b4332
  | "espresso" // #4a3728
  | "bone"; // #f5f0e6

/** Container badge styling variants aligned with AirPal liquid glass aesthetic */
export type IconBadgeVariant =
  | "brand" // bg-brand/10 text-accent ring-brand/20
  | "brand-solid" // bg-brand text-white shadow-xs
  | "soft" // bg-card text-ink ring-line shadow-xs
  | "glass" // bg-card/80 backdrop-blur-md text-ink ring-line/80 shadow-xs
  | "surface" // bg-paper text-ink ring-line
  | "neutral" // bg-paper/80 text-mute ring-line
  | "success" // bg-leaf/10 text-leaf ring-leaf/20
  | "warning" // bg-mango/15 text-mango ring-mango/30
  | "danger"; // bg-rose/10 text-rose ring-rose/20

export type IconBadgeSize =
  | "xs" // 24x24
  | "sm" // 32x32
  | "md" // 40x40 (standard)
  | "lg" // 48x48
  | "xl"; // 56x56

export interface AirPalIconProps extends Omit<React.SVGProps<SVGSVGElement>, "ref"> {
  icon: LucideIcon;
  size?: IconSize;
  variant?: IconVariant;
  strokeWidth?: number;
  className?: string;
  title?: string;
}
