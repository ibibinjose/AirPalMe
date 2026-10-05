import {
  Activity,
  BadgePercent,
  Building2,
  CalendarDays,
  CalendarPlus,
  Compass,
  Gift,
  Handshake,
  Headphones,
  Hotel,
  Images,
  Info,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  QrCode,
  Receipt,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Tag,
  Ticket,
  UserPlus,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface BrowseLink {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
}

export interface BrowseSection {
  title: string;
  links: BrowseLink[];
  /** Hosts-only sections render only for host accounts. */
  hostsOnly?: boolean;
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

/** Plan & Go: the plan loop pages. */
export const PLAN_LINKS: BrowseLink[] = [
  {
    href: "/plan",
    label: "My plans",
    icon: Users,
    match: (p) => p.startsWith("/plan") || p.startsWith("/invite"),
  },
  { href: "/plan/new", label: "New plan", icon: CalendarPlus, match: (p) => p === "/plan/new" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, match: (p) => p.startsWith("/calendar") },
];

/** Stay & Guide: guest concierge, guide, and scanning. */
export const GUIDE_LINKS: BrowseLink[] = [
  {
    href: "/concierge",
    label: "Concierge",
    icon: Building2,
    match: (p) => p.startsWith("/concierge") || p.startsWith("/g/"),
  },
  {
    href: "/guide",
    label: "Guide",
    icon: Compass,
    match: (p) => p.startsWith("/guide") || p.startsWith("/tour/"),
  },
  {
    href: "/scan",
    label: "Scan code",
    icon: QrCode,
    match: (p) => p.startsWith("/scan") || p.startsWith("/w/") || p.startsWith("/q/"),
  },
];

/** Business: partner surfaces and selling tools. */
export const BUSINESS_LINKS: BrowseLink[] = [
  {
    href: "/business",
    label: "Business hub",
    icon: Store,
    match: (p) => p.startsWith("/business") && !p.startsWith("/business/promotions"),
  },
  {
    href: "/partners",
    label: "Partners",
    icon: Handshake,
    match: (p) => p.startsWith("/partners") || p === "/partner",
  },
  { href: "/join", label: "Become a partner", icon: UserPlus, match: (p) => p.startsWith("/join") },
  {
    href: "/event",
    label: "Host an event",
    icon: Ticket,
    match: (p) => p === "/event" || p.startsWith("/event/"),
  },
  {
    href: "/business/promotions/new",
    label: "Create offer",
    icon: Gift,
    match: (p) => p === "/business/promotions/new",
  },
];

/** Account: the signed-in user's own pages. */
export const ACCOUNT_LINKS: BrowseLink[] = [
  { href: "/me", label: "Me dashboard", icon: UserRound, match: (p) => p === "/me" },
  { href: "/me/tickets", label: "My tickets", icon: Receipt, match: (p) => p.startsWith("/me/tickets") },
  { href: "/me/memories", label: "Memory wall", icon: Images, match: (p) => p.startsWith("/me/memories") },
  { href: "/settings", label: "Settings", icon: Settings, match: (p) => p.startsWith("/settings") },
];

/** Help & Trust: support, company, and install pages. */
export const HELP_LINKS: BrowseLink[] = [
  { href: "/help", label: "Help center", icon: LifeBuoy, match: (p) => p.startsWith("/help") },
  { href: "/assist", label: "Support", icon: Headphones, match: (p) => p.startsWith("/assist") },
  { href: "/contact", label: "Contact", icon: Mail, match: (p) => p.startsWith("/contact") },
  { href: "/about", label: "About", icon: Info, match: (p) => p.startsWith("/about") },
  { href: "/trust", label: "Trust & facts", icon: ShieldCheck, match: (p) => p.startsWith("/trust") },
  {
    href: "/getAirPalApp",
    label: "Get the app",
    icon: Smartphone,
    match: (p) => p.startsWith("/getAirPalApp") || p.startsWith("/getAirPal"),
  },
];

/** Full Browse dropdown sitemap, in display order. */
export const BROWSE_SECTIONS: BrowseSection[] = [
  { title: "Browse AirPal", links: BROWSE_LINKS },
  { title: "Plan & Go", links: PLAN_LINKS },
  { title: "Stay & Guide", links: GUIDE_LINKS },
  { title: "Business", links: BUSINESS_LINKS },
  { title: "Account", links: ACCOUNT_LINKS },
  { title: "Help & Trust", links: HELP_LINKS },
  { title: "Host", links: HOST_LINKS, hostsOnly: true },
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
