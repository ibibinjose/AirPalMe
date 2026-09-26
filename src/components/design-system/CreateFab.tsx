import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  CalendarPlus,
  Users,
  Ticket,
  QrCode,
  Sparkles,
  Building2,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { triggerHaptic } from "@/lib/native";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useVirtualKeyboard } from "@/lib/keyboard";
import { cn } from "@/lib/cn";

export function openGlobalCreate() {
  window.dispatchEvent(new CustomEvent("airpal-open-create"));
}

interface CreateOption {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: typeof CalendarPlus;
  colorClass: string;
  badge?: string;
}

const CREATE_OPTIONS: CreateOption[] = [
  {
    id: "plan",
    title: "Make a Plan",
    subtitle: "Coordinate an activity, hangout, or trip with mates",
    href: "/plan/new",
    icon: CalendarPlus,
    colorClass: "bg-brand/10 text-brand ring-brand/20",
    badge: "Popular",
  },
  {
    id: "mate",
    title: "Find a Mate",
    subtitle: "Want to do something? Find someone to go with you",
    href: "/mate/request",
    icon: Users,
    colorClass: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
    badge: "MVP Priority",
  },
  {
    id: "event",
    title: "Host an Event",
    subtitle: "Create a meetup, workshop, or ticketed experience",
    href: "/event/new",
    icon: Ticket,
    colorClass: "bg-amber-500/10 text-amber-600 ring-amber-500/20",
  },
  {
    id: "pulse",
    title: "Share Live Pulse",
    subtitle: "Broadcast a live vibe check or what’s on right now",
    href: "/pulse",
    icon: Sparkles,
    colorClass: "bg-rose-500/10 text-rose-600 ring-rose-500/20",
  },
  {
    id: "scan",
    title: "Scan Room / Code",
    subtitle: "Scan Stay compendium, Wi-Fi, pass, or venue code",
    href: "/scan",
    icon: QrCode,
    colorClass: "bg-purple-500/10 text-purple-600 ring-purple-500/20",
  },
  {
    id: "partner",
    title: "Business & Partner Hub",
    subtitle: "List a place, boutique stay, venue, or promotions",
    href: "/create",
    icon: Building2,
    colorClass: "bg-slate-500/10 text-slate-700 ring-slate-500/20",
  },
];

// Pages where the FAB should hide (already in creation or editing flows)
const HIDE_FAB_ROUTES = [
  /^\/plan\/new/,
  /^\/plan\/[^/]+\/edit/,
  /^\/event\/new/,
  /^\/mate\/request/,
  /^\/bio\/setup/,
  /^\/bio\/edit/,
  /^\/business\/onboard/,
  /^\/start/,
  /^\/auth\/action/,
];

export function CreateFab() {
  const [open, setOpen] = useState(false);
  const [path, nav] = useLocation();
  const { isKeyboardOpen } = useVirtualKeyboard();
  const containerRef = useRef<HTMLDivElement>(null);

  useScrollLock(open);

  useEffect(() => {
    const handleOpen = () => {
      void triggerHaptic("medium");
      setOpen(true);
    };
    window.addEventListener("airpal-open-create", handleOpen);
    return () => window.removeEventListener("airpal-open-create", handleOpen);
  }, []);

  // Close on ESC key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Don't show FAB on edit/create forms
  const shouldHide = HIDE_FAB_ROUTES.some((re) => re.test(path)) || isKeyboardOpen;

  const handleSelect = (href: string) => {
    void triggerHaptic("light");
    setOpen(false);
    nav(href);
  };

  return (
    <>
      {/* Floating Action Button */}
      {!shouldHide && (
        <motion.div
          className="fixed z-40 right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+74px)] lg:bottom-6 lg:right-6 pointer-events-auto"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("medium");
              setOpen((prev) => !prev);
            }}
            aria-label={open ? "Close create menu" : "Create something new"}
            aria-expanded={open}
            className={cn(
              "group flex h-13 w-13 items-center justify-center rounded-full text-white shadow-[0_8px_24px_-4px_rgba(24,5,219,0.55)] transition-all duration-200 active:scale-95 cursor-pointer touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              open ? "bg-ink hover:bg-black" : "bg-brand hover:bg-brand-ink",
            )}
          >
            <motion.div
              animate={{ rotate: open ? 45 : 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <Plus size={24} strokeWidth={2.5} />
            </motion.div>
          </button>
        </motion.div>
      )}

      {/* Creation Modal / Bottom Sheet */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                void triggerHaptic("light");
                setOpen(false);
              }}
              className="fixed inset-0 bg-ink/60 backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Sheet Container */}
            <motion.div
              ref={containerRef}
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              role="dialog"
              aria-modal="true"
              aria-label="Create on AirPal"
              className="relative w-full max-w-lg rounded-t-[32px] sm:rounded-3xl bg-card p-5 sm:p-6 shadow-2xl ring-1 ring-line/80 max-h-[88vh] overflow-y-auto"
            >
              {/* Drag Handle on Mobile */}
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line/80 sm:hidden" />

              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-line/60">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                    AirPal · Made Easy
                  </span>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-ink mt-0.5">
                    What do you want to create?
                  </h2>
                  <p className="text-xs text-mute mt-0.5">
                    One trusted marketplace engine connecting people, places, and experiences.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void triggerHaptic("light");
                    setOpen(false);
                  }}
                  className="rounded-full p-2 text-mute hover:bg-paper hover:text-ink transition cursor-pointer"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Action Cards List */}
              <div className="mt-4 grid gap-2.5">
                {CREATE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelect(opt.href)}
                      className="group flex w-full items-center gap-3.5 rounded-2xl bg-paper/60 p-3.5 text-left ring-1 ring-line/70 transition-all duration-150 hover:bg-card hover:ring-brand/40 hover:shadow-xs active:scale-[0.99] cursor-pointer"
                    >
                      <span
                        className={cn(
                          "grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 transition-transform group-hover:scale-105",
                          opt.colorClass,
                        )}
                      >
                        <Icon size={20} strokeWidth={2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-display text-base font-bold text-ink group-hover:text-brand transition-colors">
                            {opt.title}
                          </span>
                          {opt.badge && (
                            <span className="text-[11px] font-bold text-brand">
                              · {opt.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-mute truncate mt-0.5">{opt.subtitle}</p>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-mute/60 group-hover:text-brand group-hover:translate-x-0.5 transition-all shrink-0"
                      />
                    </button>
                  );
                })}
              </div>

              {/* Footer Hub Link */}
              <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between">
                <span className="text-xs text-mute">Looking for partner tools?</span>
                <button
                  type="button"
                  onClick={() => handleSelect("/create")}
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline cursor-pointer"
                >
                  <span>Open Creator Hub</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
