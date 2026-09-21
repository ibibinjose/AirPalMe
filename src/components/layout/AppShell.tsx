import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { Search } from "lucide-react";
import { TabBar } from "./TabBar";
import { TopNav } from "./TopNav";
import { LocalNowBar } from "./LocalNowBar";
import { BatteryWarningBanner } from "./BatteryWarningBanner";
import { SyncStatusBar } from "./SyncStatusBar";
import { NetworkStatusToast } from "./NetworkStatusToast";
import { applyRouteMeta } from "@/lib/share-meta";
import { GlobalSearchModal, openGlobalSearch } from "@/components/search/GlobalSearchModal";
import { trackPageView } from "@/lib/analytics";
import { forceUnlockBodyScroll } from "@/hooks/useScrollLock";
import { GuestStayTools } from "@/components/stay/GuestStayTools";
import { BrandMark } from "@/components/brand/BrandMark";
import { ProfileMenu } from "@/components/auth/ProfileMenu";

import { NotificationBell } from "@/components/notifications/NotificationBell";

import { TicketAlertBar } from "@/components/host/TicketAlertBar";
import { NotificationPopup } from "@/components/notifications/NotificationPopup";
import { PresencePublisher } from "@/components/layout/PresencePublisher";
import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/cn";
import { enterEase, takeShellEnter } from "@/lib/motion";
import { parseAtHandle } from "@shared/bio";
import { shouldShowFooter } from "@/lib/footer-rules";
import { isNativeApp } from "@/lib/native";
import { SiteFooter } from "./SiteFooter";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useDataReload } from "@/hooks/useDataReload";
import { PullToRefreshContainer } from "./PullToRefreshContainer";
import { useLocalNow } from "@/hooks/useLocalNow";

const WORKSPACE = [
  /^\/host/,
  /^\/start/,
  /^\/admin/,
  /^\/partners/,
  /^\/join/,
  /^\/business/,
  /^\/event/,
  /^\/me/,
  /^\/zoo/,
  /^\/settings/,
  /^\/bio/,
  /^\/about/,
  /^\/contact/,
  /^\/privacy/,
  /^\/terms/,
  /^\/cookies/,
  /^\/legal/,
  /^\/club/,
];

export function AppShell({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const { t } = useLocale();
  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageView(path);
    applyRouteMeta(path);
    forceUnlockBodyScroll();
  }, [path]);
  const workspace = WORKSPACE.some((re) => re.test(path));
  // Plan detail + invite links own the bottom slot with their Share/RSVP bar —
  // rendering the tab bar too would stack two fixed bars on mobile.
  // (/plan/new keeps the tab bar: it has no action bar of its own.)
  const isPlanDetail = (path.startsWith("/plan/") && path !== "/plan/new") || path.startsWith("/invite/");
  const showFooter = !isNativeApp() && shouldShowFooter(path);
  const bare = Boolean(parseAtHandle(path));
  const reduce = useReducedMotion();
  const [play] = useState(() => !reduce && takeShellEnter());
  const { reloadAllData } = useDataReload();
  const pullToRefresh = usePullToRefresh({
    onRefresh: reloadAllData,
    threshold: 68,
    maxPull: 110,
    disabled: bare,
  });

  const chrome = play
    ? {
        initial: { opacity: 0, y: -12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.55, ease: enterEase, delay: 0.12 },
      }
    : {};

  const { day } = useLocalNow();

  return (
    <div className="flex min-h-[var(--visual-viewport-height,100dvh)] flex-col bg-paper">
      {bare ? (
        <main id="main-content" className="flex-1">
          {children}
        </main>
      ) : (
        <>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
          >
            Skip to content
          </a>
          <div className="fixed-element sticky top-0 z-30 bg-paper/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
            <TicketAlertBar />
            <LocalNowBar />
            {workspace ? (
              <header className="overflow-visible border-b border-line bg-paper">
                <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-3 sm:px-4 md:h-16 md:px-6">
                  <div className="flex items-center gap-2 min-w-0">
                    <Link href="/" className="flex items-center min-w-0">
                      <BrandMark compact={false} />
                    </Link>
                    <span className="text-[12px] font-semibold text-mute font-display">
                      {day}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={openGlobalSearch}
                      className="grid h-9 w-9 touch-manipulation place-items-center rounded-full text-mute hover:bg-card hover:text-ink ring-1 ring-line transition"
                      aria-label="Search"
                      title="Search AirPal (⌘K)"
                    >
                      <Search size={16} />
                    </button>
                    <Link
                      href="/"
                      aria-current={path === "/" ? "page" : undefined}
                      className={cn(
                        "hidden md:inline-flex h-9 touch-manipulation items-center rounded-full px-3 text-sm font-medium",
                        path === "/" ? "bg-brand text-white" : "text-mute hover:text-ink",
                      )}
                    >
                      {t("explore")}
                    </Link>
                    <Link
                      href="/calendar"
                      aria-current={path.startsWith("/calendar") ? "page" : undefined}
                      className={cn(
                        "hidden md:inline-flex h-9 touch-manipulation items-center rounded-full px-3 text-sm font-medium",
                        path.startsWith("/calendar") ? "bg-brand text-white" : "text-mute hover:text-ink",
                      )}
                    >
                      {t("calendar")}
                    </Link>

                    <NotificationBell />
                    <ProfileMenu />
                  </div>
                </div>
              </header>
            ) : (
              <>
                <TopNav path={path} enter={play} />
                <motion.div
                  {...chrome}
                  className="flex h-14 items-center justify-between border-b border-line/70 bg-paper/90 px-3 backdrop-blur-xl sm:px-4 lg:hidden"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Link href="/" className="flex items-center min-w-0" aria-label="AirPal Home">
                      <BrandMark compact={false} />
                    </Link>
                    <span className="text-[12px] font-semibold text-mute font-display">
                      {day}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={openGlobalSearch}
                      className="grid h-10 w-10 touch-manipulation place-items-center rounded-full text-mute hover:bg-card hover:text-ink ring-1 ring-line transition"
                      aria-label="Search"
                      title="Search AirPal (⌘K)"
                    >
                      <Search size={17} />
                    </button>

                    <NotificationBell />
                    <ProfileMenu />
                  </div>
                </motion.div>
              </>
            )}
            <BatteryWarningBanner />
            <SyncStatusBar />
          </div>
          <main id="main-content" className="flex-1 flex flex-col min-w-0" tabIndex={-1}>
            <PullToRefreshContainer state={pullToRefresh}>
              <div className={cn("flex-1", !showFooter && !workspace && "pb-28 lg:pb-8")}>{children}</div>
              {showFooter && <SiteFooter hasTabBar={!workspace} />}
            </PullToRefreshContainer>
          </main>
          {!workspace && !isPlanDetail && <TabBar path={path} enter={play} />}
          <PresencePublisher />
          <GuestStayTools />
          <GlobalSearchModal />
          <NetworkStatusToast />
          <NotificationPopup />
        </>
      )}
    </div>
  );
}
