import { AtSign, CalendarDays, Compass, Home, Inbox } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { enterEase } from "@/lib/motion";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { triggerHaptic } from "@/lib/native";
import { useVirtualKeyboard } from "@/lib/keyboard";
import { tabFromPath, type GuestTab } from "@/lib/tabs";

export { tabFromPath };

/** Companion IA: Home / Explore / Trips / Inbox / Me. Scan lives behind + Create. */
const TABS: { href: string; id: GuestTab; label: string; icon: typeof Home }[] = [
  { href: "/", id: "home", label: "Home", icon: Home },
  { href: "/explore", id: "explore", label: "Explore", icon: Compass },
  { href: "/plan", id: "trips", label: "Plan", icon: CalendarDays },
  { href: "/me/inbox", id: "inbox", label: "Inbox", icon: Inbox },
  { href: "/me", id: "me", label: "Me", icon: AtSign },
];

export function TabBar({ path, enter = false }: { path: string; enter?: boolean }) {
  const [, nav] = useLocation();
  const { user } = useAuth();
  const { mine } = useBio();
  const active = tabFromPath(path);
  const { isKeyboardOpen } = useVirtualKeyboard();
  const meHref = !user ? "/start" : mine?.handle ? `/@${mine.handle}` : "/bio/setup";

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
        <div className="relative mb-[max(0.75rem,env(safe-area-inset-bottom,0px))] flex items-center justify-between rounded-full apple-liquid-glass-dark px-2 py-1 text-white">
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
                  "relative flex h-12 min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 transition-all duration-200 cursor-pointer active:scale-95",
                  on ? "text-white font-bold" : "text-white/65 hover:text-white font-medium",
                )}
              >
                <span className="relative z-10 flex flex-col items-center justify-center gap-0.5">
                  {tab.id === "me" ? (
                    <span className="text-[17px] font-bold leading-none">@</span>
                  ) : (
                    <Icon size={22} strokeWidth={on ? 2.2 : 1.7} fill={on ? "currentColor" : "none"} />
                  )}
                  <span className="max-w-full truncate px-0.5 text-[11px] font-semibold tracking-tight">
                    {tab.label}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "h-1 w-1 rounded-full bg-white transition-opacity",
                      on ? "opacity-100" : "opacity-0",
                    )}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}
