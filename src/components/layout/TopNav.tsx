import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { ProfileMenu } from "@/components/auth/ProfileMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { openGlobalSearch } from "@/components/search/GlobalSearchModal";
import { cn } from "@/lib/cn";
import { enterEase } from "@/lib/motion";
import { tabFromPath } from "@/lib/tabs";

import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { partnerAccountPath } from "@/lib/partner-account";
import { NAMES } from "@shared/names";

const LINKS = [
  { href: "/", label: "Home", id: "home" as const },
  { href: "/explore", label: "Explore", id: "explore" as const },
  { href: "/plan", label: "Plan", id: "trips" as const },
  { href: "/me/inbox", label: "Inbox", id: "inbox" as const },
];

export function TopNav({ path, enter = false }: { path: string; enter?: boolean }) {
  const [, nav] = useLocation();
  const { user, isHost } = useAuth();
  const { business } = useBio();
  const active = tabFromPath(path);
  return (
    <motion.header
      className="sticky top-0 z-30 hidden border-b border-line/60 bg-paper/75 backdrop-blur-2xl lg:block transition-colors duration-300"
      initial={enter ? { opacity: 0, y: -12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: enterEase, delay: 0.12 }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
        <button onClick={() => nav("/")} className="shrink-0 text-left transition hover:opacity-90" aria-label="AirPal Home">
          <BrandMark />
        </button>
        <nav className="flex items-center justify-center gap-1 rounded-full bg-card/60 p-1 ring-1 ring-line/70 backdrop-blur-md">
          {LINKS.map((link) => (
            <button
              key={link.id}
              onClick={() => nav(link.href)}
              aria-current={active === link.id ? "page" : undefined}
              className={cn(
                "h-8.5 touch-manipulation rounded-full px-4 text-sm font-semibold transition-all duration-200",
                active === link.id
                  ? "bg-brand text-white shadow-[0_4px_12px_-4px_rgba(24,5,219,0.7)]"
                  : "text-mute hover:bg-paper/80 hover:text-ink",
              )}
            >
              {link.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={openGlobalSearch}
            className="flex h-9 items-center gap-2 rounded-full bg-card/80 px-3.5 text-xs font-medium text-mute ring-1 ring-line/80 hover:text-ink hover:bg-card hover:ring-brand/30 transition-all shadow-xs lg:h-10"
            title="Search AirPal (⌘K)"
            aria-label="Search"
          >
            <Search size={15} className="text-brand" />
            <span className="hidden xl:inline">Search</span>
            <kbd className="hidden rounded border border-line bg-paper/90 px-1.5 py-0.5 text-[10px] font-semibold text-mute xl:inline-block">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={() => nav("/scan")}
            className="h-9 shrink-0 rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-[0_4px_12px_-4px_rgba(24,5,219,0.6)] hover:bg-brand-ink transition active:scale-95 lg:h-10"
          >
            Scan
          </button>
          {isHost ? (
            <button
              onClick={() => nav("/host")}
              className="h-9 shrink-0 rounded-full bg-card px-4 text-sm font-semibold ring-1 ring-line hover:bg-paper transition lg:h-10"
            >
              Host
            </button>
          ) : (
            <button
              onClick={() => nav(partnerAccountPath({ signedIn: Boolean(user), hasPlace: Boolean(business) }))}
              aria-label={NAMES.partnerAccount}
              className="h-9 shrink-0 rounded-full bg-card px-4 text-sm font-semibold ring-1 ring-line hover:bg-paper transition active:scale-95 lg:h-10"
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
