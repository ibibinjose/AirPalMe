import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronDown, Download, ExternalLink, Sparkles, X } from "lucide-react";
import {
  downloadIcs,
  getGoogleCalendarUrl,
  getOffice365CalendarUrl,
  getOutlookLiveCalendarUrl,
  getYahooCalendarUrl,
  type SimpleCalendarPayload,
} from "@/lib/calendar-export";
import type { CalendarEvent } from "@shared/event";
import { toast } from "sonner";
import { triggerHaptic } from "@/lib/native";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/lib/cn";

interface AddToCalendarMenuProps {
  event: CalendarEvent | SimpleCalendarPayload;
  className?: string;
  buttonClassName?: string;
  variant?: "primary" | "secondary" | "ghost" | "pill";
  label?: string;
  size?: "sm" | "md" | "lg";
}

interface Coords {
  top: number;
  left: number;
  isBottomClamped: boolean;
}

export function AddToCalendarMenu({
  event,
  className,
  buttonClassName,
  variant = "secondary",
  label = "Add to Calendar",
  size = "md",
}: AddToCalendarMenuProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<Coords | null>(null);

  useScrollLock(open);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 280;
    const menuHeight = 340;
    const padding = 12;

    // Determine horizontal alignment
    let left = rect.right - menuWidth;
    if (left < padding) {
      left = Math.max(padding, rect.left);
    }
    if (left + menuWidth > window.innerWidth - padding) {
      left = Math.max(padding, window.innerWidth - menuWidth - padding);
    }

    // Determine vertical placement (below or flip above)
    const spaceBelow = window.innerHeight - rect.bottom;
    const isBottomClamped = spaceBelow < menuHeight && rect.top > menuHeight;
    const top = isBottomClamped ? rect.top - menuHeight - 6 : rect.bottom + 6;

    setCoords({ top, left, isBottomClamped });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    function handleScrollOrResize() {
      updatePosition();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, updatePosition]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void triggerHaptic("light");
    setOpen((prev) => !prev);
  };

  const options = [
    {
      id: "google",
      name: "Google Calendar",
      icon: "🌐",
      action: () => {
        void triggerHaptic("light");
        const url = getGoogleCalendarUrl(event);
        window.open(url, "_blank", "noopener,noreferrer");
        setOpen(false);
        toast.success("Opening Google Calendar…");
      },
    },
    {
      id: "apple",
      name: "Apple Calendar (.ics)",
      icon: "🍎",
      action: () => {
        void triggerHaptic("light");
        downloadIcs(event);
        setOpen(false);
        toast.success("Downloaded Apple Calendar (.ics) file");
      },
    },
    {
      id: "outlook_live",
      name: "Microsoft Outlook (Live)",
      icon: "🟦",
      action: () => {
        void triggerHaptic("light");
        const url = getOutlookLiveCalendarUrl(event);
        window.open(url, "_blank", "noopener,noreferrer");
        setOpen(false);
        toast.success("Opening Outlook Live…");
      },
    },
    {
      id: "office365",
      name: "Microsoft 365 / Work",
      icon: "💼",
      action: () => {
        void triggerHaptic("light");
        const url = getOffice365CalendarUrl(event);
        window.open(url, "_blank", "noopener,noreferrer");
        setOpen(false);
        toast.success("Opening Microsoft 365 Calendar…");
      },
    },
    {
      id: "yahoo",
      name: "Yahoo Calendar",
      icon: "🟣",
      action: () => {
        void triggerHaptic("light");
        const url = getYahooCalendarUrl(event);
        window.open(url, "_blank", "noopener,noreferrer");
        setOpen(false);
        toast.success("Opening Yahoo Calendar…");
      },
    },
    {
      id: "ics",
      name: "Download iCal (.ics file)",
      icon: "📥",
      action: () => {
        void triggerHaptic("light");
        downloadIcs(event);
        setOpen(false);
        toast.success("iCal file downloaded");
      },
    },
  ];

  return (
    <div className={cn("relative inline-block text-left", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 font-semibold transition active:scale-95 cursor-pointer touch-manipulation",
          size === "sm" && "min-h-[44px] px-3 text-xs rounded-xl lg:h-8 lg:min-h-0",
          size === "md" && "min-h-[44px] px-4 text-xs rounded-full lg:h-10 lg:min-h-0",
          size === "lg" && "h-12 px-5 text-sm rounded-full",
          variant === "primary" && "bg-brand text-white shadow-sm hover:bg-brand-ink",
          variant === "secondary" && "bg-card text-ink ring-1 ring-line shadow-xs hover:bg-paper",
          variant === "ghost" && "bg-transparent text-ink hover:bg-card/80",
          variant === "pill" && "bg-brand/10 text-accent ring-1 ring-brand/20 hover:bg-brand/15",
          buttonClassName,
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarIcon size={size === "sm" ? 13 : 15} className="text-accent shrink-0" />
        <span>{label}</span>
        <ChevronDown size={13} className={cn("text-mute transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[99999]">
            {/* Backdrop click to dismiss */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
              onClick={() => setOpen(false)}
            />

            {/* Mobile Sheet (screen < 640px) */}
            <div className="sm:hidden fixed inset-x-0 bottom-0 z-10 rounded-t-[32px] bg-paper p-5 shadow-2xl ring-1 ring-line animate-in slide-in-from-bottom duration-200 pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+1rem))]">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
              <div className="flex items-center justify-between border-b border-line/60 pb-3">
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent">
                    <Sparkles size={11} />
                    <span>Sync with Calendar</span>
                  </div>
                  <p className="text-xs font-semibold text-ink truncate mt-0.5">{event.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-10 w-10 min-h-[44px] min-w-[44px] touch-manipulation shrink-0 place-items-center rounded-full bg-card text-mute ring-1 ring-line hover:text-ink cursor-pointer"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-3 space-y-1">
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={opt.action}
                    className="flex w-full min-h-[44px] items-center justify-between rounded-2xl bg-card px-3.5 py-2.5 text-left text-xs font-semibold text-ink ring-1 ring-line/70 transition hover:bg-paper active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{opt.icon}</span>
                      <span>{opt.name}</span>
                    </div>
                    {opt.id === "ics" ? (
                      <Download size={14} className="text-mute opacity-70" />
                    ) : (
                      <ExternalLink size={14} className="text-mute opacity-70" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop Popover Menu (screen >= 640px) */}
            {coords && (
              <div
                ref={menuRef}
                style={{
                  position: "fixed",
                  top: `${coords.top}px`,
                  left: `${coords.left}px`,
                  width: "280px",
                }}
                className={cn(
                  "hidden sm:block z-10 rounded-2xl bg-card p-2 shadow-2xl ring-1 ring-line duration-150 animate-in fade-in zoom-in-95",
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-2 border-b border-line/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent">
                      <Sparkles size={11} />
                      <span>Sync with Calendar</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="text-mute hover:text-ink transition"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <p className="text-[11px] text-mute truncate mt-0.5">{event.title}</p>
                </div>

                <div className="py-1 space-y-0.5">
                  {options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={opt.action}
                      className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-medium text-ink transition hover:bg-paper active:scale-[0.98] cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{opt.icon}</span>
                        <span>{opt.name}</span>
                      </div>
                      {opt.id === "ics" ? (
                        <Download size={12} className="text-mute opacity-60" />
                      ) : (
                        <ExternalLink size={12} className="text-mute opacity-60" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
