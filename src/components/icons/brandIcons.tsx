import React from "react";
import {
  BadgeCheck,
  BedDouble,
  Compass,
  HeartHandshake,
  MapPin,
  MessageSquare,
  Plane,
  Search,
  ShieldCheck,
  Shirt,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";
import type { IconSize, IconVariant } from "./types";

interface BrandIconProps {
  size?: IconSize;
  variant?: IconVariant;
  className?: string;
  strokeWidth?: number;
}

/** AirPal Verified Badge for approved mates, partner stays, and trusted businesses */
export function VerifiedBadgeIcon({ size = "sm", variant = "brand", className, strokeWidth = 2 }: BrandIconProps) {
  return (
    <Icon
      icon={BadgeCheck}
      size={size}
      variant={variant}
      strokeWidth={strokeWidth}
      className={cn("inline-block align-middle", className)}
      title="AirPal Verified"
    />
  );
}

/** AirPal Trust & Safety shield */
export function SecurityShieldIcon({ size = "md", variant = "brand", className, strokeWidth = 2 }: BrandIconProps) {
  return (
    <Icon
      icon={ShieldCheck}
      size={size}
      variant={variant}
      strokeWidth={strokeWidth}
      className={className}
      title="AirPal Trust & Safety"
    />
  );
}

/** AirPal Mate: find someone to go with you */
export function MateVerticalIcon({ size = "md", variant = "brand", className, strokeWidth = 2 }: BrandIconProps) {
  return (
    <Icon
      icon={HeartHandshake}
      size={size}
      variant={variant}
      strokeWidth={strokeWidth}
      className={className}
      title="AirPal Mate"
    />
  );
}

/** AirPal Stay: boutique hotels, motels & serviced apartments */
export function StayVerticalIcon({ size = "md", variant = "brand", className, strokeWidth = 2 }: BrandIconProps) {
  return (
    <Icon
      icon={BedDouble}
      size={size}
      variant={variant}
      strokeWidth={strokeWidth}
      className={className}
      title="AirPal Stay"
    />
  );
}

/** AirPal Experiences: food, culture, art & wellness activities */
export function ExperienceVerticalIcon({ size = "md", variant = "brand", className, strokeWidth = 2 }: BrandIconProps) {
  return (
    <Icon
      icon={Compass}
      size={size}
      variant={variant}
      strokeWidth={strokeWidth}
      className={className}
      title="AirPal Experiences"
    />
  );
}

/** AirPal Fashion: share, rent, swap & style */
export function FashionVerticalIcon({ size = "md", variant = "brand", className, strokeWidth = 2 }: BrandIconProps) {
  return (
    <Icon
      icon={Shirt}
      size={size}
      variant={variant}
      strokeWidth={strokeWidth}
      className={className}
      title="AirPal Fashion"
    />
  );
}

/** AirPal Travel: itinerary & trip orchestration */
export function TravelVerticalIcon({ size = "md", variant = "brand", className, strokeWidth = 2 }: BrandIconProps) {
  return (
    <Icon
      icon={Plane}
      size={size}
      variant={variant}
      strokeWidth={strokeWidth}
      className={className}
      title="AirPal Travel"
    />
  );
}

/** AirPal Daily: what's happening near me */
export function DailyVerticalIcon({ size = "md", variant = "brand", className, strokeWidth = 2 }: BrandIconProps) {
  return (
    <Icon
      icon={Sparkles}
      size={size}
      variant={variant}
      strokeWidth={strokeWidth}
      className={className}
      title="AirPal Daily"
    />
  );
}

/** Universal Search Icon with brand blue accent */
export function BrandSearchIcon({ size = "sm", variant = "brand", className, strokeWidth = 2 }: BrandIconProps) {
  return (
    <Icon icon={Search} size={size} variant={variant} strokeWidth={strokeWidth} className={className} title="Search" />
  );
}

/** Location pin with brand styling */
export function BrandLocationIcon({ size = "sm", variant = "brand", className, strokeWidth = 2 }: BrandIconProps) {
  return (
    <Icon
      icon={MapPin}
      size={size}
      variant={variant}
      strokeWidth={strokeWidth}
      className={className}
      title="Location"
    />
  );
}

/** Messaging & chat icon with brand styling */
export function BrandChatIcon({ size = "sm", variant = "brand", className, strokeWidth = 2 }: BrandIconProps) {
  return (
    <Icon
      icon={MessageSquare}
      size={size}
      variant={variant}
      strokeWidth={strokeWidth}
      className={className}
      title="Chat"
    />
  );
}

/** Social circles & mates icon */
export function BrandUsersIcon({ size = "sm", variant = "brand", className, strokeWidth = 2 }: BrandIconProps) {
  return (
    <Icon
      icon={Users}
      size={size}
      variant={variant}
      strokeWidth={strokeWidth}
      className={className}
      title="Community & Mates"
    />
  );
}
