import { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronDown, Download, ExternalLink, Sparkles } from "lucide-react";
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
import { cn } from "@/lib/cn";

interface AddToCalendarMenuProps {
  event: CalendarEvent | SimpleCalendarPayload;
  className?: string;
  buttonClassName?: string;
  variant?: "primary" | "secondary" | "ghost" | "pill";
  label?: string;
  size?: "sm" | "md" | "lg";
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const options = [
    {
      id: "google",
      name: "Google Calendar",
      icon: "🌐",
      action: () => {
        const url = getGoogleCalendarUrl(event);
        window.open(url, "_blank", "noopener,noreferrer");
        setOpen(false);
        toast.success("Opening Google Calendar...");
      },
    },
    {
      id: "apple",
      name: "Apple Calendar (.ics)",
      icon: "🍎",
      action: () => {
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
        const url = getOutlookLiveCalendarUrl(event);
        window.open(url, "_blank", "noopener,noreferrer");
        setOpen(false);
        toast.success("Opening Outlook Live...");
      },
    },
    {
      id: "office365",
      name: "Microsoft 365 / Work",
      icon: "💼",
      action: () => {
        const url = getOffice365CalendarUrl(event);
        window.open(url, "_blank", "noopener,noreferrer");
        setOpen(false);
        toast.success("Opening Microsoft 365 Calendar...");
      },
    },
    {
      id: "yahoo",
      name: "Yahoo Calendar",
      icon: "🟣",
      action: () => {
        const url = getYahooCalendarUrl(event);
        window.open(url, "_blank", "noopener,noreferrer");
        setOpen(false);
        toast.success("Opening Yahoo Calendar...");
      },
    },
    {
      id: "ics",
      name: "Download iCal (.ics file)",
      icon: "📥",
      action: () => {
        downloadIcs(event);
        setOpen(false);
        toast.success("iCal file downloaded");
      },
    },
  ];

  return (
    <div className={cn("relative inline-block text-left", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 font-semibold transition active:scale-95",
          size === "sm" && "h-8 px-3 text-xs rounded-xl",
          size === "md" && "h-10 px-4 text-xs rounded-full",
          size === "lg" && "h-12 px-5 text-sm rounded-full",
          variant === "primary" && "bg-brand text-white shadow-sm hover:bg-brand-ink",
          variant === "secondary" && "bg-card text-ink ring-1 ring-line shadow-xs hover:bg-paper",
          variant === "ghost" && "bg-transparent text-ink hover:bg-card/80",
          variant === "pill" && "bg-brand/10 text-brand ring-1 ring-brand/20 hover:bg-brand/15",
          buttonClassName,
        )}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <CalendarIcon size={size === "sm" ? 13 : 15} className="text-gold shrink-0" />
        <span>{label}</span>
        <ChevronDown size={13} className={cn("text-mute transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-2xl bg-card p-1.5 shadow-2xl ring-1 ring-line animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-line/60">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gold">
              <Sparkles size={11} />
              <span>Sync with Calendar</span>
            </div>
            <p className="text-[11px] text-mute truncate mt-0.5">{event.title}</p>
          </div>

          <div className="py-1 space-y-0.5">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={opt.action}
                className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-medium text-ink transition hover:bg-paper active:scale-[0.98]"
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
    </div>
  );
}
