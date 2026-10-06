import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Heart,
  MapPin,
  Share2,
  Star,
  X,
  ExternalLink,
  Footprints,
  Sparkles,
  Navigation,
  Clock,
  RotateCcw,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import type { CalendarEvent } from "@shared/event";
import { useEvents } from "@/contexts/EventsContext";
import { toPublicUrl } from "@/lib/public-origin";
import { useCalendarDrag } from "./CalendarDragContext";
import { AddToCalendarMenu } from "./AddToCalendarMenu";
import {
  formatRelativeBadge,
  estimateWalkFromRocks,
  isFreeAdmission,
  isWeekendDay,
  CATEGORY_THEMES,
} from "@/lib/calendar-utils";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/lib/cn";

interface CalendarEventModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onSelectTag?: (tag: string) => void;
}

export function CalendarEventModal({ event, onClose, onSelectTag }: CalendarEventModalProps) {
  const [, nav] = useLocation();
  const { toggleGoing, toggleInterested, toggleLiked, exportItinerary, resetEventSchedule } = useEvents();
  const { setReschedulingEvent } = useCalendarDrag();

  useScrollLock(Boolean(event));

  // Escape closes
  useEffect(() => {
    if (!event) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [event, onClose]);

  if (!event) return null;
  if (typeof document === "undefined") return null;

  const relative = formatRelativeBadge(event.date);
  const walkEstimate = estimateWalkFromRocks(event.venue);
  const isFree = isFreeAdmission(event.ticketPrice);
  const isWeekend = isWeekendDay(new Date(event.date + "T00:00:00"));
  const categoryTheme = CATEGORY_THEMES[event.category] || CATEGORY_THEMES.market;

  const handleShare = async () => {
    const url = toPublicUrl(event.gatePath || `/calendar?event=${event.id}`);
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `${event.title} in ${event.city} on ${event.timeLabel}`,
          url,
        });
      } catch {
        /* ignore */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Event link copied to clipboard");
    }
  };

  const openDirections = () => {
    const query = encodeURIComponent(`${event.venue}, ${event.city}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center [padding-bottom:var(--keyboard-height,0px)] transition-[padding] duration-200">
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        aria-label="Close modal"
        onClick={onClose}
      />

      {/* Sheet Content */}
      <div className="scroll-container safe-bottom relative z-10 max-h-[min(90dvh,calc(var(--visual-viewport-height,100dvh)-1.5rem))] w-full rounded-t-3xl bg-card p-5 shadow-2xl ring-1 ring-line sm:max-w-lg sm:rounded-3xl sm:p-6 overflow-y-auto transition-all duration-200">
        {/* Mobile Pull Tab */}
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 grid h-10 w-10 min-h-[44px] min-w-[44px] place-items-center rounded-full bg-card/80 text-mute hover:text-ink backdrop-blur-md transition z-20 ring-1 ring-line/80 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <X size={18} />
        </button>

        {/* Hero Image */}
        {event.heroImage && (
          <div className="relative -mx-5 -mt-5 mb-4 h-48 sm:-mx-6 sm:-mt-6 sm:h-56 overflow-hidden rounded-t-3xl bg-paper">
            <img
              src={event.heroImage}
              alt={event.title}
              width={600}
              height={300}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
          </div>
        )}

        {/* Header Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold ring-1", categoryTheme.badgeClass)}>
            {event.categoryLabel}
          </span>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              relative.highlight ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300" : "bg-paper text-mute",
            )}
          >
            {relative.label}
          </span>
          {isWeekend && (
            <span className="rounded-full bg-indigo-100 text-indigo-800 px-3 py-1 text-xs font-medium">Weekend</span>
          )}
          {isFree && (
            <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-semibold">
              Free Entry
            </span>
          )}
          {event.isLocal && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-accent">
              <Sparkles size={11} /> Local Pick
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="font-display mt-3 text-2xl font-bold text-ink sm:text-3xl leading-snug">{event.title}</h2>

        {/* Details list */}
        <div className="mt-4 space-y-2.5 text-sm text-mute">
          <div className="flex items-center gap-2 text-ink font-medium">
            <span className={cn("h-2.5 w-2.5 rounded-full", categoryTheme.dotClass)} />
            <span>{event.timeLabel}</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={openDirections}
              className="flex items-center gap-2 text-left hover:text-accent transition group"
            >
              <MapPin size={16} className="shrink-0 text-accent" />
              <span className="group-hover:underline">
                {event.venue}, {event.city}
              </span>
            </button>

            <button
              type="button"
              onClick={openDirections}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              <Navigation size={12} />
              <span>Get Directions</span>
            </button>
          </div>

          {/* Proximity walking badge */}
          {walkEstimate && (
            <div className="flex items-center gap-1.5 rounded-xl bg-paper/90 px-3 py-1.5 text-xs text-ink/90 ring-1 ring-line/60">
              <Footprints size={14} className="text-accent shrink-0" />
              <span>
                <strong>{walkEstimate.minutes} min walk</strong> · {walkEstimate.label}
              </span>
            </div>
          )}

          {event.ticketPrice && (
            <div className="flex items-center justify-between rounded-xl bg-paper/80 px-3.5 py-2 text-xs font-medium text-ink ring-1 ring-line/60">
              <span>Admission</span>
              <span className="font-semibold text-accent text-sm">{event.ticketPrice}</span>
            </div>
          )}

          {/* Rescheduled notice */}
          {event.isRescheduled && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 px-3.5 py-2 text-xs text-amber-900 ring-1 ring-amber-400/40">
              <div className="flex items-center gap-1.5 font-medium">
                <Clock size={13} className="text-amber-600 shrink-0" />
                <span>Rescheduled (originally {event.originalDate})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  void resetEventSchedule(event.id);
                  toast.info(`Restored "${event.title}" to original schedule`);
                }}
                className="inline-flex items-center gap-1 font-semibold text-amber-900 hover:underline active:scale-95"
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="mt-4 border-t border-line/70 pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-mute">About this event</h4>
          <p className="mt-2 text-sm leading-relaxed text-ink/90 whitespace-pre-line">{event.description}</p>
        </div>

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="mt-4 border-t border-line/70 pt-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-mute mb-2">Event Tags</h4>
            <div className="flex flex-wrap items-center gap-1.5">
              {event.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    if (onSelectTag) {
                      onSelectTag(tag);
                      onClose();
                    }
                  }}
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition",
                    onSelectTag
                      ? "bg-paper text-mute hover:bg-card hover:text-ink ring-1 ring-line/80 cursor-pointer active:scale-95"
                      : "bg-paper text-mute ring-1 ring-line/50",
                  )}
                  title={`Filter calendar by #${tag}`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Attendance Action Bar */}
        <div className="mt-6 rounded-2xl bg-paper/70 p-3 ring-1 ring-line/70">
          <p className="text-center text-xs font-medium text-mute mb-2.5">Your status for this event</p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (toggleGoing(event.id) && !event.isGoing) toast.success("Marked as Going");
              }}
              className={cn(
                "flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-full text-xs font-medium transition active:scale-95",
                event.isGoing
                  ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700 font-semibold"
                  : "bg-card text-ink hover:bg-emerald-50 ring-1 ring-line/80",
              )}
            >
              <Check size={14} strokeWidth={event.isGoing ? 3 : 2} />
              <span>Going</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (toggleInterested(event.id) && !event.isInterested) toast.success("Added to Interested");
              }}
              className={cn(
                "flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-full text-xs font-medium transition active:scale-95",
                event.isInterested
                  ? "bg-amber-500 text-white shadow-sm ring-1 ring-amber-600 font-semibold"
                  : "bg-card text-ink hover:bg-amber-50 ring-1 ring-line/80",
              )}
            >
              <Star
                size={14}
                className={event.isInterested ? "fill-white" : ""}
                strokeWidth={event.isInterested ? 2.5 : 2}
              />
              <span>Interested</span>
            </button>

            <button
              type="button"
              aria-pressed={event.isLiked}
              aria-label={event.isLiked ? "Liked" : "Like this event"}
              onClick={() => {
                if (toggleLiked(event.id) && !event.isLiked) toast.success("Liked event");
              }}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full transition active:scale-95",
                event.isLiked
                  ? "bg-rose-500 text-white shadow-sm ring-1 ring-rose-600"
                  : "bg-card text-ink hover:bg-rose-50 ring-1 ring-line/80",
              )}
            >
              <Heart size={15} className={event.isLiked ? "fill-white" : ""} strokeWidth={event.isLiked ? 2.5 : 2} />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="col-span-2">
            <AddToCalendarMenu
              event={event}
              className="w-full"
              buttonClassName="w-full bg-paper hover:bg-line ring-1 ring-line/60"
              label="Add to Calendar (Google, Apple, Outlook, 365)"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              setReschedulingEvent(event);
            }}
            className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-paper px-4 text-xs font-medium text-ink hover:bg-amber-50 hover:text-amber-900 transition ring-1 ring-line/60"
          >
            <Clock size={14} className="text-amber-600" />
            <span>Reschedule Date / Slot</span>
          </button>

          {(event.isGoing || event.isInterested) && (
            <button
              type="button"
              onClick={() => exportItinerary("all-saved")}
              className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-paper px-4 text-xs font-semibold text-accent hover:bg-brand/10 transition ring-1 ring-brand/30 shadow-xs"
            >
              <Sparkles size={14} />
              <span>Export Full Saved Itinerary (.ics)</span>
            </button>
          )}

          {event.gatePath && (
            <button
              type="button"
              onClick={() => {
                onClose();
                nav(event.gatePath!);
              }}
              className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-brand px-4 text-xs font-medium text-white hover:bg-brand-ink transition shadow-sm"
            >
              <span>Explore Market Directory & Stalls</span>
              <ExternalLink size={13} />
            </button>
          )}

          {event.ticketUrl && !event.gatePath && (
            <button
              type="button"
              onClick={() => window.open(event.ticketUrl, "_blank")}
              className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-brand px-4 text-xs font-medium text-white hover:bg-brand-ink transition shadow-sm"
            >
              <span>Get Tickets / Official Details</span>
              <ExternalLink size={13} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="mt-3 flex w-full items-center justify-center gap-1.5 py-1 text-xs text-mute hover:text-ink transition"
        >
          <Share2 size={13} />
          <span>Share event with friends</span>
        </button>
      </div>
    </div>,
    document.body,
  );
}
