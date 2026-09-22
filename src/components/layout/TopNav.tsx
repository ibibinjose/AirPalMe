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

const LINKS = [
  { href: "/", label: "Home", id: "home" as const },
  { href: "/explore", label: "Explore", id: "explore" as const },
  { href: "/plan", label: "Plan", id: "trips" as const },
  { href: "/me/inbox", label: "Inbox", id: "inbox" as const },
];

export function TopNav({ path, enter = false }: { path: string; enter?: boolean }) {
  const [, nav] = useLocation();
  const { isHost } = useAuth();
  const active = tabFromPath(path);
  return (
    <motion.header
      className="hidden border-b border-line/70 bg-paper/90 backdrop-blur-xl lg:block"
      initial={enter ? { opacity: 0, y: -12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: enterEase, delay: 0.12 }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
        <button onClick={() => nav("/")} className="shrink-0 text-left" aria-label="AirPal Home">
          <BrandMark />
        </button>
        <nav className="flex items-center justify-center gap-1">
          {LINKS.map((link) => (
            <button
              key={link.id}
              onClick={() => nav(link.href)}
              aria-current={active === link.id ? "page" : undefined}
              className={cn(
                "h-9 touch-manipulation rounded-full px-3 text-sm font-medium lg:h-10 lg:px-4",
                active === link.id ? "bg-brand text-white" : "text-mute hover:text-ink",
              )}
            >
              {link.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center justify-end gap-1.5 shrink-0 lg:gap-2">
          <button
            onClick={openGlobalSearch}
            className="flex h-9 items-center gap-2 rounded-full bg-paper px-3 text-xs font-medium text-mute ring-1 ring-line hover:text-ink hover:bg-card transition lg:h-10 lg:px-3.5"
            title="Search AirPal (⌘K)"
            aria-label="Search"
          >
            <Search size={15} className="text-brand" />
            <span className="hidden xl:inline">Search</span>
            <kbd className="hidden rounded border border-line bg-card px-1.5 py-0.5 text-[10px] font-semibold text-mute xl:inline-block">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={() => nav("/scan")}
            className="h-9 shrink-0 rounded-full bg-brand px-3.5 text-sm font-medium text-white lg:h-10 lg:px-4"
          >
            Scan
          </button>
          {isHost ? (
            <button
              onClick={() => nav("/host")}
              className="h-9 shrink-0 rounded-full bg-white px-3.5 text-sm font-medium ring-1 ring-line lg:h-10 lg:px-4"
            >
              Host
            </button>
          ) : (
            <button
              onClick={() => nav("/join")}
              aria-label="Add your place"
              className="h-9 shrink-0 rounded-full bg-white px-3.5 text-sm font-medium ring-1 ring-line hover:bg-paper transition lg:h-10 lg:px-4"
            >
              Add your place
            </button>
          )}
          <NotificationBell />
          <ProfileMenu />
        </div>
      </div>
    </motion.header>
  );
}
