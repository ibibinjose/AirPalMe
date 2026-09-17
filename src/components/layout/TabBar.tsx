import { AtSign, BedDouble, CalendarDays, Compass, QrCode } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { bioPath } from "@shared/bio";
import { cn } from "@/lib/cn";
import { enterEase } from "@/lib/motion";
import { useBio } from "@/contexts/BioContext";
import { useLocale } from "@/contexts/LocaleContext";
import { triggerHaptic } from "@/lib/native";
import { useVirtualKeyboard } from "@/lib/keyboard";
import { tabFromPath } from "@/lib/tabs";

export { tabFromPath };

// Primary mobile tabs: Explore / Plan / Scan (center) / Stay / Mates.
// Matches GuestTab in lib/tabs so every tab can actually light up.
const SIDES = {
  left: [
    { href: "/", id: "explore", labelKey: "explore", icon: Compass },
    { href: "/plan", id: "plan", labelKey: "plan", icon: CalendarDays },
  ],
  right: [
    { href: "/concierge", id: "stay", labelKey: "stay", icon: BedDouble },
    // Your public bio: airpal.me/@you, or setup when you have no handle yet.
    { href: "/bio/setup", id: "you", labelKey: "you", icon: AtSign },
  ],
} as const;

function TabItem({
  href,
  id,
  labelKey,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  id: string;
  labelKey: string;
  icon: typeof Compass;
  active: string;
  onClick: (href: string) => void;
}) {
  const { t } = useLocale();
  const on = active === id;

  return (
    <button
      type="button"
      aria-current={on ? "page" : undefined}
      onClick={() => {
        void triggerHaptic("light");
        onClick(href);
      }}
      className={cn(
        "relative flex h-12 min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-2xl transition-all duration-200 cursor-pointer",
        on
          ? "text-white font-extrabold"
          : "text-white/60 hover:text-white/90 active:scale-95 font-medium"
      )}
    >
      {on && (
        <motion.div
          layoutId="activeTabPill"
          className="absolute inset-x-1 inset-y-1 rounded-2xl bg-brand/80 border border-white/20 shadow-md shadow-brand/40"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10 flex flex-col items-center justify-center gap-0.5">
        <Icon size={20} strokeWidth={on ? 2.5 : 1.8} className={cn("transition-transform", on && "scale-110")} />
        <span className="text-[11px] font-semibold tracking-tight">{t(labelKey) || id}</span>
      </span>
    </button>
  );
}

export function TabBar({ path, enter = false }: { path: string; enter?: boolean }) {
  const [, nav] = useLocation();
  const { t } = useLocale();
  const active = tabFromPath(path);
  const { isKeyboardOpen } = useVirtualKeyboard();
  const { mine } = useBio();
  const scanOn = active === "scan";
  const youHref = mine?.handle ? bioPath(mine.handle) : "/bio/setup";

  return (
    <motion.nav
      className={cn(
        "fixed-element safe-bottom fixed inset-x-0 bottom-0 z-40 lg:hidden keyboard-hide transition-all duration-200 ease-out pointer-events-none",
        isKeyboardOpen && "translate-y-full opacity-0",
      )}
      aria-hidden={isKeyboardOpen}
      initial={enter ? { opacity: 0, y: 24 } : false}
      animate={{ opacity: isKeyboardOpen ? 0 : 1, y: isKeyboardOpen ? 32 : 0 }}
      transition={{ duration: 0.25, ease: enterEase }}
    >
      <div className="relative mx-auto max-w-md px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pointer-events-auto">
        {/* Floating Dark Glass Dock Shell */}
        <div className="relative flex items-center justify-between rounded-3xl border-2 border-white/10 bg-slate-950/90 p-1.5 backdrop-blur-2xl shadow-2xl shadow-slate-950/60 text-white">
          
          {/* Left Navigation Items */}
          <div className="flex flex-1 items-center gap-1">
            {SIDES.left.map((tab) => (
              <TabItem key={tab.id} {...tab} active={active} onClick={nav} />
            ))}
          </div>

          {/* Center Elevated Floating Hero Action Button */}
          <div className="relative flex h-12 w-14 shrink-0 items-center justify-center">
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("medium");
                nav("/scan");
              }}
              aria-label={t("scan") || "Scan QR"}
              aria-current={scanOn ? "page" : undefined}
              className="absolute -top-5 flex flex-col items-center group cursor-pointer"
            >
              <span
                className={cn(
                  "relative grid h-14 w-14 place-items-center rounded-full border-4 border-slate-950 shadow-xl transition-transform duration-200 group-hover:scale-105 active:scale-95",
                  scanOn ? "bg-gold text-ink shadow-gold/50" : "bg-brand text-white shadow-brand/50",
                )}
              >
                <QrCode size={22} className="group-hover:rotate-12 transition-transform duration-300" />
                {!scanOn && (
                  <span className="absolute -inset-0.5 motion-safe:animate-pulse rounded-full bg-brand/30 blur-md pointer-events-none" />
                )}
              </span>
            </button>
          </div>

          {/* Right Navigation Items */}
          <div className="flex flex-1 items-center gap-1">
            {SIDES.right.map((tab) => (
              <TabItem
                key={tab.id}
                {...tab}
                href={tab.id === "you" ? youHref : tab.href}
                active={active}
                onClick={nav}
              />
            ))}
          </div>

        </div>
      </div>
    </motion.nav>
  );
}
