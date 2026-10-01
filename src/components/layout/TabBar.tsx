import { AtSign, CalendarDays, Compass, Home, Inbox } from "@/components/icons";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { collection, limit, onSnapshot, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { cn } from "@/lib/cn";
import { enterEase } from "@/lib/motion";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { triggerHaptic } from "@/lib/native";
import { useVirtualKeyboard } from "@/lib/keyboard";
import { tabFromPath, type GuestTab } from "@/lib/tabs";

export { tabFromPath };

/** Shipped companion dock: Home / Explore / Trips / Inbox / Me. Scan & create live on CreateFab. */
const TABS: { href: string; id: GuestTab; label: string; icon: typeof Compass }[] = [
  { href: "/", id: "home", label: "Home", icon: Home },
  { href: "/explore", id: "explore", label: "Explore", icon: Compass },
  { href: "/plan", id: "trips", label: "Trips", icon: CalendarDays },
  { href: "/me/inbox", id: "inbox", label: "Inbox", icon: Inbox },
  { href: "/me", id: "me", label: "Me", icon: AtSign },
];

/** Live unread count for the Inbox tab: unanswered pings + unread activity. */
function useInboxUnread(uid: string | undefined): number {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!uid) {
      setUnread(0);
      return;
    }
    const db = getFirebaseDb();
    if (!db) return;
    let pings = 0;
    let activity = 0;
    const update = () => setUnread(Math.min(99, pings + activity));
    const offPing = onSnapshot(
      query(collection(db, "pings"), where("toUid", "==", uid), where("status", "==", "sent"), limit(20)),
      (snap) => {
        pings = snap.size;
        update();
      },
      () => undefined,
    );
    const offActivity = onSnapshot(
      query(collection(db, "promotion_notifications"), where("uid", "==", uid), where("read", "==", false), limit(20)),
      (snap) => {
        activity = snap.size;
        update();
      },
      () => undefined,
    );
    return () => {
      offPing();
      offActivity();
    };
  }, [uid]);
  return unread;
}

export function TabBar({ path, enter = false }: { path: string; enter?: boolean }) {
  const [, nav] = useLocation();
  const { user } = useAuth();
  const { mine } = useBio();
  const active = tabFromPath(path);
  const { isKeyboardOpen } = useVirtualKeyboard();
  const meHref = !user ? "/start" : mine?.handle ? `/@${mine.handle}` : "/bio/setup";
  const inboxUnread = useInboxUnread(user?.uid);

  return (
    <motion.nav
      className={cn(
        "fixed-element fixed inset-x-0 bottom-0 z-40 lg:hidden keyboard-hide transition-all duration-200 ease-out pointer-events-none",
        isKeyboardOpen && "translate-y-full opacity-0",
      )}
      aria-hidden={isKeyboardOpen}
      aria-label="Primary"
      initial={enter ? { opacity: 0, y: 24 } : false}
      animate={{ opacity: isKeyboardOpen ? 0 : 1, y: isKeyboardOpen ? 32 : 0 }}
      transition={{ duration: 0.25, ease: enterEase }}
    >
      <div className="relative mx-auto max-w-md pointer-events-auto px-4">
        <div className="apple-liquid-glass-dock relative mb-[max(0.75rem,env(safe-area-inset-bottom,0px))] flex items-center justify-between rounded-full p-1.5 text-ink">
          {TABS.map((tab) => {
            const on = active === tab.id;
            const href = tab.id === "me" ? meHref : tab.href;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={on ? "page" : undefined}
                aria-label={tab.id === "me" ? "My bio" : tab.label}
                onClick={() => {
                  void triggerHaptic("light");
                  nav(href);
                }}
                className={cn(
                  "relative flex h-12 min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 transition-all duration-200 cursor-pointer active:scale-90",
                  on ? "font-bold text-white" : "font-medium text-ink/60 hover:text-ink",
                )}
              >
                {on && (
                  <motion.span
                    layoutId="activeTabBadge"
                    className="absolute inset-x-1 inset-y-0.5 rounded-full bg-brand shadow-[0_8px_20px_-6px_rgba(18,22,20,0.28)]"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    aria-hidden
                  />
                )}
                <span className="relative z-10 flex flex-col items-center justify-center gap-0.5 transition-transform duration-150">
                  {tab.id === "me" ? (
                    <span className="text-[17px] font-bold leading-none">@</span>
                  ) : (
                    <span className="relative">
                      <Icon size={21} strokeWidth={on ? 2.3 : 1.75} fill={on ? "currentColor" : "none"} />
                      {tab.id === "inbox" && inboxUnread > 0 && (
                        <span
                          className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
                          aria-label={`${inboxUnread} unread`}
                        >
                          {inboxUnread > 9 ? "9+" : inboxUnread}
                        </span>
                      )}
                    </span>
                  )}
                  <span className="max-w-full truncate px-0.5 text-[11px] font-semibold tracking-tight">
                    {tab.label}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}
