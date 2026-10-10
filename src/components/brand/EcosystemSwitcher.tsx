import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, Ticket } from "lucide-react";
import { ECOSYSTEM } from "@/lib/brand";
import { isPassApp } from "@/lib/app-flavor";
import { triggerHapticSelection } from "@/lib/native";
import { cn } from "@/lib/cn";

export type EcosystemMode = "me" | "pass";

/**
 * Determine the ecosystem lens from the active route path.
 */
export function getEcosystemMode(path: string): EcosystemMode {
  if (
    path === "/pass" ||
    path.startsWith("/pass/") ||
    path.startsWith("/events") ||
    path.startsWith("/e/") ||
    path.startsWith("/deals") ||
    path.startsWith("/me/tickets") ||
    path.startsWith("/ticket/") ||
    path === "/event" ||
    path.startsWith("/event/") ||
    path.startsWith("/scan") ||
    path.startsWith("/stay") ||
    path.startsWith("/host") ||
    path.startsWith("/business") ||
    path.startsWith("/partners") ||
    path === "/partner" ||
    path.startsWith("/concierge")
  ) {
    return "pass";
  }
  return "me";
}

interface EcosystemSwitcherProps {
  currentPath?: string;
  variant?: "header" | "pill" | "banner" | "compact";
  className?: string;
}

export function EcosystemSwitcher({
  currentPath,
  variant = "header",
  className,
}: EcosystemSwitcherProps) {
  const [location, nav] = useLocation();
  // Native Pass shell is pass-only: no cross-surface switcher (web unaffected).
  if (isPassApp()) return null;
  const path = currentPath ?? location;
  const activeMode = getEcosystemMode(path);

  const handleSelect = (mode: EcosystemMode) => {
    if (mode === activeMode) return;
    void triggerHapticSelection();
    if (mode === "pass") {
      nav(ECOSYSTEM.pass.path);
    } else {
      nav(ECOSYSTEM.me.path);
    }
  };

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl bg-gradient-to-r from-card via-card to-paper p-4 ring-1 ring-line/80 shadow-xs",
          className,
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent">AirPal Ecosystem</span>
            <p className="font-display text-base font-bold text-ink mt-0.5">
              {activeMode === "me" ? "Explore live events, stays & dining perks" : "Organise your day & digital bio"}
            </p>
            <p className="text-xs text-mute mt-0.5">
              {activeMode === "me"
                ? "AirPal Pass gives you access to concerts, festivals, hotel check-in, and member perks."
                : "AirPal Me manages your schedule, weather outfit tips, and public @handle bio."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleSelect(activeMode === "me" ? "pass" : "me")}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-brand/90 active:scale-95 cursor-pointer touch-manipulation"
          >
            {activeMode === "me" ? (
              <>
                <Ticket size={14} />
                Switch to AirPal Pass
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Switch to AirPal Me
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const isCompact = variant === "compact";

  return (
    <div
      role="tablist"
      aria-label="AirPal Ecosystem Selector"
      className={cn(
        "relative inline-flex items-center rounded-full bg-card/85 ring-1 ring-line/80 shadow-xs backdrop-blur-md",
        isCompact ? "h-9 p-0.5" : "min-h-[44px] h-11 p-1",
        className,
      )}
    >
      {/* Option 1: AirPal Me */}
      <button
        type="button"
        role="tab"
        aria-selected={activeMode === "me"}
        onClick={() => handleSelect("me")}
        className={cn(
          "relative z-10 flex items-center rounded-full font-bold transition-colors cursor-pointer select-none touch-manipulation",
          isCompact
            ? "gap-1.5 px-3 py-1 text-xs min-h-[30px]"
            : "gap-2 px-4 py-1.5 text-xs min-h-[38px] sm:min-h-[36px]",
          activeMode === "me" ? "text-white" : "text-mute hover:text-ink",
        )}
      >
        <Sparkles size={isCompact ? 12 : 13} className={activeMode === "me" ? "text-white" : "text-accent"} />
        <span>AirPal Me</span>
        {activeMode === "me" && (
          <motion.div
            layoutId="ecosystem-pill-active"
            className="absolute inset-0 -z-10 rounded-full bg-brand shadow-[0_2px_8px_rgba(24,5,219,0.3)]"
            transition={{ type: "spring", stiffness: 450, damping: 35 }}
          />
        )}
      </button>

      {/* Option 2: AirPal Pass */}
      <button
        type="button"
        role="tab"
        aria-selected={activeMode === "pass"}
        onClick={() => handleSelect("pass")}
        className={cn(
          "relative z-10 flex items-center rounded-full font-bold transition-colors cursor-pointer select-none touch-manipulation",
          isCompact
            ? "gap-1.5 px-3 py-1 text-xs min-h-[30px]"
            : "gap-2 px-4 py-1.5 text-xs min-h-[38px] sm:min-h-[36px]",
          activeMode === "pass" ? "text-white" : "text-mute hover:text-ink",
        )}
      >
        <Ticket size={isCompact ? 12 : 13} className={activeMode === "pass" ? "text-white" : "text-amber-500"} />
        <span>AirPal Pass</span>
        {activeMode === "pass" && (
          <motion.div
            layoutId="ecosystem-pill-active"
            className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-amber-600 to-rose-600 shadow-[0_2px_8px_rgba(217,119,6,0.35)]"
            transition={{ type: "spring", stiffness: 450, damping: 35 }}
          />
        )}
      </button>
    </div>
  );
}
