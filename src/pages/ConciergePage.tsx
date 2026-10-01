import { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CircleHelp,
  ClipboardCheck,
  HeartHandshake,
  Share2,
  Shield,
  Sparkles,
  Utensils,
  Wifi,
} from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/Button";
import { TicketPass } from "@/components/plan/TicketPass";
import { PaymentCanceledNotice } from "@/components/booking/PaymentCanceledNotice";
import { Sheet } from "@/components/ui/Sheet";
import { PlaceCard } from "@/components/discovery/PlaceCard";
import { LocalFavorites } from "@/components/stay/LocalFavorites";
import { EmojiRate } from "@/components/feedback/EmojiRate";
import { ArrivalGuide } from "@/components/stay/ArrivalGuide";
import { YourRoomCard } from "@/components/stay/YourRoomCard";
import { StayBookCard } from "@/components/stay/StayBookCard";
import { roomTypeForNumber } from "@/lib/host-rooms";
import { useStay } from "@/contexts/StayContext";
import { useStayUi } from "@/contexts/StayUiContext";
import { useListings } from "@/contexts/ListingsContext";
import { askLocal } from "@/lib/ask";
import { nearbyForMarker } from "@/lib/catalog";
import { eventsTonight } from "@/lib/local-events";
import { tonightCalendarEvents } from "@/lib/remote-events";
import { useEvents } from "@/contexts/EventsContext";
import { askAirPalRemote, getPropertyWifiRemote, liveBackendEnabled, placeDiningOrderRemote } from "@/lib/functions";
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
import { StayCompendium } from "@/components/stay/StayCompendium";
import { AirPalAiReceptionist } from "@/components/stay/AirPalAiReceptionist";

export function ConciergePage() {
  const { session, roomLabel, property, loadingProperty, marker } = useStay();
  const { openAnswers, openContact, openChecklist } = useStayUi();
  const { version: catalogVersion } = useListings();
  const { t } = useLocale();
  const { now, timeZone, city } = useLocalNow();
  const { calendarEvents, remoteNearby } = useEvents();
  const [, nav] = useLocation();
  const bookedId = new URLSearchParams(useSearch()).get("booked") || "";

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
  const [orderQty, setOrderQty] = useState<Record<string, number>>({});
  const [orderRoom, setOrderRoom] = useState("");
  const [ordering, setOrdering] = useState(false);
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
      <div className="mx-auto max-w-lg px-4 pb-28">
        <div className="relative mt-2 overflow-hidden rounded-[28px] ring-1 ring-line bg-ink shadow-xs">
          {property.heroImage && <img src={property.heroImage} alt="" className="h-72 w-full object-cover" />}
          <div className="hero-scrim absolute inset-0" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            <span className="inline-block rounded-full bg-amber-400 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-slate-950 border border-line shadow-xs mb-2">
              Guest Companion · Sydney
            </span>
            <h1 className="font-display text-3xl font-bold text-white">I&apos;m staying here</h1>
            <p className="mt-1 text-sm text-white/80">
              Scan the room or lobby code for Wi-Fi, the desk, and what&apos;s around the stay.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          <Button className="w-full font-bold h-12 shadow-xs" onClick={() => nav("/scan")}>
            Scan a code
          </Button>
          <Button variant="ghost" className="w-full font-bold h-12 ring-1 ring-line" onClick={() => nav("/")}>
            {t("explore")}
          </Button>
        </div>
      </div>
    );
  }

  // A context_view with loadStatus "ok" already fired for /g/:id — pair it
  // with context_load_failed when the stay resolves to nothing, or the miss
  // reads as a hit.
  const loadFailed = useRef("");
  useEffect(() => {
    if (loadingProperty || !session.propertyId) return;
    if (property.id && property.id !== "unknown" && property.name) return;
    if (loadFailed.current === session.propertyId) return;
    loadFailed.current = session.propertyId;
    void track("context_load_failed", {
      contextType: "property",
      contextId: session.propertyId,
      errorClass: "not_found",
    });
  }, [loadingProperty, session.propertyId, property.id, property.name]);

  if (loadingProperty && !property.name) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-28">
        <div className="mt-2 h-48 motion-safe:animate-pulse rounded-3xl bg-card ring-1 ring-line" />
        <div className="mt-5 grid grid-cols-2 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 motion-safe:animate-pulse rounded-2xl bg-card ring-1 ring-line" />
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
    <div className="mx-auto max-w-5xl px-4 pb-12 md:px-6">
      <PaymentCanceledNotice />
      {bookedId ? <TicketPass bookingId={bookedId} /> : null}
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        {/* Left Column: Header Banner, AirPal Mate Priority, Room details & Quick Action Tiles (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative mt-2 overflow-hidden rounded-[28px] ring-1 ring-line bg-ink shadow-xs">
            {property.heroImage && <img src={property.heroImage} alt="" className="h-48 w-full object-cover" />}
            <div className="hero-scrim absolute inset-0" />
            <button
              type="button"
              aria-label="Share this stay"
              onClick={() => {
                void triggerHaptic("light");
                const shareData = {
                  title: property.name || "AirPal Stay & Guide",
                  text: `Stay & Guide for ${property.name || "our stay"}`,
                  url: window.location.href,
                };
                if (navigator.share) {
                  void navigator.share(shareData).catch(() => {
                    /* share dismissed */
                  });
                } else {
                  void navigator.clipboard
                    .writeText(window.location.href)
                    .then(() => toast.success("Stay link copied to clipboard!"))
                    .catch(() => toast.error("Could not copy link"));
                }
              }}
              className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white ring-1 ring-white/25 backdrop-blur-md transition hover:bg-black/50 active:scale-95"
            >
              <Share2 size={18} />
            </button>
            <div className="absolute inset-x-0 bottom-0 p-5">
              <span className="inline-block rounded-full bg-amber-400 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-slate-950 border border-line shadow-xs mb-1.5">
                {`Stay & Guide${roomLabel ? ` · Room ${roomLabel}` : ""}`}
              </span>
              <h1 className="font-display text-2xl font-extrabold text-white">{property.name || t("scanRoom")}</h1>
              {property.tagline ? <p className="mt-1 text-xs text-white/80">{property.tagline}</p> : null}
              {demoModeActive() && (
                <div className="mt-2">
                  <DemoBadge />
                </div>
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl ring-1 ring-white/10 bg-gradient-to-br from-brand via-[#1c08d4] to-[#0d027a] p-4 text-white shadow-md flex items-center justify-between gap-3">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-400/20 blur-xl pointer-events-none" />
            <div className="relative flex items-center gap-3 min-w-0">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 shadow-inner backdrop-blur-md">
                <HeartHandshake size={22} className="text-amber-300" />
              </span>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-xs mb-1">
                  <Sparkles size={11} className="text-slate-950" />
                  AirPal Mate Priority
                </span>
                <p className="text-[13px] font-extrabold text-white leading-snug truncate">
                  Exploring {property.city || "Sydney"} alone?
                </p>
                <p className="text-[11px] text-white/80 font-medium truncate">
                  Find a verified local Mate to go with you.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="relative shrink-0 font-extrabold gap-1.5 shadow-sm rounded-full bg-white text-brand hover:bg-amber-300 hover:text-slate-950 transition active:scale-95 px-4 min-h-[44px]"
              onClick={() => nav("/companion")}
            >
              <span>Find Mate</span>
              <ArrowRight size={14} />
            </Button>
          </div>

          {roomLabel ? (
            <YourRoomCard
              roomNumber={roomLabel || ""}
              roomType={roomTypeForNumber(property.roomTypes, roomLabel)}
              checkIn={property.checkIn}
              checkOut={property.checkOut}
            />
          ) : null}

          {!roomLabel && property.id && property.id !== "unknown" ? <StayBookCard property={property} /> : null}

          {/* Quick Action Tiles */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gold mb-2">Guest Actions</p>
            <div className="grid grid-cols-2 gap-2.5">
              {tiles.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={t.run}
                  className="apple-liquid-glass-card hover-lift flex touch-manipulation items-center gap-3 rounded-2xl p-3.5 shadow-xs transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                    <t.icon size={17} />
                  </span>
                  <span className="truncate text-sm font-bold text-ink">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stay sections sit directly below Guest Actions: chat, call,
              wi-fi, breakfast, check-in/out, then the Good to know guide. */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gold mb-2 px-1">Your stay</p>
            <StayCompendium />
          </div>
        </div>

        {/* Right Column: Ask AirPal, Recommendations, Arrival Guide & Around You (7 cols) */}
        <div className="mt-6 lg:mt-0 lg:col-span-7 space-y-5">
          {/* Ask AirPal Input Form */}
          <form
            className="apple-liquid-glass-light flex items-center gap-2 rounded-full px-4 py-2 shadow-sm transition-all focus-within:ring-2 focus-within:ring-brand focus-within:shadow-md"
            onSubmit={(e) => {
              e.preventDefault();
              if (!ask.trim()) return;
              setSheet("ask");
              void runAsk();
            }}
          >
            <Sparkles size={18} className="shrink-0 text-brand" />
            <input
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              placeholder={t("askAirPal")}
              aria-label={t("askAirPal")}
              className="h-10 w-full bg-transparent text-[15px] outline-none text-ink placeholder:text-mute font-medium"
            />
            <Button type="submit" size="sm" className="rounded-full px-4 font-bold shrink-0">
              Ask
            </Button>
          </form>

          {property.staffPicks && property.staffPicks.length > 0 && (
            <section className="rounded-3xl ring-1 ring-line bg-card p-5 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gold">Host recommends</p>
              <ul className="mt-3 space-y-2.5">
                {property.staffPicks?.map((pick) => (
                  <li key={pick.id} className="flex items-start gap-2.5">
                    <Sparkles size={16} className="mt-0.5 shrink-0 text-brand" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink">{pick.title}</p>
                      {pick.detail ? <p className="text-xs text-mute mt-0.5">{pick.detail}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {property.name ? <ArrivalGuide /> : null}

          {(() => {
            const pulseToken = (property as unknown as { activePulsePublicToken?: string }).activePulsePublicToken;
            if (!pulseToken) return null;
            return (
              <button
                type="button"
                className="mt-6 flex w-full items-center justify-between rounded-[22px] bg-card px-4 py-3 text-left ring-1 ring-line"
                onClick={() => nav(`/pulse/${pulseToken}`)}
              >
                <span>
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">Pulse</span>
                  <span className="block text-sm font-semibold">How is your stay?</span>
                </span>
                <span aria-hidden>→</span>
              </button>
            );
          })()}

          <EmojiRate
            target="stay"
            propertyId={session.propertyId || property.id}
            winbackTitle={property.winbackOffer?.title}
            winbackDetail={property.winbackOffer?.detail}
          />

          <LocalFavorites />

          <div>
            <div className="flex items-end justify-between mb-3">
              <h2 className="font-display text-xl font-bold text-ink">{t("aroundYou")}</h2>
              <button
                type="button"
                className="inline-flex min-h-[44px] items-center px-1 text-xs font-bold text-mute hover:text-ink"
                onClick={() => nav("/")}
              >
                {t("all")}
              </button>
            </div>
            {nearby.length === 0 ? (
              <p className="rounded-2xl ring-1 ring-line bg-card px-4 py-5 text-center text-sm text-mute shadow-xs">
                {t("aroundEmpty")}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                {nearby.map((p) => (
                  <PlaceCard key={p.id} place={p} walk={p.walk} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 24/7 AI Receptionist: AirPal AI */}
      <AirPalAiReceptionist />

      {/* Sheets */}
      <Sheet open={sheet === "wifi"} onClose={() => setSheet(null)} title={t("wifi")}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-mute">Network Name</p>
        <p className="font-display text-2xl font-bold text-ink">{wifi.network || "Ask the desk"}</p>
        {wifi.speed ? <p className="mt-1 text-xs text-mute font-medium">{wifi.speed}</p> : null}
        {wifi.password ? (
          <>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-mute">Password</p>
            <p className="mt-1 font-mono text-xl font-bold text-ink">{wifi.password}</p>
            <Button
              className="mt-5 w-full font-bold shadow-xs"
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
              Copy Password
            </Button>
          </>
        ) : (
          <p className="mt-4 text-xs text-mute">
            Scan the room or lobby QR code for the live password, or ask front desk.
          </p>
        )}
      </Sheet>

      <Sheet open={sheet === "staff"} onClose={() => setSheet(null)} title={t("staff")}>
        <textarea
          value={ticket}
          onChange={(e) => setTicket(e.target.value)}
          placeholder="Towels, extra pillow, AC…"
          aria-label="Describe your request for the front desk"
          className="h-28 w-full rounded-2xl bg-paper p-3 text-[15px] outline-none ring-1 ring-line transition focus:ring-2 focus:ring-brand focus:border-brand font-medium"
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
                    ? "h-10 rounded-full bg-brand text-xs font-bold text-white ring-1 ring-line transition active:scale-95 shadow-xs"
                    : "h-10 rounded-full bg-paper text-xs font-bold text-ink ring-1 ring-line transition hover:bg-card active:scale-95 shadow-xs"
                }
              >
                {quick}
              </button>
            );
          })}
        </div>
        <Button
          className="mt-4 w-full font-bold shadow-xs"
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
          {ticketSending ? "Sending…" : "Send Request"}
        </Button>
      </Sheet>

      <Sheet open={sheet === "dining"} onClose={() => setSheet(null)} title={t("dining")}>
        <p className="text-xs font-bold text-mute">
          {property.breakfast?.hours || "Dining hours — ask the front desk"}
        </p>
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl ring-1 ring-line bg-paper p-4 shadow-xs">
            <p className="font-bold text-ink">{property.breakfast?.type || "Breakfast & Dining"}</p>
            <p className="text-xs text-mute mt-1">{property.breakfast?.location || property.address || "On site"}</p>
            <p className="text-xs font-bold text-brand mt-1">{property.breakfast?.price || "Ask front desk"}</p>
          </div>
          {menu.length > 0 &&
            menu.slice(0, 8).map((item) => {
              const qty = orderQty[item.id] || 0;
              return (
                <div key={item.id} className="rounded-2xl ring-1 ring-line bg-paper p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-mute">{item.category}</p>
                      <p className="font-bold text-ink">{item.name}</p>
                      {item.description ? (
                        <p className="mt-1 text-xs text-mute leading-relaxed">{item.description}</p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-sm font-extrabold text-brand">${item.price}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold text-mute">
                      {qty > 0 ? `A$${(item.price * qty).toFixed(2)}` : "Add to order"}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Remove one ${item.name}`}
                        disabled={qty === 0}
                        onClick={() =>
                          setOrderQty((prev) => {
                            const next = { ...prev };
                            if (qty <= 1) delete next[item.id];
                            else next[item.id] = qty - 1;
                            return next;
                          })
                        }
                        className="grid h-9 w-9 touch-manipulation place-items-center rounded-full text-lg font-bold ring-1 ring-line disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-extrabold" aria-live="polite">
                        {qty}
                      </span>
                      <button
                        type="button"
                        aria-label={`Add one ${item.name}`}
                        onClick={() => setOrderQty((prev) => ({ ...prev, [item.id]: Math.min(20, qty + 1) }))}
                        className="grid h-9 w-9 touch-manipulation place-items-center rounded-full bg-brand text-lg font-bold text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          {menu.length > 0 && (
            <div className="rounded-2xl ring-1 ring-line bg-paper p-4 shadow-xs">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-mute">Room (for delivery)</span>
                <input
                  value={orderRoom}
                  onChange={(e) => setOrderRoom(e.target.value)}
                  placeholder={roomLabel || "e.g. 101"}
                  inputMode="text"
                  className="mt-1 h-11 w-full rounded-2xl bg-card px-4 text-[15px] outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
                />
              </label>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-sm font-extrabold">
                  Total A$
                  {menu.reduce((n, item) => n + item.price * (orderQty[item.id] || 0), 0).toFixed(2)}
                </p>
                <Button
                  disabled={ordering || Object.keys(orderQty).length === 0}
                  loading={ordering}
                  onClick={() => {
                    void (async () => {
                      const items = Object.entries(orderQty).map(([menuItemId, qty]) => ({ menuItemId, qty }));
                      const propId = session.propertyId || property.id;
                      setOrdering(true);
                      try {
                        const res = await placeDiningOrderRemote({
                          propertyId: propId,
                          roomNumber: orderRoom.trim() || roomLabel || undefined,
                          items,
                        });
                        setOrderQty({});
                        trackContentAction("booking_intent", propId, { contentId: res.orderId });
                        if (res.checkoutUrl) {
                          window.location.assign(res.checkoutUrl);
                        } else {
                          toast.success("Order sent to the kitchen — pay at the desk");
                          setSheet(null);
                        }
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Couldn't place the order");
                      } finally {
                        setOrdering(false);
                      }
                    })();
                  }}
                >
                  {ordering ? "Ordering…" : "Order & pay"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Sheet>

      <Sheet open={sheet === "safety"} onClose={() => setSheet(null)} title={t("help")}>
        <p className="text-sm font-bold text-ink">
          {property.name ? `${property.name} Front Desk & Duty Manager` : "Front Desk & Duty Manager"}
        </p>
        <p className="mt-2 text-xs text-mute leading-relaxed">
          {property.address || "Contact staff at front desk for emergency procedures"}
        </p>
        {property.phone && (
          <a className="mt-4 block font-bold text-brand text-sm" href={`tel:${property.phone}`}>
            {property.phone}
          </a>
        )}
        <div className="mt-2 space-y-1 text-xs font-bold text-mute">
          <a className="block" href="tel:000">
            Emergency (Australia): 000
          </a>
          <a className="block" href="tel:112">
            Emergency (India): 112
          </a>
          <a className="block" href="tel:999">
            Police (UAE): 999 · Ambulance: 998 · Fire: 997
          </a>
          <a className="block" href="tel:999">
            Emergency (UK): 999
          </a>
          <a className="block" href="tel:911">
            Emergency (US &amp; Canada): 911
          </a>
          <a className="block" href="tel:112">
            Emergency (EU): 112
          </a>
        </div>
      </Sheet>

      <Sheet open={sheet === "ask"} onClose={() => setSheet(null)} title={answer?.title || "Ask AirPal"}>
        <p className="text-sm font-medium text-ink leading-relaxed">{answer?.body}</p>
      </Sheet>
    </div>
  );
}
