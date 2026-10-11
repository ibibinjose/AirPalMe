import { useEffect, useRef, useState } from "react";
import { useRoute, useLocation, useSearch, Link } from "wouter";
import { Check, ChevronDown, Heart, MapPin, Plus, Share2, Sparkles, Star, ArrowLeft, ArrowRight, Ticket, Users } from "lucide-react";
import { toast } from "sonner";
import { StickyAction } from "@/components/design-system/companions";
import { Button } from "@/components/ui/Button";
import { AddToCalendarMenu } from "@/components/calendar/AddToCalendarMenu";
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
import { shareNative } from "@/lib/native";
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
    if (!remoteLoaded || !directDone || expo || calEv || near || directEv || !id || loadFailed.current === id)
      return;
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

  const paidCents = event.ticketPriceCents || 0;
  const isPaid = paidCents > 0;

  const effectiveSpots = tier === "group" ? 4 : spots;
  const unitPriceCents =
    tier === "vip"
      ? Math.round(paidCents * 1.5)
      : tier === "group"
        ? Math.round(paidCents * 0.9)
        : paidCents;
  const effectivePriceCents = isPaid
    ? tier === "group"
      ? Math.round(paidCents * 4 * 0.9)
      : unitPriceCents * spots
    : 0;

  async function buyTicket() {
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);

  const handleShare = async () => {
    const shared = await shareNative({
      title: event.title,
      text: `${event.title} in ${event.city} on ${event.timeLabel}`,
      url: toPublicUrl(`/e/${event.id}`),
    });
    if (!shared) {
      toast.success("Event link copied to clipboard");
    }
  };

  const openDirections = () => {
    const venueOrTitle = event.venue || event.title;
    const query = encodeURIComponent(`${venueOrTitle}, ${event.city}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  return (
    <div className="mx-auto max-w-lg pb-48">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line/60">
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
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 ring-1 ring-amber-400/30">
          <Ticket size={13} />
          <span>AirPal Pass</span>
        </div>

        <button
          type="button"
          onClick={handleShare}
          aria-label="Share event"
          className="grid h-11 w-11 place-items-center rounded-full bg-card ring-1 ring-line text-mute hover:text-ink transition cursor-pointer"
          title="Share"
        >
          <Share2 size={16} />
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
            <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-accent">
              <Sparkles size={11} /> Local Event
            </span>
          )}
          <Link
            href={`/plan/new?title=${encodeURIComponent(event.title)}&date=${event.date}`}
            className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition"
          >
            <Sparkles size={11} className="text-accent" /> Add to Day Plan
          </Link>
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
            aria-label={`Get directions to ${event.venue}, ${event.city}`}
            className="flex min-h-[44px] items-center gap-2 text-mute hover:text-accent transition text-left"
          >
            <MapPin size={15} className="shrink-0 text-accent" />
            <span>
              {[event.venue, event.room].filter(Boolean).join(" · ")}, {event.city}
            </span>
          </button>
          {event.speakers && event.speakers.length > 0 && (
            <div className="border-t border-line/60 pt-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-accent mb-1">Speakers &amp; Artists</p>
              <SpeakerRow speakers={event.speakers} />
            </div>
          )}
          {/* Ticket Options & Tier Selection */}
          <div className="border-t border-line/60 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent mb-2">
              Ticket Options &amp; Passes
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "standard", label: "General", desc: isPaid ? `$${(paidCents / 100).toFixed(0)}` : "Free" },
                { id: "vip", label: "VIP Pass", desc: isPaid ? `$${(Math.round(paidCents * 1.5) / 100).toFixed(0)}` : "VIP" },
                { id: "group", label: "Group (4)", desc: isPaid ? "10% Off" : "4 Passes" },
              ].map((t) => {
                const active = tier === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTier(t.id as any)}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl p-2 text-center transition active:scale-95 cursor-pointer ring-1",
                      active
                        ? "bg-brand text-white ring-brand shadow-xs"
                        : "bg-paper text-ink ring-line hover:bg-card",
                    )}
                  >
                    <span className="text-xs font-bold">{t.label}</span>
                    <span className={cn("text-[10px] mt-0.5", active ? "text-amber-300 font-semibold" : "text-mute")}>
                      {t.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {tier !== "group" && (
              <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-line/50">
                <span className="text-xs font-semibold text-mute">Passes:</span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 4].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setSpots(qty)}
                      className={cn(
                        "h-7 w-7 rounded-lg text-xs font-bold transition active:scale-95 ring-1",
                        spots === qty
                          ? "bg-brand text-white ring-brand"
                          : "bg-paper text-ink ring-line hover:bg-card",
                      )}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isPaid && (
              <div className="mt-2 flex items-center justify-between text-xs font-semibold text-ink pt-2 border-t border-line/40">
                <span className="text-mute">Total for {effectiveSpots} {effectiveSpots === 1 ? "pass" : "passes"}:</span>
                <span className="text-sm font-bold text-accent">
                  ${(effectivePriceCents / 100).toFixed(2)} AUD
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Guestlist Roster Preview */}
        <div className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-line">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-accent" />
              <p className="text-sm font-bold text-ink">Guestlist &amp; Check-in</p>
            </div>
            <Link
              href={`/e/${event.id}/guests`}
              className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
            >
              <span>View Roster</span>
              <ArrowRight size={12} />
            </Link>
          </div>
          <p className="mt-1 text-xs text-mute">
            Live attendee guestlist and gate check-in roster for this experience.
          </p>
        </div>

        {/* Venue Location Map */}
        <div className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-line overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-accent" />
              <p className="text-sm font-bold text-ink">Venue Location</p>
            </div>
            <button
              type="button"
              onClick={openDirections}
              className="text-xs font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Directions</span>
              <ArrowRight size={12} />
            </button>
          </div>
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-paper ring-1 ring-line/50">
            <iframe
              title={`Map of ${event.venue || event.title}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(`${event.venue || ""}, ${event.city}`)}&z=15&output=embed`}
              className="h-full w-full border-0"
              loading="lazy"
            />
          </div>
          <p className="mt-2 text-xs text-mute font-medium truncate">
            {[event.venue, event.room].filter(Boolean).join(" · ")}, {event.city}
          </p>
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
              "inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition active:scale-[0.98]",
              event.isInterested
                ? "bg-ink text-paper"
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
              "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-95",
              event.isLiked
                ? "bg-ink text-paper"
                : "bg-card text-mute ring-1 ring-line hover:text-ink",
            )}
          >
            <Heart size={16} className={event.isLiked ? "fill-white" : ""} strokeWidth={event.isLiked ? 2.5 : 2} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setTripOpen(true)}
          className="mt-2.5 flex h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-full bg-brand/10 text-sm font-semibold text-accent transition hover:bg-brand/15 active:scale-[0.99]"
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
          isPaid && !event.isGoing ? (
            <button
              type="button"
              onClick={() => void buyTicket()}
              disabled={buying}
              className="flex h-12 w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-full bg-brand text-[15px] font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
            >
              <span>{buying ? "Starting checkout…" : `Get ${effectiveSpots > 1 ? `${effectiveSpots} tickets` : "ticket"} · $${(effectivePriceCents / 100).toFixed(2)}`}</span>
            </button>
          ) : (
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
          )
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
    <div className="mx-auto max-w-lg pb-28">
      {ev.heroImage && (
        <img src={ev.heroImage} alt="" referrerPolicy="no-referrer" className="h-72 w-full object-cover" />
      )}
      <div className="px-4 pt-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">{ev.when}</p>
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
