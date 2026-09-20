import { AtSign, BedDouble, CalendarDays, QrCode, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { enterEase } from "@/lib/motion";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { triggerHaptic } from "@/lib/native";
import { useVirtualKeyboard } from "@/lib/keyboard";
import { tabFromPath, type GuestTab } from "@/lib/tabs";
import { saveDoor, type DoorId } from "@/lib/door";

export { tabFromPath };

const SIDES = {
  left: [
    { href: "/", id: "explore" as const, labelKey: "whatsOn", icon: Sparkles },
    { href: "/plan", id: "plan" as const, labelKey: "plan", icon: CalendarDays },
  ],
  right: [
    { href: "/concierge", id: "stay" as const, labelKey: "stay", icon: BedDouble },
    { href: "/me", id: "me" as const, labelKey: "atMe", icon: AtSign },
  ],
};

function TabItem({
  href,
  id,
  labelKey,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  id: GuestTab;
  labelKey: string;
  icon: typeof Sparkles;
  active: string;
  onClick: (href: string) => void;
}) {
  const { t } = useLocale();
  const on = active === id;
  const label = id === "me" ? "Me" : t(labelKey) || id;

  return (
    <button
      type="button"
      aria-current={on ? "page" : undefined}
      aria-label={id === "explore" ? "What's on" : id === "me" ? "My bio" : t(labelKey) || id}
      onClick={() => {
        void triggerHaptic("light");
        if (id === "explore" || id === "plan" || id === "stay") saveDoor(id as DoorId);
        onClick(href);
      }}
      className={cn(
        "relative flex h-11 min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 transition-all duration-200 cursor-pointer active:scale-95",
        on ? "text-white font-extrabold" : "text-white/70 hover:text-white font-medium",
      )}
    >
      <span className="relative z-10 flex flex-col items-center justify-center gap-0">
        {id === "me" ? (
          <span className={cn("text-[17px] font-bold leading-none", on && "scale-110")}>@</span>
        ) : (
          <Icon size={20} strokeWidth={on ? 2.5 : 1.8} className={cn("transition-transform", on && "scale-110")} />
        )}
        <span className="max-w-full truncate px-0.5 text-[11px] font-semibold tracking-tight">{label}</span>
      </span>
    </button>
  );
}

export function TabBar({ path, enter = false }: { path: string; enter?: boolean }) {
  const [, nav] = useLocation();
  const { t } = useLocale();
  const { user } = useAuth();
  const { mine } = useBio();
  const active = tabFromPath(path);
  const { isKeyboardOpen } = useVirtualKeyboard();
  const meHref = !user ? "/start" : mine?.handle ? `/@${mine.handle}` : "/bio/setup";
  const scanOn = active === "scan";

  return (
    <motion.nav
      className={cn(
        "fixed-element fixed inset-x-0 bottom-0 z-40 lg:hidden keyboard-hide transition-all duration-200 ease-out pointer-events-none",
        isKeyboardOpen && "translate-y-full opacity-0",
      )}
      aria-hidden={isKeyboardOpen}
      initial={enter ? { opacity: 0, y: 24 } : false}
      animate={{ opacity: isKeyboardOpen ? 0 : 1, y: isKeyboardOpen ? 32 : 0 }}
      transition={{ duration: 0.25, ease: enterEase }}
    >
      <div className="relative mx-auto max-w-md pointer-events-auto">
        <div className="relative flex items-center justify-between rounded-t-3xl apple-liquid-glass-dark px-2.5 pt-1 pb-[env(safe-area-inset-bottom,0px)] text-white">
          <div className="flex flex-1 items-center gap-1">
            {SIDES.left.map((tab) => (
              <TabItem key={tab.id} {...tab} active={active} onClick={nav} />
            ))}
          </div>

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
                  "relative grid h-14 w-14 place-items-center overflow-hidden rounded-full border-4 border-slate-950 shadow-xl transition-transform duration-200 group-hover:scale-105 active:scale-95",
                  scanOn ? "bg-gold text-ink shadow-gold/50" : "bg-brand text-white shadow-brand/50",
                )}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-2 top-1 h-1/2 rounded-full bg-gradient-to-b from-white/45 to-white/0"
                />
                <QrCode size={22} className="group-hover:rotate-12 transition-transform duration-300" />
                {!scanOn && (
                  <span className="absolute -inset-0.5 motion-safe:animate-pulse rounded-full bg-brand/30 blur-md pointer-events-none" />
                )}
              </span>
            </button>
          </div>

          <div className="flex flex-1 items-center gap-1">
            {SIDES.right.map((tab) => (
              <TabItem key={tab.id} {...tab} href={tab.id === "me" ? meHref : tab.href} active={active} onClick={nav} />
            ))}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
