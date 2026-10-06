import { useState, useRef, useEffect } from "react";
import {
  Check,
  Heart,
  Star,
  MapPin,
  CalendarPlus,
  Share2,
  ExternalLink,
  Sparkles,
  Footprints,
  GripVertical,
  Clock,
  RotateCcw,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import type { CalendarEvent } from "@shared/event";
import { useEvents } from "@/contexts/EventsContext";
import { useCalendarDrag } from "./CalendarDragContext";
import {
  downloadIcs,
  getGoogleCalendarUrl,
  getOutlookLiveCalendarUrl,
  getOffice365CalendarUrl,
  getYahooCalendarUrl,
} from "@/lib/calendar-export";
import {
  formatRelativeBadge,
  estimateWalkFromRocks,
  isFreeAdmission,
  isWeekendDay,
  CATEGORY_THEMES,
} from "@/lib/calendar-utils";
import { cn } from "@/lib/cn";
import { mediaSrcSet, sizedImageUrl } from "@/lib/media-srcset";
import { track } from "@/lib/analytics";
import { triggerHaptic, shareNative } from "@/lib/native";
import { toPublicUrl } from "@/lib/public-origin";

interface CalendarEventCardProps {
  event: CalendarEvent;
  onSelect?: (event: CalendarEvent) => void;
  compact?: boolean;
  onSelectTag?: (tag: string) => void;
}

export function CalendarEventCard({ event, onSelect, compact = false, onSelectTag }: CalendarEventCardProps) {
  const [, nav] = useLocation();
  const { toggleGoing, toggleInterested, toggleLiked, exportItinerary, resetEventSchedule } = useEvents();
  const { draggedEvent, startDrag, endDrag, setReschedulingEvent } = useCalendarDrag();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  const relative = formatRelativeBadge(event.date);
  const walkEstimate = estimateWalkFromRocks(event.venue);
  const isFree = isFreeAdmission(event.ticketPrice);
  const isWeekend = isWeekendDay(new Date(event.date + "T00:00:00"));
  const categoryTheme = CATEGORY_THEMES[event.category] || CATEGORY_THEMES.market;
  const isCurrentlyDragged = draggedEvent?.id === event.id;

  // Track card view in viewport
  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            void track("calendar_event_view", {
              eventId: event.id,
              name: event.title,
              category: event.category,
              action: "view",
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 },
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [event]);

  useEffect(() => {
    if (!showExportMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowExportMenu(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showExportMenu]);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    void triggerHaptic("light");
    void track("calendar_event_share", { eventId: event.id, name: event.title, action: "share" });
    const url = toPublicUrl(event.gatePath || `/calendar?event=${event.id}`);
    const shared = await shareNative({
      title: event.title,
      text: `${event.title} in ${event.city} on ${event.timeLabel}`,
      url,
    });
    if (!shared) {
      toast.success("Event link copied to clipboard");
    }
  };

  const handleGoing = (e: React.MouseEvent) => {
    e.stopPropagation();
    void triggerHaptic("success");
    const wasGoing = event.isGoing;
    if (toggleGoing(event.id) && !wasGoing) {
      toast.success(`Marked as Going to "${event.title}"`);
    }
    void track("calendar_event_going", { eventId: event.id, action: wasGoing ? "remove" : "add" });
  };

  const handleInterested = (e: React.MouseEvent) => {
    e.stopPropagation();
    void triggerHaptic("medium");
    const wasInterested = event.isInterested;
    if (toggleInterested(event.id) && !wasInterested) {
      toast.success(`Saved "${event.title}" to Interested`);
    }
    void track("calendar_event_interested", { eventId: event.id, action: wasInterested ? "remove" : "add" });
  };

  const handleLiked = (e: React.MouseEvent) => {
    e.stopPropagation();
    void triggerHaptic("light");
    const wasLiked = event.isLiked;
    if (toggleLiked(event.id) && !wasLiked) {
      toast.success(`Liked "${event.title}"`);
    }
    void track("calendar_event_liked", { eventId: event.id, action: wasLiked ? "remove" : "add" });
  };

  const openDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    void track("calendar_event_directions", { eventId: event.id, name: event.title, action: "directions" });
    const query = encodeURIComponent(`${event.venue}, ${event.city}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  const handleCardClick = () => {
    if (onSelect) {
      void triggerHaptic("light");
      void track("calendar_event_open", { eventId: event.id, name: event.title, action: "card_click" });
      onSelect(event);
    }
  };

  return (
    <article
      ref={cardRef}
      onClick={handleCardClick}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleCardClick();
              }
            }
          : undefined
      }
      aria-label={`${event.title} on ${event.timeLabel} at ${event.venue}`}
      draggable={true}
      onDragStart={(e) => {
        startDrag(event, e);
      }}
      onDragEnd={() => {
        endDrag();
      }}
      className={cn(
        "cv-auto group relative flex flex-col rounded-3xl bg-card p-4 ring-1 ring-line/80 transition-all duration-200 hover:shadow-md hover:ring-line md:p-5 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2",
        onSelect && "cursor-pointer",
        event.isGoing && "ring-emerald-500/50 bg-gradient-to-b from-emerald-500/5 via-card to-card",
        isCurrentlyDragged && "opacity-40 ring-2 ring-brand ring-dashed scale-[0.99]",
      )}
    >
      {/* Top Banner / Image — laneway fallback when the event has no art */}
      {!compact && (
        <div className="relative mb-3.5 aspect-square w-full overflow-hidden rounded-2xl bg-paper/60">
          {/* Loading placeholder */}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-paper via-line/30 to-paper" />
          )}

          {/* Actual image */}
          {!imageError && (
            <img
              src={sizedImageUrl(event.heroImage, 600) || "/media/laneway.jpg"}
              srcSet={mediaSrcSet(event.heroImage || "/media/laneway.jpg")}
              sizes="(max-width: 768px) 100vw, 50vw"
              alt={`${event.title} event banner`}
              className={cn(
                "h-full w-full object-cover transition duration-500 group-hover:scale-105",
                imageLoaded ? "opacity-100" : "opacity-0",
              )}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                const el = e.currentTarget;
                if (el.src.endsWith("/media/laneway.jpg")) setImageError(true);
                else el.src = "/media/laneway.jpg";
              }}
            />
          )}

          {/* Error state - show gradient instead */}
          {imageError && <div className="absolute inset-0 bg-paper" />}

          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />

          {/* Top pills */}
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide shadow-sm backdrop-blur-md ring-1 ring-white/20",
                categoryTheme.badgeClass,
              )}
              aria-label={`Category: ${event.categoryLabel}`}
            >
              {event.categoryLabel}
            </span>
            {event.isLocal && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-brand/90 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm backdrop-blur-md"
                aria-label="Local community event"
              >
                <Sparkles size={11} aria-hidden="true" /> Local Pick
              </span>
            )}
            {isFree && (
              <span className="rounded-full bg-emerald-700/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur-md">
                Free Entry
              </span>
            )}
            {event.isGoing && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-emerald-600/95 text-white px-2.5 py-1 text-[11px] font-bold shadow-sm backdrop-blur-md ring-1 ring-white/30"
                aria-label="Confirmed booking / RSVP"
              >
                <Check size={11} className="stroke-[3]" aria-hidden="true" />
                <span>Confirmed Booking</span>
              </span>
            )}
            {event.isInterested && !event.isGoing && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/95 text-ink px-2.5 py-1 text-[11px] font-bold shadow-sm backdrop-blur-md ring-1 ring-white/30"
                aria-label="Interested / Saved booking"
              >
                <Star size={11} className="fill-current" aria-hidden="true" />
                <span>Interested</span>
              </span>
            )}
            {event.isRescheduled && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 text-amber-950 px-2.5 py-1 text-[11px] font-bold shadow-sm backdrop-blur-md"
                title={`Rescheduled from ${event.originalDate}`}
              >
                <RotateCcw size={10} />
                <span>Rescheduled</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void resetEventSchedule(event.id);
                    toast.info(`Restored "${event.title}" to original date`);
                  }}
                  className="ml-0.5 underline hover:text-black font-extrabold"
                  title="Restore original date"
                >
                  Reset
                </button>
              </span>
            )}
          </div>

          {/* Bottom date badge on hero */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold backdrop-blur-md",
                  relative.highlight
                    ? "bg-amber-400 text-ink shadow-sm"
                    : "bg-white/20 text-white border border-white/30",
                )}
              >
                {relative.label}
              </span>
              {isWeekend && !relative.highlight && (
                <span className="rounded-full bg-indigo-500/80 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-md">
                  Weekend
                </span>
              )}
            </div>
            {event.ticketPrice && (
              <span className="text-xs font-medium text-white/90 drop-shadow">{event.ticketPrice}</span>
            )}
          </div>
        </div>
      )}

      {/* Main Info */}
      <div className="flex-1">
        {/* Relative tag for compact cards without hero */}
        {(!event.heroImage || compact) && (
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  relative.highlight ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300" : "bg-paper text-mute",
                )}
              >
                {relative.label}
              </span>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium ring-1", categoryTheme.badgeClass)}>
                {event.categoryLabel}
              </span>
              {event.isGoing && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-900 px-2 py-0.5 text-[10px] font-bold ring-1 ring-emerald-300">
                  <Check size={10} className="stroke-[3]" />
                  <span>Booked</span>
                </span>
              )}
              {event.isInterested && !event.isGoing && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-bold ring-1 ring-amber-300">
                  <Star size={10} className="fill-current" />
                  <span>Interested</span>
                </span>
              )}
              {isFree && (
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                  Free
                </span>
              )}
              {event.isRescheduled && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 ring-1 ring-amber-300 px-2 py-0.5 text-[10px] font-bold"
                  title={`Rescheduled from ${event.originalDate}`}
                >
                  <RotateCcw size={10} />
                  <span>Rescheduled</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void resetEventSchedule(event.id);
                      toast.info(`Restored "${event.title}" to original date`);
                    }}
                    className="ml-0.5 underline font-bold hover:text-black cursor-pointer"
                    title="Restore original date"
                  >
                    Reset
                  </button>
                </span>
              )}
            </div>
            {event.ticketPrice && <span className="text-[12px] font-medium text-gold">{event.ticketPrice}</span>}
          </div>
        )}

        <h3 className="font-display text-lg font-semibold leading-snug text-ink group-hover:text-brand transition-colors md:text-xl">
          {event.title}
        </h3>

        {/* Venue & Time Row */}
        <div className="mt-2 space-y-1.5 text-sm text-mute">
          <div className="flex items-center gap-1.5 font-medium text-ink/80">
            <span className={cn("h-2 w-2 rounded-full", categoryTheme.dotClass)} />
            <span>{event.timeLabel}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={openDirections}
              className="flex items-center gap-1.5 hover:text-ink transition-colors text-left"
            >
              <MapPin size={14} className="shrink-0 text-gold" />
              <span className="line-clamp-1">{event.venue}</span>
            </button>

            {walkEstimate && (
              <span className="inline-flex items-center gap-1 text-xs text-mute/90 font-medium">
                <Footprints size={12} className="text-brand/70" />
                <span>{walkEstimate.label}</span>
              </span>
            )}
          </div>
        </div>

        {/* Snippet Description */}
        {!compact && <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-mute">{event.description}</p>}

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {event.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTag?.(tag);
                }}
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium transition",
                  onSelectTag
                    ? "bg-paper text-mute hover:bg-card hover:text-ink ring-1 ring-line/70 cursor-pointer active:scale-95"
                    : "bg-paper text-mute ring-1 ring-line/50",
                )}
                title={`Filter events by #${tag}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Attendance Toggle Bar */}
      <div className="mt-4 border-t border-line/70 pt-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Status Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Going Button */}
            <button
              type="button"
              onClick={handleGoing}
              aria-pressed={event.isGoing}
              title={event.isGoing ? "You are going" : "Mark as Going"}
              className={cn(
                "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-xs font-medium transition active:scale-95",
                event.isGoing
                  ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700 font-semibold"
                  : "bg-paper text-ink/80 hover:bg-emerald-50 hover:text-emerald-800 ring-1 ring-line/80",
              )}
            >
              <Check size={13} strokeWidth={event.isGoing ? 3 : 2} />
              <span>Going</span>
            </button>

            {/* Interested Button */}
            <button
              type="button"
              onClick={handleInterested}
              aria-pressed={event.isInterested}
              title={event.isInterested ? "You are interested" : "Mark as Interested"}
              className={cn(
                "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-xs font-medium transition active:scale-95",
                event.isInterested
                  ? "bg-amber-500 text-white shadow-sm ring-1 ring-amber-600 font-semibold"
                  : "bg-paper text-ink/80 hover:bg-amber-50 hover:text-amber-800 ring-1 ring-line/80",
              )}
            >
              <Star
                size={13}
                className={event.isInterested ? "fill-white" : ""}
                strokeWidth={event.isInterested ? 2.5 : 2}
              />
              <span>Interested</span>
            </button>

            {/* Like Button */}
            <button
              type="button"
              onClick={handleLiked}
              aria-pressed={event.isLiked}
              title={event.isLiked ? "Liked" : "Like event"}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full transition active:scale-95",
                event.isLiked
                  ? "bg-rose-500 text-white shadow-sm ring-1 ring-rose-600"
                  : "bg-paper text-ink/70 hover:bg-rose-50 hover:text-rose-600 ring-1 ring-line/80",
              )}
            >
              <Heart size={14} className={event.isLiked ? "fill-white" : ""} strokeWidth={event.isLiked ? 2.5 : 2} />
            </button>
          </div>

          {/* Quick Action Tools */}
          <div className="relative flex items-center gap-1">
            {/* Add to Calendar Menu Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowExportMenu(!showExportMenu);
                }}
                title="Add to calendar"
                aria-label="Add to calendar"
                className="inline-flex h-9 w-9 min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full text-mute hover:bg-paper hover:text-ink transition cursor-pointer"
              >
                <CalendarPlus size={15} />
              </button>

              {/* Popover Menu */}
              {showExportMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowExportMenu(false);
                    }}
                  />
                  <div
                    className="absolute right-0 bottom-full z-50 mb-1 w-52 overflow-hidden rounded-2xl bg-card p-1.5 shadow-xl ring-1 ring-line animate-in fade-in zoom-in-95"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-mute border-b border-line/60">
                      Sync to Calendar
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        window.open(getGoogleCalendarUrl(event), "_blank");
                        setShowExportMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-xs font-medium text-ink hover:bg-paper"
                    >
                      <span className="text-sm">🌐</span>
                      <span>Google Calendar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        downloadIcs(event);
                        setShowExportMenu(false);
                        toast.success("Downloaded event (.ics)");
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-xs font-medium text-ink hover:bg-paper"
                    >
                      <span className="text-sm">🍎</span>
                      <span>Apple Calendar (.ics)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.open(getOutlookLiveCalendarUrl(event), "_blank");
                        setShowExportMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-xs font-medium text-ink hover:bg-paper"
                    >
                      <span className="text-sm">🟦</span>
                      <span>Outlook (Live)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.open(getOffice365CalendarUrl(event), "_blank");
                        setShowExportMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-xs font-medium text-ink hover:bg-paper"
                    >
                      <span className="text-sm">💼</span>
                      <span>Microsoft 365</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.open(getYahooCalendarUrl(event), "_blank");
                        setShowExportMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-xs font-medium text-ink hover:bg-paper"
                    >
                      <span className="text-sm">🟣</span>
                      <span>Yahoo Calendar</span>
                    </button>
                    {(event.isGoing || event.isInterested) && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowExportMenu(false);
                          exportItinerary("all-saved");
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-brand hover:bg-brand/5 border-t border-line/60 mt-1"
                      >
                        <Sparkles size={13} />
                        <span>Export Full Itinerary (.ics)</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Reschedule Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setReschedulingEvent(event);
              }}
              title="Reschedule event"
              aria-label="Reschedule event"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-mute hover:bg-amber-50 hover:text-amber-800 transition"
            >
              <Clock size={14} />
            </button>

            {/* Drag Handle Indicator */}
            <div
              draggable={true}
              onDragStart={(e) => {
                e.stopPropagation();
                startDrag(event, e);
              }}
              onDragEnd={() => {
                endDrag();
              }}
              title="Drag and drop to reschedule this event"
              className="hidden sm:inline-flex h-8 w-7 items-center justify-center rounded-full text-mute/50 hover:text-brand hover:bg-paper cursor-grab active:cursor-grabbing transition"
            >
              <GripVertical size={14} />
            </div>

            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              title="Share event"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-mute hover:bg-paper hover:text-ink transition"
            >
              <Share2 size={14} />
            </button>

            {/* Gate or details link */}
            {event.gatePath && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nav(event.gatePath!);
                }}
                title="View market stalls & expo directory"
                className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-brand px-2.5 text-xs font-medium text-white hover:bg-brand-ink transition shadow-xs"
              >
                <span>Stalls</span>
                <ExternalLink size={11} />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
