import { useEffect, useRef, useState } from "react";
import { useRoute, useLocation, useSearch, Link } from "wouter";
import { ArrowLeft, Calendar, Heart, Plus, Share2, Sparkles, Star, Ticket } from "lucide-react";
import { toast } from "sonner";
import { StickyAction } from "@/components/design-system/companions";
import { Button } from "@/components/ui/Button";
import { createBookingForEvent } from "@/components/booking/BookingsSection";
import { createBookingCheckoutSessionRemote } from "@/lib/functions";
import { useAuth } from "@/contexts/AuthContext";
import { toZonedDateStr } from "@/lib/local-time";
import { useEvents } from "@/contexts/EventsContext";
import { formatRelativeBadge } from "@/lib/calendar-utils";
import { setShareMeta } from "@/lib/share-meta";
import { toPublicUrl } from "@/lib/public-origin";
import { cn } from "@/lib/cn";
import { track } from "@/lib/analytics";
import { AddToTripSheet } from "@/components/plan/AddToTripSheet";
import type { CalendarEvent } from "@shared/event";
import type { NearbyEvent } from "@shared/nearby";
import { ExpoDirectoryPage } from "./ExpoDirectoryPage";
import { SpeakerRow } from "@/components/event/SpeakerRow";
import { PageLoading } from "@/components/ui/PageLoading";
import { NotFoundPage } from "./NotFoundPage";
import { useLocalNow } from "@/hooks/useLocalNow";
import { HereCheckIn } from "@/components/circle/HereCheckIn";
import { TicketGatePanel } from "@/components/booking/TicketGatePanel";
import { ticketIdFromSearch } from "@shared/booking";

import { EventCoverGlow } from "@/components/event/EventCoverGlow";
import { EventDateCalendarBlock } from "@/components/event/EventDateCalendarBlock";
import { EventHostCard } from "@/components/event/EventHostCard";
import { EventGuestlistAvatars } from "@/components/event/EventGuestlistAvatars";
import { EventInviterPill } from "@/components/event/EventInviterPill";
import { EventLocationCard } from "@/components/event/EventLocationCard";
import { EventRegistrationCard } from "@/components/event/EventRegistrationCard";
import { EventShareModal } from "@/components/event/EventShareModal";

export function EventPage() {
  const [, params] = useRoute("/e/:id");
  const id = params?.id || "";
  const search = useSearch();
  const { user } = useAuth();
  // Gate-scan QR landings (?ticket=). Guests never fire it; non-entitled
  // signed-in viewers get a silent denial and the plain event page.
  const ticketId = user ? ticketIdFromSearch(search) : null;
  const {
    getEvent: getExpo,
    calendarEvents,
    remoteNearby,
    remoteLoaded,
    fetchRemoteStalls,
    fetchRemoteEvent,
  } = useEvents();
  const [directEv, setDirectEv] = useState<CalendarEvent | null>(null);
  const [directDone, setDirectDone] = useState(false);

  useEffect(() => {
    if (id) void fetchRemoteStalls(id);
  }, [id, fetchRemoteStalls]);

  const expo = getExpo(id);
  const calEv = calendarEvents.find((e) => e.id === id);
  // Migrated curated events live in Firestore, not in the bundle.
  const near = remoteNearby.find((e) => e.id === id);

  // Direct by-id fallback for deep links the list fetch skipped (demo docs).
  // Renders the exact same detail view as live content.
  useEffect(() => {
    setDirectEv(null);
    setDirectDone(false);
    if (!id || expo || calEv || near || !remoteLoaded) return;
    let alive = true;
    void fetchRemoteEvent(id).then((base) => {
      if (!alive) return;
      if (base) setDirectEv(base);
      setDirectDone(true);
    });
    return () => {
      alive = false;
    };
  }, [id, expo, calEv, near, remoteLoaded, fetchRemoteEvent]);

  // A context_view with loadStatus "ok" already fired for /e/:id — pair it
  // with context_load_failed when nothing resolves, or the miss reads as a hit.
  const loadFailed = useRef("");
  useEffect(() => {
    if (!remoteLoaded || !directDone || expo || calEv || near || directEv || !id || loadFailed.current === id) return;
    loadFailed.current = id;
    void track("context_load_failed", { contextType: "event", contextId: id, errorClass: "not_found" });
  }, [remoteLoaded, directDone, expo, calEv, near, directEv, id]);

  if (!remoteLoaded || (!expo && !calEv && !near && !directEv && !directDone)) {
    return <PageLoading />;
  }

  const body = expo ? (
    <ExpoDirectoryPage event={expo} />
  ) : calEv ? (
    <CalendarEventDetailView event={calEv} />
  ) : near ? (
    <NearbyEventDetailView event={near} />
  ) : directEv ? (
    <CalendarEventDetailView event={directEv} />
  ) : (
    <NotFoundPage />
  );
  return (
    <>
      {ticketId && (
        <div className="mx-auto max-w-lg px-4 pt-4">
          <TicketGatePanel ticketId={ticketId} />
        </div>
      )}
      {body}
    </>
  );
}

function CalendarEventDetailView({ event }: { event: CalendarEvent }) {
  const [, nav] = useLocation();
  const { user, requireUser } = useAuth();
  const { toggleGoing, toggleInterested, toggleLiked, getEvent } = useEvents();
  const [buying, setBuying] = useState(false);
  const [tier, setTier] = useState<"standard" | "vip" | "group">("standard");
  const [spots, setSpots] = useState<number>(1);
  const [tripOpen, setTripOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const paidCents = event.ticketPriceCents || 0;
  const isPaid = paidCents > 0;

  const effectiveSpots = tier === "group" ? 4 : spots;
  const unitPriceCents =
    tier === "vip" ? Math.round(paidCents * 1.5) : tier === "group" ? Math.round(paidCents * 0.9) : paidCents;
  const effectivePriceCents = isPaid
    ? tier === "group"
      ? Math.round(paidCents * 4 * 0.9)
      : unitPriceCents * spots
    : 0;

  async function handleRegisterOrBuy() {
    if (!isPaid) {
      const applied = toggleGoing(event.id);
      if (applied && !event.isGoing) {
        toast.success(`You're registered for "${event.title}"! Added to your AirPal Pass.`);
      }
      return;
    }

    if (!requireUser("Sign in to get tickets.")) return;
    if (!user) return;
    const record = getEvent(event.id);
    const providerUid =
      event.organiserUid || (record && "organiserUid" in record ? record.organiserUid : undefined) || "";
    if (!providerUid) {
      toast.error("Tickets aren't on sale for this event yet.");
      return;
    }
    const providerName =
      event.hostName ||
      (record && "hostName" in record && record.hostName) ||
      (record && "businessName" in record && record.businessName) ||
      "Event organiser";
    const at = new Date(event.startsAt);
    const date = Number.isNaN(at.getTime()) ? event.date : toZonedDateStr(at);
    const time = Number.isNaN(at.getTime())
      ? ""
      : `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
    setBuying(true);
    try {
      const bookingId = await createBookingForEvent({
        eventId: event.id,
        providerUid,
        providerName: String(providerName),
        title: `${event.title}${tier === "vip" ? " (VIP Pass)" : tier === "group" ? " (Group Pass · 4 Tickets)" : ""}`,
        suburb: event.city,
        date,
        time,
        priceCents: effectivePriceCents,
        customerUid: user.uid,
        spots: effectiveSpots,
      });
      const res = await createBookingCheckoutSessionRemote({ bookingId });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      toast.success("Ticket reserved — added to your AirPal Pass wallet");
      nav(`/ticket/${bookingId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start checkout.");
    } finally {
      setBuying(false);
    }
  }

  useEffect(() => {
    setShareMeta({
      title: `${event.title} · AirPal`,
      description: `${event.title} in ${event.city} on ${event.timeLabel} — find it on AirPal.Me.`.slice(0, 160),
      image: event.heroImage || undefined,
      url: toPublicUrl(`/e/${event.id}`),
    });
  }, [event.id, event.title, event.city, event.timeLabel, event.heroImage]);

  const { today } = useLocalNow();
  const relative = formatRelativeBadge(event.date, today);

  const handleShare = () => {
    setShareOpen(true);
  };

  return (
    <div className="min-h-screen pb-44 lg:pb-24">
      {/* Top Glass Navigation Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line/60 bg-card/80 px-4 py-3 backdrop-blur-xl transition">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              nav("/pass");
            }
          }}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-mute hover:text-ink transition cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>Back</span>
        </button>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 ring-1 ring-amber-400/30">
          <Ticket size={13} />
          <span>AirPal Pass</span>
        </div>

        <button
          type="button"
          onClick={handleShare}
          aria-label="Share event"
          className="grid h-10 w-10 place-items-center rounded-full bg-card ring-1 ring-line text-mute hover:text-ink transition cursor-pointer active:scale-95 shadow-xs"
          title="Share"
        >
          <Share2 size={16} />
        </button>
      </div>

      {/* Main Responsive Grid Layout (Luma 2-Column Desktop Architecture) */}
      <div className="mx-auto max-w-5xl px-4 pt-5 sm:pt-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
          {/* LEFT COLUMN (Desktop 5-col sticky sidebar / Mobile top stack) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Luma-style Cover Image with Ambient Specular Glow */}
            <EventCoverGlow
              src={event.heroImage}
              alt={event.title}
              themeColor={event.themeColor}
              aspectRatio="square"
            />

            {/* Host Card with Digital Bio Link and Co-Hosts */}
            <EventHostCard
              hostName={event.hostName}
              hostHandle={event.hostHandle}
              hostType={event.hostType}
              collaboratorHandles={event.collaboratorHandles}
            />

            {/* Social Proof Attendee Avatar Pile */}
            <EventGuestlistAvatars eventId={event.id} />

            {/* Secondary Action Buttons (Save, Like, Add to Trip) */}
            <div className="rounded-[24px] bg-card/90 p-3 ring-1 ring-line/70 shadow-clay backdrop-blur-md">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (toggleInterested(event.id) && !event.isInterested)
                      toast.success(`Saved "${event.title}" to Interested`);
                  }}
                  className={cn(
                    "inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-bold transition active:scale-[0.98] cursor-pointer",
                    event.isInterested
                      ? "bg-ink text-paper shadow-xs"
                      : "bg-paper text-mute ring-1 ring-line hover:text-ink",
                  )}
                >
                  <Star
                    size={14}
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
                    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-95 cursor-pointer ring-1 ring-line",
                    event.isLiked ? "bg-rose-500 text-white ring-rose-500" : "bg-paper text-mute hover:text-ink",
                  )}
                >
                  <Heart size={16} className={event.isLiked ? "fill-white" : ""} strokeWidth={2} />
                </button>

                <button
                  type="button"
                  onClick={() => setTripOpen(true)}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-paper px-3.5 text-xs font-bold text-ink ring-1 ring-line hover:bg-card hover:ring-brand/30 transition active:scale-[0.98] cursor-pointer"
                >
                  <Plus size={14} className="text-accent" />
                  <span>Trip</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (Desktop 7-col primary content / Mobile bottom stack) */}
          <div className="mt-6 lg:mt-0 lg:col-span-7 space-y-4">
            {/* Viral Referral / Inviter Badge (if ref is present) */}
            <EventInviterPill />

            {/* Event Category & Schedule Pill Badge */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-card px-2.5 py-0.5 text-xs font-bold text-ink ring-1 ring-line shadow-2xs">
                {event.categoryLabel}
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-bold ring-1",
                  relative.highlight
                    ? "bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-950 dark:text-amber-200"
                    : "bg-card text-mute ring-line",
                )}
              >
                {relative.label}
              </span>
              {event.isLocal && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-accent">
                  <Sparkles size={11} /> Local Event
                </span>
              )}
              <Link
                href={`/plan/new?title=${encodeURIComponent(event.title)}&date=${event.date}`}
                className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition"
              >
                <Calendar size={11} className="text-accent" /> Add to Day Plan
              </Link>
            </div>

            {/* Event Title & Highlight */}
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink leading-tight">
                {event.title}
              </h1>
              {event.shortWhy && (
                <p className="mt-1.5 text-sm sm:text-base font-medium text-mute leading-snug">{event.shortWhy}</p>
              )}
            </div>

            {/* Apple Calendar Date & Time Block */}
            <EventDateCalendarBlock event={event} />

            {/* Google Maps Location & Venue Card */}
            <EventLocationCard
              venue={event.venue}
              room={event.room}
              address={event.address}
              city={event.city}
              geo={event.geo}
              locationType={event.locationType}
              virtualUrl={event.virtualUrl}
            />

            {/* Luma-style Registration & Ticket Tier Card */}
            <EventRegistrationCard
              paidCents={paidCents}
              capacity={event.capacity}
              requireApproval={event.requireApproval}
              isGoing={event.isGoing}
              buying={buying}
              tier={tier}
              spots={spots}
              onTierChange={setTier}
              onSpotsChange={setSpots}
              onSubmit={handleRegisterOrBuy}
            />

            {/* About Event Description Card */}
            <div className="rounded-[28px] bg-card/90 p-5 ring-1 ring-line/70 shadow-clay backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between border-b border-line/50 pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink">About This Experience</h3>
                <span className="text-[11px] text-mute font-medium">Verified by AirPal</span>
              </div>
              <p className="text-sm sm:text-[15px] leading-relaxed text-ink/90 whitespace-pre-line font-normal">
                {event.description}
              </p>

              {/* In-Person Presence Check-in */}
              <div className="pt-2">
                <HereCheckIn placeName={event.venue} eventId={event.id} />
              </div>

              {/* Off-platform registration link fallback */}
              {event.registrationUrl && (
                <div className="pt-2">
                  <Button
                    variant="tonal"
                    className="w-full text-xs font-bold min-h-[44px]"
                    onClick={() => window.open(event.registrationUrl, "_blank")}
                  >
                    Official External Registration
                  </Button>
                </div>
              )}
            </div>

            {/* Program Lineup & Speakers */}
            {event.speakers && event.speakers.length > 0 && (
              <div className="rounded-[28px] bg-card/90 p-5 ring-1 ring-line/70 shadow-clay backdrop-blur-md space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-accent">
                  Speakers, Artists &amp; Lineup
                </h3>
                <SpeakerRow speakers={event.speakers} />
              </div>
            )}
          </div>
        </div>
      </div>

      <AddToTripSheet
        open={tripOpen}
        onClose={() => setTripOpen(false)}
        stop={{
          name: event.title,
          address: `${event.venue}, ${event.city}`,
          notes: `${event.date} · ${event.timeLabel}`,
        }}
      />

      <EventShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        eventId={event.id}
        title={event.title}
        venue={event.venue}
        date={event.date}
        heroImage={event.heroImage}
      />

      {/* Floating Mobile Sticky Registration Button */}
      <StickyAction
        primary={
          <button
            type="button"
            onClick={() => void handleRegisterOrBuy()}
            disabled={buying}
            className={cn(
              "flex h-12 w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-full text-[15px] font-bold shadow-md transition active:scale-[0.99] disabled:opacity-60",
              event.isGoing ? "bg-emerald-600 text-white" : isPaid ? "bg-brand text-white" : "bg-brand text-white",
            )}
          >
            <span>
              {buying
                ? "Starting checkout…"
                : event.isGoing
                  ? "You're going ✓"
                  : isPaid
                    ? `Get ${effectiveSpots > 1 ? `${effectiveSpots} tickets` : "ticket"} · $${(effectivePriceCents / 100).toFixed(2)}`
                    : "Register Free Pass · I'm going"}
            </span>
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
      url: toPublicUrl(`/e/${ev.id}`),
    });
  }, [ev.id, ev.title, ev.insiderTip, ev.detail, ev.heroImage]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-28">
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
        <div className="lg:col-span-5">
          <EventCoverGlow src={ev.heroImage} alt={ev.title} />
        </div>

        <div className="mt-6 lg:mt-0 lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent">{ev.when}</span>
            {ev.ticketPrice && (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300 ring-1 ring-amber-400/30">
                {ev.ticketPrice}
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-ink">{ev.title}</h1>

          <p className="text-[15px] leading-relaxed text-ink/90 whitespace-pre-line">{ev.insiderTip || ev.detail}</p>

          <EventLocationCard venue={ev.venueName || ev.title} city="Sydney" />

          <div className="flex gap-3 pt-2">
            {ev.ticketUrl && (
              <Button className="flex-1 min-h-[44px] font-bold" onClick={() => window.open(ev.ticketUrl, "_blank")}>
                Official Tickets
              </Button>
            )}
            <Button
              variant="ghost"
              className="flex-1 min-h-[44px] ring-1 ring-line font-bold"
              onClick={() => nav("/calendar")}
            >
              Calendar Schedule
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
