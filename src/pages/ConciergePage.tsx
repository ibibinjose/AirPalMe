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
import { askAirPalRemote, getPropertyWifiRemote, liveBackendEnabled } from "@/lib/functions";
import { fetchPropertyMenu } from "@/lib/properties";
import type { MenuItem } from "@shared/airpal-data";
import { toast } from "sonner";
import { useLocale } from "@/contexts/LocaleContext";
import { useLocalNow } from "@/hooks/useLocalNow";
import { demoModeActive, track, trackContentAction, trackFirstValue } from "@/lib/analytics";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { triggerHaptic } from "@/lib/native";
import { StayCompendium } from "@/components/stay/StayCompendium";
import { AirPalAiReceptionist } from "@/components/stay/AirPalAiReceptionist";
import { WifiSheet } from "@/components/concierge/WifiSheet";
import { StaffRequestSheet } from "@/components/concierge/StaffRequestSheet";
import { DiningSheet } from "@/components/concierge/DiningSheet";

export function ConciergePage() {
  const { session, roomLabel, property, loadingProperty, marker } = useStay();
  const { openAnswers, openContact, openChecklist } = useStayUi();
  const { version: catalogVersion } = useListings();
  const { t } = useLocale();
  const { now, timeZone, city } = useLocalNow();
  const { calendarEvents, remoteNearby } = useEvents();
  const [, nav] = useLocation();
  const bookedId = new URLSearchParams(useSearch()).get("booked") || "";

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
  const hasStay =
    session.kind === "stay" || session.kind === "campus" || Boolean(roomLabel) || Boolean(session.propertyId);

  useEffect(() => {
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

  if (!hasStay && session.kind !== "marker") {
    return (
      <div className="mx-auto max-w-lg px-4 pb-28">
        <PaymentCanceledNotice />
        <div className="relative mt-2 overflow-hidden rounded-[28px] ring-1 ring-line bg-ink shadow-xs">
          {property.heroImage ? (
            <img src={property.heroImage} alt="" className="h-72 w-full object-cover" />
          ) : (
            <div className="h-72 w-full bg-brand" aria-hidden="true" />
          )}
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
    <div className="mx-auto max-w-5xl px-4 pb-[max(5rem,calc(env(safe-area-inset-bottom,0px)+4rem))] md:px-6">
      <PaymentCanceledNotice />
      {bookedId ? <TicketPass bookingId={bookedId} /> : null}
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        <div className="lg:col-span-5 space-y-4">
          <div className="relative mt-2 overflow-hidden rounded-[28px] ring-1 ring-line bg-ink shadow-xs">
            {property.heroImage ? (
              <img src={property.heroImage} alt="" className="h-48 w-full object-cover" />
            ) : (
              <div className="h-48 w-full bg-brand" aria-hidden="true" />
            )}
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

          <div className="relative overflow-hidden rounded-3xl ring-1 ring-white/10 bg-brand p-4 text-white shadow-md flex items-center justify-between gap-3">
            <div className="relative flex items-center gap-3 min-w-0">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 shadow-inner backdrop-blur-md">
                <HeartHandshake size={22} className="text-amber-300" />
              </span>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-xs mb-1">
                  <Sparkles size={11} className="text-slate-950" />
                  What now?
                </span>
                <p className="text-[13px] font-extrabold text-white leading-snug truncate">
                  Exploring {property.city || "Sydney"}?
                </p>
                <p className="text-[11px] text-white/80 font-medium truncate">
                  One suggestion for right now.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="relative inline-flex min-h-[44px] shrink-0 touch-manipulation items-center justify-center gap-1.5 rounded-full bg-white px-4 text-sm font-extrabold text-brand shadow-sm transition hover:bg-amber-300 hover:text-slate-950 active:scale-95"
              onClick={() => {
                void triggerHaptic("light");
                nav("/now");
              }}
            >
              <span>What now?</span>
              <ArrowRight size={14} />
            </button>
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

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gold mb-2">Guest Actions</p>
            <div className="grid grid-cols-2 gap-2.5">
              {tiles.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    void triggerHaptic("medium");
                    t.run();
                  }}
                  className="apple-liquid-glass-card hover-lift flex min-h-[48px] touch-manipulation items-center gap-3 rounded-2xl p-3.5 shadow-xs transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                    <t.icon size={17} />
                  </span>
                  <span className="truncate text-sm font-bold text-ink">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gold mb-2 px-1">Your stay</p>
            <StayCompendium />
          </div>
        </div>

        <div className="mt-6 lg:mt-0 lg:col-span-7 space-y-5">
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
              className="h-10 w-full bg-transparent text-[16px] outline-none text-ink placeholder:text-mute font-medium"
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

      <AirPalAiReceptionist />

      <WifiSheet open={sheet === "wifi"} onClose={() => setSheet(null)} wifi={wifi} />
      <StaffRequestSheet
        open={sheet === "staff"}
        onClose={() => setSheet(null)}
        propertyId={property.id}
        propertyName={property.name}
        roomLabel={roomLabel || ""}
      />
      <DiningSheet
        open={sheet === "dining"}
        onClose={() => setSheet(null)}
        property={property}
        propertyId={session.propertyId || property.id}
        menu={menu}
        roomLabel={roomLabel || ""}
      />

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
