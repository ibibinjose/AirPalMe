import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Plus, Search } from "@/components/icons";
import { BrandMark } from "@/components/brand/BrandMark";
import { ProfileMenu } from "@/components/auth/ProfileMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { openGlobalSearch } from "@/components/search/openSearch";
import { openGlobalCreate } from "@/components/design-system/CreateFab";
import { cn } from "@/lib/cn";
import { enterEase } from "@/lib/motion";
import { triggerHaptic, triggerHapticSelection } from "@/lib/native";

import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { partnerAccountPath } from "@/lib/partner-account";
import { BrowseMenu } from "@/components/layout/BrowseMenu";
import { NAMES } from "@shared/names";

const LINKS = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/now", label: "Now", match: (p: string) => p.startsWith("/now") },
  {
    href: "/plan",
    label: "Plan",
    match: (p: string) => p.startsWith("/plan") || p.startsWith("/invite"),
  },
  {
    href: "/pass",
    label: "Pass",
    match: (p: string) => p.startsWith("/pass") || p.startsWith("/events") || p.startsWith("/deals"),
  },
  {
    href: "/me/tickets",
    label: "Tickets",
    match: (p: string) => p.startsWith("/me/tickets") || p.startsWith("/ticket"),
  },
];

export function TopNav({ path, enter = false }: { path: string; enter?: boolean }) {
  const [, nav] = useLocation();
  const { user, isHost } = useAuth();
  const { business } = useBio();

  const renderLink = (link: (typeof LINKS)[number]) => {
    const isActive = link.match(path);
    return (
      <button
        key={link.href}
        onClick={() => {
          void triggerHapticSelection();
          nav(link.href);
        }}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "h-8.5 touch-manipulation rounded-full px-3.5 text-sm font-semibold transition-all duration-200 cursor-pointer active:scale-95",
          isActive
            ? "bg-brand text-white shadow-[0_4px_12px_-4px_rgba(18,22,20,0.25)]"
            : "text-mute hover:bg-paper/80 hover:text-ink",
        )}
      >
        {link.label}
      </button>
    );
  };

  return (
    <motion.header
      className="hidden border-b border-line/60 bg-paper/75 backdrop-blur-2xl lg:block transition-colors duration-300"
      initial={enter ? { opacity: 0, y: -12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: enterEase, delay: 0.12 }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              void triggerHaptic("light");
              nav("/");
            }}
            className="shrink-0 text-left transition hover:opacity-90 cursor-pointer"
            aria-label="AirPal Home"
          >
            <BrandMark />
          </button>
        </div>
        <nav className="flex items-center justify-center gap-1 rounded-full bg-card/60 p-1 ring-1 ring-line/70 backdrop-blur-md">
          {LINKS.slice(0, 2).map(renderLink)}
          <BrowseMenu path={path} isHost={isHost} />
          {LINKS.slice(2).map(renderLink)}
        </nav>
        <div className="flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={() => {
              void triggerHaptic("light");
              openGlobalSearch();
            }}
            className="flex h-10 sm:h-9 min-h-[44px] sm:min-h-0 items-center gap-2 rounded-full bg-card/80 px-3 sm:px-3.5 text-xs font-medium text-mute ring-1 ring-line/80 hover:text-ink hover:bg-card hover:ring-brand/30 transition-all shadow-xs lg:h-10 cursor-pointer touch-manipulation"
            title="Search AirPal (⌘K)"
            aria-label="Search"
          >
            <Search size={15} className="text-accent" />
            <span className="hidden xl:inline">Search</span>
            <kbd className="hidden rounded border border-line bg-paper/90 px-1.5 py-0.5 text-[10px] font-semibold text-mute xl:inline-block">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={() => {
              void triggerHaptic("medium");
              openGlobalCreate();
            }}
            className="flex h-9 items-center gap-1.5 shrink-0 rounded-full bg-brand px-3.5 text-sm font-semibold text-white shadow-[0_4px_12px_-4px_rgba(18,22,20,0.22)] hover:bg-brand-ink transition active:scale-95 lg:h-10 cursor-pointer"
            aria-label="Create something new"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Create</span>
          </button>

          <button
            onClick={() => {
              void triggerHaptic("light");
              nav("/scan");
            }}
            className="hidden xl:inline-flex h-9 shrink-0 items-center rounded-full bg-card px-3.5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-paper hover:text-accent transition active:scale-95 lg:h-10 cursor-pointer"
            title="Scan QR / Room"
          >
            Scan
          </button>
          {isHost ? (
            <button
              onClick={() => {
                void triggerHaptic("light");
                nav("/host");
              }}
              className="hidden xl:inline-flex h-9 shrink-0 items-center rounded-full bg-card px-4 text-sm font-semibold ring-1 ring-line hover:bg-paper transition lg:h-10 cursor-pointer"
            >
              Host
            </button>
          ) : (
            <button
              onClick={() => {
                void triggerHaptic("light");
                nav(partnerAccountPath({ signedIn: Boolean(user), hasPlace: Boolean(business) }));
              }}
              aria-label={NAMES.partnerAccount}
              className="hidden xl:inline-flex h-9 shrink-0 items-center rounded-full bg-card px-4 text-sm font-semibold ring-1 ring-line hover:bg-paper transition active:scale-95 lg:h-10 cursor-pointer"
            >
              {NAMES.partnerAccount}
            </button>
          )}
          <NotificationBell />
          <ProfileMenu />
        </div>
      </div>
    </motion.header>
  );
}
