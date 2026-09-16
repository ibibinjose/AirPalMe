import { BedDouble, Compass, QrCode, Users } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { enterEase } from "@/lib/motion";
import { useLocale } from "@/contexts/LocaleContext";
import { triggerHaptic } from "@/lib/native";
import { useVirtualKeyboard } from "@/lib/keyboard";

// Primary guest tabs: Scan (center) / Stay / Explore / Plan.
// Calendar, Guide, and markers live inside Explore + global search. Mate lives at /mate.
const SIDES = {
  left: [
    { href: "/", id: "explore", labelKey: "explore", icon: Compass },
    { href: "/plan", id: "plan", labelKey: "plan", icon: Users },
  ],
  right: [{ href: "/concierge", id: "stay", labelKey: "stay", icon: BedDouble }],
} as const;

import { tabFromPath } from "@/lib/tabs";

export { tabFromPath };

function Item({
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
      onClick={() => {
        void triggerHaptic("light");
        onClick(href);
      }}
      className={cn(
        "flex min-h-11 flex-1 touch-manipulation flex-col items-center justify-center gap-1 py-1.5",
        on ? "text-brand" : "text-mute",
      )}
    >
      <Icon size={20} strokeWidth={on ? 2.4 : 1.8} />
      <span className="text-[10px] font-medium">{t(labelKey)}</span>
    </button>
  );
}

export function TabBar({ path, enter = false }: { path: string; enter?: boolean }) {
  const [, nav] = useLocation();
  const { t } = useLocale();
  const active = tabFromPath(path);
  const { isKeyboardOpen } = useVirtualKeyboard();

  return (
    <motion.nav
      className={cn(
        "fixed-element safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-card/92 pt-2 backdrop-blur-xl lg:hidden keyboard-hide transition-all duration-200 ease-out",
        isKeyboardOpen && "pointer-events-none translate-y-full opacity-0",
      )}
      aria-hidden={isKeyboardOpen}
      initial={enter ? { opacity: 0, y: 24 } : false}
      animate={{ opacity: isKeyboardOpen ? 0 : 1, y: isKeyboardOpen ? 32 : 0 }}
      transition={{ duration: 0.25, ease: enterEase }}
    >
      <div className="relative mx-auto flex max-w-lg items-end px-2">
        <div className="flex flex-1">
          {SIDES.left.map((tab) => (
            <Item key={tab.id} {...tab} active={active} onClick={nav} />
          ))}
        </div>
        <div className="w-16 shrink-0" />
        <div className="flex flex-1 justify-end">
          {SIDES.right.map((tab) => (
            <Item key={tab.id} {...tab} active={active} onClick={nav} />
          ))}
        </div>
        <button
          onClick={() => {
            void triggerHaptic("medium");
            nav("/scan");
          }}
          aria-label={t("scan")}
          className="absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-6 flex-col items-center"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-lg shadow-brand/30">
            <QrCode size={22} />
          </span>
        </button>
      </div>
    </motion.nav>
  );
}
