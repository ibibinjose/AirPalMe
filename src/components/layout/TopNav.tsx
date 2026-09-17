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

import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";

// Primary guest tabs mirror the mobile TabBar: Explore / Plan / Stay.
// Calendar + Guide are one tap away inside Explore and global search (⌘K). Mate lives at /mate.
const LINKS = [
  { href: "/", id: "explore", key: "explore" },
  { href: "/plan", id: "plan", key: "plan" },
  { href: "/concierge", id: "stay", key: "stay" },
] as const;

export function TopNav({ path, enter = false }: { path: string; enter?: boolean }) {
  const [, nav] = useLocation();
  const { t } = useLocale();
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
        <button onClick={() => nav("/")} className="shrink-0 text-left focus:outline-none" aria-label="AirPal Home">
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
                active === link.id ? "bg-ink text-white" : "text-mute hover:text-ink",
              )}
            >
              {t(link.key)}
            </button>
          ))}
        </nav>
        <div className="flex items-center justify-end gap-1.5 shrink-0 lg:gap-2">
          <button
            onClick={openGlobalSearch}
            className="flex h-9 items-center gap-2 rounded-full bg-paper px-3 text-xs font-medium text-mute ring-1 ring-line hover:text-ink hover:bg-card transition lg:h-10 lg:px-3.5"
            title="Search AirPal (⌘K)"
          >
            <Search size={15} className="text-gold" />
            <span className="hidden xl:inline">Search</span>
            <kbd className="hidden rounded border border-line bg-card px-1.5 py-0.5 text-[10px] font-semibold text-mute xl:inline-block">
              ⌘K
            </kbd>
          </button>
          
          <button
            onClick={() => nav("/scan")}
            className="h-9 shrink-0 rounded-full bg-brand px-3.5 text-sm font-medium text-white lg:h-10 lg:px-4"
          >
            {t("scan")}
          </button>
          {isHost ? (
            <button
              onClick={() => nav("/host")}
              className="h-9 shrink-0 rounded-full bg-white px-3.5 text-sm font-medium ring-1 ring-line lg:h-10 lg:px-4"
            >
              {t("host")}
            </button>
          ) : (
            <button
              onClick={() => nav("/join")}
              aria-label="Become a Host"
              className="h-9 shrink-0 rounded-full bg-white px-3.5 text-sm font-medium ring-1 ring-line hover:bg-paper transition lg:h-10 lg:px-4"
            >
              <span className="hidden xl:inline">Become a </span>Host
            </button>
          )}
          <NotificationBell />
          <ProfileMenu />
        </div>
      </div>
    </motion.header>
  );
}
