import { useState, useEffect, useMemo } from "react";
import { Bell, CalendarDays, CircleHelp, ClipboardCheck, Shield, Sparkles, Utensils, Wifi } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { PlaceCard } from "@/components/discovery/PlaceCard";
import { LocalFavorites } from "@/components/stay/LocalFavorites";
import { EmojiRate } from "@/components/feedback/EmojiRate";
import { ArrivalGuide } from "@/components/stay/ArrivalGuide";
import { FoodOrderPanel } from "@/components/stay/FoodOrderPanel";
import { YourRoomCard } from "@/components/stay/YourRoomCard";
import { roomTypeForNumber } from "@/lib/host-rooms";
import { useStay } from "@/contexts/StayContext";
import { useStayUi } from "@/contexts/StayUiContext";
import { useListings } from "@/contexts/ListingsContext";
import { askLocal } from "@/lib/ask";
import { nearbyForMarker } from "@/lib/catalog";
import { eventsTonight } from "@/lib/local-events";
import { tonightCalendarEvents } from "@/lib/remote-events";
import { useEvents } from "@/contexts/EventsContext";
import { askAirPalRemote, getPropertyWifiRemote, liveBackendEnabled } from "@/lib/functions";
import { fetchPropertyMenu } from "@/lib/properties";
import type { MenuItem } from "@shared/airpal-data";
import { categoryFromGuestText, submitStaffTicket } from "@/lib/tickets-store";
import { toast } from "sonner";
import { useLocale } from "@/contexts/LocaleContext";
import { useLocalNow } from "@/hooks/useLocalNow";
import { demoModeActive, track, trackContentAction, trackFirstValue } from "@/lib/analytics";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { isDuplicateSubmission, submissionFingerprint } from "@shared/abuse";
import { triggerHaptic } from "@/lib/native";

export function ConciergePage() {
  const { session, roomLabel, property, loadingProperty, marker } = useStay();
  const { openAnswers, openContact, openChecklist } = useStayUi();
  const { version: catalogVersion } = useListings();
  const { t } = useLocale();
  const { now, timeZone, city } = useLocalNow();
  const { calendarEvents, remoteNearby } = useEvents();
  const [, nav] = useLocation();
  // Tonight around the guest, for Ask answers — live DB data only.
  const tonightForAsk = useMemo(() => {
    const nearby = eventsTonight(remoteNearby, now, timeZone).map((ev) => ({ title: ev.title, sub: ev.when }));
    const cal = tonightCalendarEvents(calendarEvents, now, timeZone, city).map((ev) => ({
      title: ev.title,
      sub: ev.timeLabel,
    }));
    return [...nearby, ...cal.filter((e) => !nearby.some((n) => n.title === e.title))];
  }, [remoteNearby, calendarEvents, now, timeZone, city]);
  const [sheet, setSheet] = useState<null | "wifi" | "staff" | "dining" | "ask" | "safety">(null);
  const [ask, setAsk] = useState("");
  const [answer, setAnswer] = useState<{ title: string; body: string } | null>(null);
  const [wifi, setWifi] = useState(property.wifi);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [ticket, setTicket] = useState("");
  const [ticketSending, setTicketSending] = useState(false);
  const lastTicketAt = useState(() => ({ at: 0, fingerprint: "" }))[0];

  const hasStay =
    session.kind === "stay" || session.kind === "campus" || Boolean(roomLabel) || Boolean(session.propertyId);

  useEffect(() => {
    // Never invent a password: empty means "ask the desk", never a seed fallback.
    setWifi({ ...property.wifi, password: property.wifi.password || "" });
  }, [property.wifi]);

  useEffect(() => {
    let alive = true;
    if (!property.id || property.id === "unknown" || !property.name) {
      setMenu([]);
      return;
    }
    void fetchPropertyMenu(property.id).then((rows) => {
      if (alive) setMenu(rows.filter((item) => item.available !== false));
    });
    return () => {
      alive = false;
    };
  }, [property.id, property.name]);

  const nearby = useMemo(() => nearbyForMarker().slice(0, 4), [catalogVersion, session.propertyId, marker?.id]);

  async function loadWifi() {
    setSheet("wifi");
    if (property.wifi.password) setWifi((prev) => ({ ...prev, password: property.wifi.password }));
    if (liveBackendEnabled() && session.propertyId) {
      try {
        const res = await getPropertyWifiRemote({
          propertyId: session.propertyId,
          roomToken: session.roomToken,
          markerId: session.markerId,
        });
        setWifi({ network: res.network, password: res.password, speed: res.speed || property.wifi.speed });
      } catch {
        /* seed fallback */
      }
    }
    trackContentAction("wifi_reveal", session.propertyId || property.id);
  }

  async function runAsk() {
    const local = askLocal(ask, {
      room: roomLabel || undefined,
      property,
      now,
      timeZone,
      tonight: tonightForAsk,
    });
    setAnswer(local);
    if (liveBackendEnabled()) {
      try {
        const remote = await askAirPalRemote({ propertyId: session.propertyId || property.id, question: ask });
        setAnswer(remote);
      } catch {
        /* keep local */
      }
    }
    if (ask.trim()) {
      const contextId = session.propertyId || property.id;
      void track("ask_submitted", { contextId, questionCategory: "stay" });
      void track("ask_answered", { contextId, answerStatus: "shown", questionCategory: "stay" });
      trackFirstValue("answer", contextId);
    }
  }

  if (!hasStay && session.kind !== "marker") {
    return (
      <div className="mx-auto max-w-lg px-4 pb-10">
        <div className="relative mt-2 overflow-hidden rounded-[28px] bg-ink">
          {property.heroImage && <img src={property.heroImage} alt="" className="h-72 w-full object-cover" />}
          <div className="hero-scrim absolute inset-0" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/70">{t("concierge")}</p>
            <h1 className="font-display text-3xl font-semibold text-white">{t("scanRoom")}</h1>
            <p className="mt-1 text-sm text-white/75">Scan the lobby or room QR for Wi-Fi, tonight, and the desk.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          <Button className="w-full" onClick={() => nav("/scan")}>
            {t("scan")}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => nav("/")}>
            {t("explore")}
          </Button>
        </div>
      </div>
    );
  }

  if (loadingProperty && !property.name) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-10">
        <div className="mt-2 h-48 animate-pulse rounded-[28px] bg-card ring-1 ring-line" />
        <div className="mt-5 grid grid-cols-2 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-card ring-1 ring-line" />
          ))}
        </div>
      </div>
    );
  }

  const tiles = [
    { id: "answers" as const, label: t("answers"), icon: CircleHelp, run: openAnswers },
    { id: "leave" as const, label: t("leave"), icon: ClipboardCheck, run: openChecklist },
    { id: "wifi" as const, label: t("wifi"), icon: Wifi, run: loadWifi },
    { id: "staff" as const, label: t("staff"), icon: Bell, run: () => setSheet("staff") },
    { id: "dining" as const, label: t("dining"), icon: Utensils, run: () => setSheet("dining") },
    { id: "events" as const, label: t("calendar") || "Events", icon: CalendarDays, run: () => nav("/calendar") },
    { id: "host" as const, label: t("host"), icon: Sparkles, run: () => openContact() },
    { id: "safety" as const, label: t("help"), icon: Shield, run: () => setSheet("safety") },
  ];

  return (
    <div className="mx-auto max-w-lg px-4 pb-10">
      <div className="relative mt-1 overflow-hidden rounded-[28px] bg-ink">
        {property.heroImage && <img src={property.heroImage} alt="" className="h-48 w-full object-cover" />}
        <div className="hero-scrim absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/70">
            {roomLabel
              ? `Room ${roomLabel}`
              : property.city || property.destination || t("concierge")}
          </p>
          <h1 className="font-display text-2xl font-semibold text-white">{property.name || t("scanRoom")}</h1>
          {property.tagline ? <p className="mt-1 text-sm text-white/80">{property.tagline}</p> : null}
          {demoModeActive() && (
            <div className="mt-2">
              <DemoBadge />
            </div>
          )}
        </div>
      </div>

      {property.name ? <ArrivalGuide /> : null}

      {roomLabel ? (
        <YourRoomCard
          roomNumber={roomLabel}
          roomType={roomTypeForNumber(property.roomTypes, roomLabel)}
          checkIn={property.checkIn}
          checkOut={property.checkOut}
        />
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-2">
        {tiles.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={t.run}
            className="flex touch-manipulation items-center gap-3 rounded-2xl bg-card px-4 py-3.5 ring-1 ring-line transition hover:ring-brand/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <t.icon size={18} className="shrink-0 text-brand" />
            <span className="truncate text-sm font-medium">{t.label}</span>
          </button>
        ))}
      </div>

      <form
        className="mt-5 flex items-center gap-2 rounded-full bg-card px-4 py-2 ring-1 ring-line transition focus-within:ring-2 focus-within:ring-brand"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ask.trim()) return;
          setSheet("ask");
          void runAsk();
        }}
      >
        <Sparkles size={16} className="shrink-0 text-brand" />
        <input
          value={ask}
          onChange={(e) => setAsk(e.target.value)}
          placeholder={t("askAirPal")}
          aria-label={t("askAirPal")}
          className="h-10 w-full bg-transparent text-[15px] outline-none"
        />
      </form>

      <EmojiRate target="stay" propertyId={session.propertyId || property.id} />

      <LocalFavorites />

      <div className="mt-8 flex items-end justify-between">
        <h2 className="font-display text-xl font-semibold">{t("aroundYou")}</h2>
        <button className="text-sm text-mute" onClick={() => nav("/")}>
          {t("all")}
        </button>
      </div>
      {nearby.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-card px-4 py-5 text-center text-sm text-mute ring-1 ring-line">
          {t("aroundEmpty")}
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {nearby.map((p) => (
            <PlaceCard key={p.id} place={p} walk={p.walk} />
          ))}
        </div>
      )}

      <Sheet open={sheet === "wifi"} onClose={() => setSheet(null)} title={t("wifi")}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">Network</p>
        <p className="font-display text-2xl">{wifi.network || "Ask the desk"}</p>
        {wifi.speed ? <p className="mt-1 text-sm text-mute">{wifi.speed}</p> : null}
        {wifi.password ? (
          <>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">Password</p>
            <p className="mt-1 font-mono text-lg">{wifi.password}</p>
            <Button
              className="mt-5 w-full"
              onClick={() => {
                void (async () => {
                  try {
                    await navigator.clipboard.writeText(wifi.password);
                    void triggerHaptic("success");
                    toast.success(t("copied"));
                  } catch {
                    toast.error("Copy failed — long-press the password to copy it manually.");
                  }
                })();
              }}
            >
              Copy
            </Button>
          </>
        ) : (
          <p className="mt-4 text-sm text-mute">Scan the room or lobby QR for the live password, or ask the desk.</p>
        )}
      </Sheet>

      <Sheet open={sheet === "staff"} onClose={() => setSheet(null)} title={t("staff")}>
        <textarea
          value={ticket}
          onChange={(e) => setTicket(e.target.value)}
          placeholder="Towels, extra pillow, AC…"
          aria-label="Describe your request for the front desk"
          className="h-28 w-full rounded-2xl bg-paper p-3 text-[15px] outline-none border border-ink transition focus:ring-2 focus:ring-brand focus:border-brand"
        />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {["Towels", "Clean", "Late checkout", "Extra night", "Room move", "Early check-in"].map((quick) => {
            const selected = ticket === quick;
            return (
              <button
                key={quick}
                type="button"
                aria-pressed={selected}
                onClick={() => setTicket(quick)}
                className={
                  selected
                    ? "h-10 rounded-full bg-brand text-sm font-semibold text-white ring-1 ring-brand transition active:scale-95"
                    : "h-10 rounded-full bg-paper text-sm ring-1 ring-line transition hover:ring-brand/40 active:scale-95"
                }
              >
                {quick}
              </button>
            );
          })}
        </div>
        <Button
          className="mt-4 w-full"
          loading={ticketSending}
          onClick={() => {
            if (!ticket.trim() || ticketSending) return;
            if (!property.id || property.id === "unknown" || !property.name) {
              toast.error("This stay isn’t listed yet. Ask the desk.");
              return;
            }
            const fingerprint = submissionFingerprint([property.id, roomLabel, ticket.trim()]);
            if (fingerprint === lastTicketAt.fingerprint && isDuplicateSubmission(lastTicketAt.at)) {
              toast.message("Already sent");
              return;
            }
            lastTicketAt.fingerprint = fingerprint;
            lastTicketAt.at = Date.now();
            const details = ticket.trim();
            const category = categoryFromGuestText(details);
            setTicketSending(true);
            void (async () => {
              try {
                const saved = await submitStaffTicket({
                  propertyId: property.id,
                  details,
                  roomNumber: roomLabel || "Guest",
                  category,
                });
                void track("support_request", {
                  contextId: property.id,
                  requestId: saved.id,
                  category,
                  priority: saved.urgency,
                });
                toast.success("Sent to front desk", {
                  description: `Room ${roomLabel || "Guest"} · the host is notified.`,
                });
                setSheet(null);
                setTicket("");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Couldn’t send. Ask the desk.");
              } finally {
                setTicketSending(false);
              }
            })();
          }}
        >
          {ticketSending ? "Sending…" : "Send"}
        </Button>
      </Sheet>

      <Sheet open={sheet === "dining"} onClose={() => setSheet(null)} title={t("dining")}>
        <p className="text-sm text-mute">{property.breakfast?.hours || "Dining hours — ask the front desk"}</p>
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl bg-paper p-4 ring-1 ring-line">
            <p className="font-medium">{property.breakfast?.type || "Breakfast & Dining"}</p>
            <p className="text-sm text-mute mt-1">{property.breakfast?.location || property.address || "On site"}</p>
            <p className="text-sm text-brand mt-1">{property.breakfast?.price || "Ask front desk"}</p>
          </div>
          <FoodOrderPanel
            propertyId={property.id}
            menu={menu}
            venues={property.venues || []}
            roomDefault={roomLabel || "Guest"}
          />
        </div>
      </Sheet>

      <Sheet open={sheet === "safety"} onClose={() => setSheet(null)} title={t("help")}>
        <p className="text-sm">{property.name ? `${property.name} Front Desk & Duty Manager` : "Front Desk & Duty Manager"}</p>
        <p className="mt-2 text-sm text-mute">
          {property.address || "Contact staff at front desk for emergency procedures"}
        </p>
        {property.phone && (
          <a className="mt-4 block font-medium text-brand" href={`tel:${property.phone}`}>
            {property.phone}
          </a>
        )}
        <a className="mt-2 block text-sm text-mute" href="tel:000">
          Emergency: 000
        </a>
      </Sheet>

      <Sheet open={sheet === "ask"} onClose={() => setSheet(null)} title={answer?.title || "Ask"}>
        <p className="text-[15px] leading-relaxed">{answer?.body}</p>
      </Sheet>
    </div>
  );
}
