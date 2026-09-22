import { useEffect, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Check, ChevronDown, Heart, MapPin, Plus, Share2, Sparkles, Star, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { StickyAction } from "@/components/design-system/companions";
import { Button } from "@/components/ui/Button";
import { AddToCalendarMenu } from "@/components/calendar/AddToCalendarMenu";
import { useEvents } from "@/contexts/EventsContext";
import { formatRelativeBadge } from "@/lib/calendar-utils";
import { shareContent } from "@/lib/share";
import { setShareMeta } from "@/lib/share-meta";
import { cn } from "@/lib/cn";
import { track } from "@/lib/analytics";
import { AddToTripSheet } from "@/components/plan/AddToTripSheet";
import type { CalendarEvent } from "@shared/event";
import type { NearbyEvent } from "@shared/nearby";
import { ExpoDirectoryPage } from "./ExpoDirectoryPage";
import { PageLoading } from "@/components/ui/PageLoading";
import { NotFoundPage } from "./NotFoundPage";
import { useLocalNow } from "@/hooks/useLocalNow";
import { HereCheckIn } from "@/components/circle/HereCheckIn";

export function EventPage() {
  const [, params] = useRoute("/e/:id");
  const id = params?.id || "";
  const { getEvent: getExpo, calendarEvents, remoteNearby, remoteLoaded, fetchRemoteStalls } = useEvents();

  useEffect(() => {
    if (id) void fetchRemoteStalls(id);
  }, [id, fetchRemoteStalls]);

  const expo = getExpo(id);
  const calEv = calendarEvents.find((e) => e.id === id);
  // Migrated curated events live in Firestore, not in the bundle.
  const near = remoteNearby.find((e) => e.id === id);

  // A context_view with loadStatus "ok" already fired for /e/:id — pair it
  // with context_load_failed when nothing resolves, or the miss reads as a hit.
  const loadFailed = useRef("");
  useEffect(() => {
    if (!remoteLoaded || expo || calEv || near || !id || loadFailed.current === id) return;
    loadFailed.current = id;
    void track("context_load_failed", { contextType: "event", contextId: id, errorClass: "not_found" });
  }, [remoteLoaded, expo, calEv, near, id]);

  if (!remoteLoaded) {
    return <PageLoading />;
  }

  if (expo) return <ExpoDirectoryPage event={expo} />;

  if (calEv) return <CalendarEventDetailView event={calEv} />;

  if (near) return <NearbyEventDetailView event={near} />;
  return <NotFoundPage />;
}

function CalendarEventDetailView({ event }: { event: CalendarEvent }) {
  const [, nav] = useLocation();
  const { toggleGoing, toggleInterested, toggleLiked } = useEvents();

  useEffect(() => {
    setShareMeta({
      title: `${event.title} · AirPal`,
      description: `${event.title} in ${event.city} on ${event.timeLabel} — find it on AirPal.Me.`.slice(0, 160),
      image: event.heroImage || undefined,
      url: `${window.location.origin}/e/${event.id}`,
    });
  }, [event.id, event.title, event.city, event.timeLabel, event.heroImage]);

  const { today } = useLocalNow();
  const relative = formatRelativeBadge(event.date, today);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);

  const handleShare = async () => {
    await shareContent({
      title: event.title,
      text: `${event.title} in ${event.city} on ${event.timeLabel}`,
      url: window.location.href,
      dialogTitle: `Share ${event.title}`,
      copiedMessage: "Event link copied to clipboard",
    });
  };

  const openDirections = () => {
    const query = encodeURIComponent(`${event.venue}, ${event.city}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  return (
    <div className="mx-auto max-w-lg pb-48">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line/60">
        <button
          type="button"
          onClick={() => nav("/calendar")}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-mute hover:text-ink transition"
        >
          <ArrowLeft size={14} />
          <span>Calendar</span>
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="grid h-8 w-8 place-items-center rounded-full bg-card ring-1 ring-line text-mute hover:text-ink transition"
          title="Share"
        >
          <Share2 size={14} />
        </button>
      </div>

      {/* Hero Image */}
      {event.heroImage && (
        <div className="relative h-72 w-full overflow-hidden bg-paper">
          <img src={event.heroImage} alt={event.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-paper via-transparent to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="px-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-card px-2.5 py-0.5 text-xs font-semibold text-ink ring-1 ring-line">
            {event.categoryLabel}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
              relative.highlight
                ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300"
                : "bg-card text-mute ring-1 ring-line",
            )}
          >
            {relative.label}
          </span>
          {event.isLocal && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand">
              <Sparkles size={11} /> Local Event
            </span>
          )}
        </div>

        <h1 className="font-display mt-3 text-3xl font-bold tracking-tight text-ink md:text-4xl">{event.title}</h1>

        <div className="mt-4 space-y-2 rounded-2xl bg-card p-4 ring-1 ring-line text-sm">
          <div className="flex items-center gap-2 font-medium text-ink">
            <span className="h-2 w-2 rounded-full bg-brand" />
            <span>{event.timeLabel}</span>
          </div>
          <button
            type="button"
            onClick={openDirections}
            className="flex items-center gap-2 text-mute hover:text-brand transition text-left"
          >
            <MapPin size={15} className="shrink-0 text-gold" />
            <span>
              {event.venue}, {event.city}
            </span>
          </button>
          {event.ticketPrice && (
            <p className="text-xs font-medium text-mute">
              Admission: <strong className="text-gold">{event.ticketPrice}</strong>
            </p>
          )}
        </div>

        {/* Secondary status — one quiet row, never competing with the primary */}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (toggleInterested(event.id) && !event.isInterested)
                toast.success(`Saved "${event.title}" to Interested`);
            }}
            className={cn(
              "inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition active:scale-[0.98]",
              event.isInterested
                ? "bg-ink text-white"
                : "bg-card text-mute ring-1 ring-line hover:text-ink",
            )}
          >
            <Star
              size={15}
              className={event.isInterested ? "fill-white" : ""}
              strokeWidth={event.isInterested ? 2.5 : 2}
            />
            <span>{event.isInterested ? "Saved" : "Save"}</span>
          </button>

          <button
            type="button"
            aria-pressed={event.isLiked}
            aria-label={event.isLiked ? "Liked" : "Like this event"}
            onClick={() => {
              if (toggleLiked(event.id) && !event.isLiked) toast.success(`Liked "${event.title}"`);
            }}
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95",
              event.isLiked
                ? "bg-ink text-white"
                : "bg-card text-mute ring-1 ring-line hover:text-ink",
            )}
          >
            <Heart size={16} className={event.isLiked ? "fill-white" : ""} strokeWidth={event.isLiked ? 2.5 : 2} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setTripOpen(true)}
          className="mt-2.5 flex h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-full bg-brand/10 text-sm font-semibold text-brand transition hover:bg-brand/15 active:scale-[0.99]"
        >
          <Plus size={16} />
          <span>Add to Trip</span>
        </button>
        <AddToTripSheet
          open={tripOpen}
          onClose={() => setTripOpen(false)}
          stop={{
            name: event.title,
            address: `${event.venue}, ${event.city}`,
            notes: `${event.date} · ${event.timeLabel}`,
          }}
        />

        {/* Progressive disclosure — description and logistics wait one tap away */}
        <div className="mt-4 overflow-hidden rounded-2xl bg-card ring-1 ring-line">
          <button
            type="button"
            onClick={() => setDetailsOpen((o) => !o)}
            aria-expanded={detailsOpen}
            className="flex w-full cursor-pointer touch-manipulation items-center justify-between px-4 py-3.5 text-left"
          >
            <span className="text-[15px] font-semibold">More details</span>
            <ChevronDown
              size={17}
              className={cn("text-mute transition-transform", detailsOpen && "rotate-180")}
            />
          </button>
          {detailsOpen && (
            <div className="border-t border-line/70 px-4 py-4">
              <p className="text-sm leading-relaxed text-ink whitespace-pre-line">{event.description}</p>
              <div className="mt-4">
                <HereCheckIn placeName={event.venue} eventId={event.id} />
              </div>
              <div className="mt-4 flex flex-col gap-2.5">
                {event.ticketUrl && (
                  <Button className="w-full" onClick={() => window.open(event.ticketUrl, "_blank")}>
                    Get Tickets / Official Info
                  </Button>
                )}
                <AddToCalendarMenu
                  event={event}
                  className="w-full"
                  buttonClassName="w-full bg-card hover:bg-paper ring-1 ring-line text-xs py-2.5"
                  label="Add to Calendar (Google, Apple, Outlook, 365)"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* One primary action, thumb-reachable: decide → act */}
      <StickyAction
        primary={
          <button
            type="button"
            onClick={() => {
              const applied = toggleGoing(event.id);
              if (applied && !event.isGoing) toast.success(`You're going to "${event.title}"`);
            }}
            className={cn(
              "flex h-12 w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition active:scale-[0.99]",
              event.isGoing ? "bg-emerald-600 text-white" : "bg-brand text-white",
            )}
          >
            <Check size={17} strokeWidth={event.isGoing ? 3 : 2.2} />
            <span>{event.isGoing ? "You're going ✓" : "Add to AirPal — I'm going"}</span>
          </button>
        }
      />
    </div>
  );
}

function NearbyEventDetailView({ event: ev }: { event: NearbyEvent }) {
  const [, nav] = useLocation();
  useEffect(() => {
    setShareMeta({
      title: `${ev.title} · AirPal`,
      description: `${ev.title} — ${ev.insiderTip || ev.detail || "find it on AirPal.Me."}`.slice(0, 160),
      image: ev.heroImage || undefined,
      url: `${window.location.origin}/e/${ev.id}`,
    });
  }, [ev.id, ev.title, ev.insiderTip, ev.detail, ev.heroImage]);
  return (
    <div className="mx-auto max-w-lg pb-10">
      {ev.heroImage && (
        <img src={ev.heroImage} alt="" referrerPolicy="no-referrer" className="h-72 w-full object-cover" />
      )}
      <div className="px-4 pt-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">{ev.when}</p>
        <h1 className="font-display mt-1 text-3xl font-semibold">{ev.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed">{ev.insiderTip || ev.detail}</p>
        <p className="mt-2 text-sm text-mute">{[ev.venueName, ev.ticketPrice].filter(Boolean).join(" · ")}</p>
        <div className="mt-6 flex gap-3">
          {ev.ticketUrl && (
            <Button className="flex-1" onClick={() => window.open(ev.ticketUrl, "_blank")}>
              Tickets
            </Button>
          )}
          <Button variant="ghost" className="flex-1" onClick={() => nav("/calendar")}>
            Calendar
          </Button>
        </div>
      </div>
    </div>
  );
}
