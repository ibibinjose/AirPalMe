import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { TabBar } from "./TabBar";
import { TopNav } from "./TopNav";
import { BrowseStrip } from "./BrowseMenu";
import { isWorkspacePath } from "@/lib/workspace";
import { showBrowseStrip } from "@/lib/browse-menu";
import { LocalNowBar } from "./LocalNowBar";
import { BatteryWarningBanner } from "./BatteryWarningBanner";
import { SyncStatusBar } from "./SyncStatusBar";
import { NetworkStatusToast } from "./NetworkStatusToast";
import { applyRouteMeta } from "@/lib/share-meta";
import {
  OPEN_SEARCH_EVENT,
  SEARCH_READY_EVENT,
  openGlobalSearch,
} from "@/components/search/openSearch";
import { onIdle } from "@/lib/on-idle";

// Search modal (catalog + stores) stays out of the boot bundle: mount on first
// open request, preloaded at idle so the first tap is instant.
const GlobalSearchModal = lazy(() =>
  import("@/components/search/GlobalSearchModal").then((m) => ({ default: m.GlobalSearchModal })),
);
import { trackPageView } from "@/lib/analytics";
import { forceUnlockBodyScroll } from "@/hooks/useScrollLock";
import { GuestStayTools } from "@/components/stay/GuestStayTools";
import { BrandMark } from "@/components/brand/BrandMark";
import { ProfileMenu } from "@/components/auth/ProfileMenu";

import { NotificationBell } from "@/components/notifications/NotificationBell";

import { TicketAlertBar } from "@/components/host/TicketAlertBar";
import { NotificationPopup } from "@/components/notifications/NotificationPopup";
import { PresencePublisher } from "@/components/layout/PresencePublisher";
import { DeviceMirror } from "@/components/layout/DeviceMirror";
import { cn } from "@/lib/cn";
import { enterEase, takeShellEnter } from "@/lib/motion";
import { parseAtHandle } from "@shared/bio";
import { shouldShowFooter } from "@/lib/footer-rules";
import { isNativeApp, triggerHaptic } from "@/lib/native";
import { SiteFooter } from "./SiteFooter";
import { CreateFab, openGlobalCreate } from "@/components/design-system/CreateFab";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useDataReload } from "@/hooks/useDataReload";
import { PullToRefreshContainer } from "./PullToRefreshContainer";

export function AppShell({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageView(path);
    applyRouteMeta(path);
    forceUnlockBodyScroll();
  }, [path]);
  const workspace = isWorkspacePath(path);
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

  // Arm the lazy search modal on first open request; flush the queued open once
  // the chunk mounts (the modal announces itself via SEARCH_READY_EVENT).
  const [searchArmed, setSearchArmed] = useState(false);
  const armedRef = useRef(false);
  const pendingSearch = useRef<{ detail: unknown } | null>(null);
  const flushingSearch = useRef(false);
  useEffect(() => {
    const queueOpen = (detail: unknown) => {
      if (armedRef.current) return;
      armedRef.current = true;
      pendingSearch.current = { detail };
      setSearchArmed(true);
    };
    const arm = (e: Event) => {
      if (flushingSearch.current) return;
      queueOpen((e as CustomEvent).detail);
    };
    // Pre-mount ⌘K/Ctrl+K: once mounted the modal owns the shortcut itself.
    const armOnKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && !armedRef.current) {
        e.preventDefault();
        queueOpen(undefined);
      }
    };
    const flush = () => {
      const pending = pendingSearch.current;
      if (!pending) return;
      pendingSearch.current = null;
      flushingSearch.current = true;
      window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT, { detail: pending.detail }));
      flushingSearch.current = false;
    };
    window.addEventListener(OPEN_SEARCH_EVENT, arm);
    window.addEventListener("keydown", armOnKey);
    window.addEventListener(SEARCH_READY_EVENT, flush);
    const cancelPreload = onIdle(() => {
      void import("@/components/search/GlobalSearchModal");
    });
    return () => {
      window.removeEventListener(OPEN_SEARCH_EVENT, arm);
      window.removeEventListener("keydown", armOnKey);
      window.removeEventListener(SEARCH_READY_EVENT, flush);
      cancelPreload();
    };
  }, []);

  const chrome = play
    ? {
        initial: { opacity: 0, y: -12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.55, ease: enterEase, delay: 0.12 },
      }
    : {};

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
          <div className="fixed-element sticky top-0 z-40 bg-paper/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
            <TicketAlertBar />
            <LocalNowBar />
            {workspace ? (
              <header className="overflow-visible border-b border-line bg-paper">
                <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-3 sm:px-4 md:h-16 md:px-6">
                  <div className="flex items-center gap-2 min-w-0">
                    <Link href="/" className="flex items-center min-w-0">
                      <BrandMark compact={false} />
                    </Link>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        void triggerHaptic("medium");
                        openGlobalCreate();
                      }}
                      className="relative grid h-9 w-9 touch-manipulation place-items-center rounded-full text-accent bg-brand/10 hover:bg-brand/20 ring-1 ring-brand/25 transition cursor-pointer after:absolute after:-inset-1 after:content-['']"
                      aria-label="Create something new"
                      title="Create (+)"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      onClick={openGlobalSearch}
                      className="relative grid h-9 w-9 touch-manipulation place-items-center rounded-full text-mute hover:bg-card hover:text-ink ring-1 ring-line transition after:absolute after:-inset-1 after:content-['']"
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
                      Home
                    </Link>
                    <Link
                      href="/now"
                      aria-current={path.startsWith("/now") ? "page" : undefined}
                      className={cn(
                        "hidden md:inline-flex h-9 touch-manipulation items-center rounded-full px-3 text-sm font-medium",
                        path.startsWith("/now") ? "bg-brand text-white" : "text-mute hover:text-ink",
                      )}
                    >
                      Now
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
                  className="apple-liquid-glass-nav flex h-14 items-center justify-between px-3.5 sm:px-4 lg:hidden transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Link href="/" className="flex items-center min-w-0" aria-label="AirPal Home">
                      <BrandMark compact={false} />
                    </Link>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        void triggerHaptic("medium");
                        openGlobalCreate();
                      }}
                      className="relative grid h-9 w-9 touch-manipulation place-items-center rounded-full text-accent bg-brand/10 hover:bg-brand/20 ring-1 ring-brand/25 transition-transform active:scale-95 cursor-pointer after:absolute after:-inset-1 after:content-['']"
                      aria-label="Create something new"
                      title="Create (+)"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void triggerHaptic("medium");
                        openGlobalSearch();
                      }}
                      className="relative grid h-9 w-9 touch-manipulation place-items-center rounded-full text-mute hover:bg-card hover:text-ink ring-1 ring-line transition-transform active:scale-95 cursor-pointer after:absolute after:-inset-1 after:content-['']"
                      aria-label="Search"
                      title="Search AirPal (⌘K)"
                    >
                      <Search size={16} />
                    </button>

                    <NotificationBell />
                    <ProfileMenu />
                  </div>
                </motion.div>
                {showBrowseStrip(path) && <BrowseStrip path={path} />}
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
          <CreateFab />
          <PresencePublisher />
          <DeviceMirror />
          <GuestStayTools />
          {searchArmed && (
            <Suspense fallback={null}>
              <GlobalSearchModal />
            </Suspense>
          )}
          <NetworkStatusToast />
          <NotificationPopup />
        </>
      )}
    </div>
  );
}
