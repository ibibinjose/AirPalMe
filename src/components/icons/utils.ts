import type { IconSize, IconVariant, IconBadgeVariant, IconBadgeSize } from "./types";

export const SIZE_MAP: Record<Exclude<IconSize, number>, number> = {
  "2xs": 12,
  xs: 14,
  sm: 16,
  md: 18,
  base: 20,
  lg: 24,
  xl: 28,
  "2xl": 32,
  "3xl": 40,
};

export function resolveIconSize(size?: IconSize): number {
  if (typeof size === "number") return size;
  if (!size) return 18; // Default medium (18px)
  return SIZE_MAP[size] ?? 18;
}

export const VARIANT_CLASS_MAP: Record<IconVariant, string> = {
  brand: "text-accent",
  "brand-ink": "text-brand-ink",
  ink: "text-ink",
  mute: "text-mute",
  line: "text-line",
  white: "text-white",
  current: "text-current",
  rose: "text-rose",
  blush: "text-blush",
  ember: "text-ember",
  burnt: "text-burnt",
  mango: "text-mango",
  lime: "text-lime",
  leaf: "text-leaf",
  forest: "text-forest",
  espresso: "text-espresso",
  bone: "text-bone",
};

export function resolveIconVariantClass(variant?: IconVariant): string {
  if (!variant) return "";
  return VARIANT_CLASS_MAP[variant] || "";
}

export const BADGE_VARIANT_MAP: Record<IconBadgeVariant, string> = {
  brand: "bg-brand/10 text-accent ring-1 ring-brand/20",
  "brand-solid": "bg-brand text-white shadow-xs",
  soft: "bg-card text-ink ring-1 ring-line shadow-xs",
  glass: "bg-card/80 backdrop-blur-md text-ink ring-1 ring-line/80 shadow-xs",
  surface: "bg-paper text-ink ring-1 ring-line",
  neutral: "bg-paper/80 text-mute ring-1 ring-line",
  success: "bg-leaf/10 text-leaf ring-1 ring-leaf/20",
  warning: "bg-mango/15 text-mango ring-1 ring-mango/30",
  danger: "bg-rose/10 text-rose ring-1 ring-rose/20",
};

export const BADGE_SIZE_MAP: Record<IconBadgeSize, { container: string; defaultIcon: IconSize }> = {
  xs: { container: "h-6 w-6 rounded-lg", defaultIcon: "2xs" },
  sm: { container: "h-8 w-8 rounded-xl", defaultIcon: "xs" },
  md: { container: "h-10 w-10 rounded-2xl", defaultIcon: "sm" },
  lg: { container: "h-12 w-12 rounded-2xl", defaultIcon: "base" },
  xl: { container: "h-14 w-14 rounded-3xl", defaultIcon: "lg" },
};
