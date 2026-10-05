import {
  Activity,
  BadgePercent,
  CalendarDays,
  Hotel,
  LayoutDashboard,
  Sparkles,
  Tag,
  type LucideIcon,
} from "lucide-react";

export interface BrowseLink {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
}

/**
 * Main parent categories for browsing guests (never hosts-only). Every entry
 * points at a real discovery surface — no dead menu items.
 */
export const BROWSE_LINKS: BrowseLink[] = [
  { href: "/stay", label: "Stay", icon: Hotel, match: (p) => p.startsWith("/stay") },
  {
    href: "/events",
    label: "Events",
    icon: CalendarDays,
    match: (p) => p.startsWith("/events") || p.startsWith("/calendar") || p.startsWith("/e/"),
  },
  {
    href: "/deals",
    label: "Offers & Deals",
    icon: BadgePercent,
    match: (p) => p.startsWith("/offers") || p.startsWith("/deals") || p.startsWith("/promotions"),
  },
  {
    href: "/now",
    label: "What now?",
    icon: Sparkles,
    match: (p) => p.startsWith("/now"),
  },
];

/** Host shortcuts: everything a host needs, one tap from the browse menu. */
export const HOST_LINKS: BrowseLink[] = [
  { href: "/host", label: "Host dashboard", icon: LayoutDashboard, match: (p) => p === "/host" },
  {
    href: "/host/pulse",
    label: "Guest ratings",
    icon: Activity,
    match: (p) => p.startsWith("/host/pulse"),
  },
  {
    href: "/business/promotions",
    label: "Promotions",
    icon: Tag,
    match: (p) => p.startsWith("/business/promotions"),
  },
];

const STRIP_PREFIXES = [
  "/explore",
  "/now",
  "/stay",
  "/events",
  "/calendar",
  "/e/",
  "/offers",
  "/deals",
  "/promotions",
];

/** Mobile category strip shows on Home and browse-context routes only. */
export function showBrowseStrip(path: string): boolean {
  if (path === "/") return true;
  return STRIP_PREFIXES.some((prefix) => path.startsWith(prefix));
}
