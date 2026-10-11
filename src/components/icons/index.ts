/**
 * AirPal Central Icon Library
 *
 * Provides brand-consistent icon styling defined in index.css (AirPal blue #1805db,
 * neutral dark text #121614, muted grey #6a726c, celebration palette, touch-target
 * ergonomics, and liquid glass badge containers).
 *
 * Re-exports all Lucide icons and types for unified single-point imports across the app.
 */

// Core icon components
export { Icon } from "./Icon";
export { IconBadge } from "./IconBadge";
export { IconButton } from "./IconButton";

// Brand-specific semantic icons
export {
  VerifiedBadgeIcon,
  SecurityShieldIcon,
  MateVerticalIcon,
  StayVerticalIcon,
  ExperienceVerticalIcon,
  FashionVerticalIcon,
  TravelVerticalIcon,
  DailyVerticalIcon,
  BrandSearchIcon,
  BrandLocationIcon,
  BrandChatIcon,
  BrandUsersIcon,
} from "./brandIcons";

// Utilities & mappings
export {
  resolveIconSize,
  resolveIconVariantClass,
  SIZE_MAP,
  VARIANT_CLASS_MAP,
  BADGE_VARIANT_MAP,
  BADGE_SIZE_MAP,
} from "./utils";

// Types
export type { IconSize, IconVariant, IconBadgeVariant, IconBadgeSize, AirPalIconProps } from "./types";
export type { IconButtonProps } from "./IconButton";
export type { IconBadgeProps } from "./IconBadge";

// Complete re-export of all Lucide icons and types for full compatibility
export * from "lucide-react";
