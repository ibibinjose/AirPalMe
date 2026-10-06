import { useEffect, useMemo, useState } from "react";
import { Car, Clock, Luggage, MapPin, Navigation } from "lucide-react";
import { useStay } from "@/contexts/StayContext";
import { useStayUi } from "@/contexts/StayUiContext";
import { nearbyParking } from "@/lib/catalog";
import { stayOrigin } from "@/lib/highlights";
import { mapsDriveUrl, mapsPlaceUrl, mapsWalkUrl } from "@/lib/maps";
import { arrivalPhase, countdownLabel, defaultCheckInAt, formatWhen, type ArrivalPhase } from "@/lib/arrival";
import { cn } from "@/lib/cn";
import { trackMapClick } from "@/lib/analytics";
import { useLocale } from "@/contexts/LocaleContext";

const PARK_COPY: Record<ArrivalPhase, string> = {
  later: "parkLater",
  today: "parkSoon",
  soon: "parkSoon",
  early: "parkEarly",
  open: "parkIn",
  in: "parkIn",
};

export function ArrivalGuide() {
  const { property, session, roomLabel, marker, setSession } = useStay();
  const { openContact, openAnswers } = useStayUi();
  const { t } = useLocale();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (session.kind !== "stay" && session.kind !== "campus") return;
    if (session.checkInAt) return;
    const at = defaultCheckInAt(property.checkIn, new Date(), Boolean(roomLabel));
    setSession({ ...session, checkInAt: at.toISOString() });
  }, [property.checkIn, roomLabel, session, setSession]);

  const checkInAt = useMemo(() => {
    if (session.checkInAt) {
      const parsed = new Date(session.checkInAt);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return defaultCheckInAt(property.checkIn, now, Boolean(roomLabel));
  }, [now, property.checkIn, roomLabel, session.checkInAt]);

  const phase = arrivalPhase(now, checkInAt, Boolean(roomLabel));
  const copy = {
    kicker: t(`arrival.${phase}.kicker`),
    title: t(`arrival.${phase}.title`),
    checkin: t(`arrival.${phase}.body`),
  };
  const delta = checkInAt.getTime() - now.getTime();
  const origin = stayOrigin(property, marker?.geo);
  const parking = nearbyParking(origin)[0];
  const facilities = property.facilities || [];
  const bags = facilities.find((f) => f && f.name && /luggage/i.test(f.name));

  const eta = delta > 0 ? countdownLabel(delta) : phase === "early" ? `Opens in ${countdownLabel(-delta)}` : null;

  return (
    <section className="mt-5 overflow-hidden rounded-[28px] bg-card ring-1 ring-line">
      <div className="px-4 pt-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">{copy.kicker}</p>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">{copy.title}</h2>
          {eta && phase !== "in" && (
            <span className="flex items-center gap-1 text-sm text-mute">
              <Clock size={14} />
              {eta}
            </span>
          )}
        </div>
        {roomLabel && phase === "in" && <p className="mt-1 text-sm text-mute">Room {roomLabel}</p>}
      </div>

      <div className="space-y-2 p-3">
        <article className="rounded-2xl bg-paper px-4 py-3 ring-1 ring-line">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">{t("checkIn")}</p>
          <p className="mt-1 font-display text-lg">{formatWhen(checkInAt)}</p>
          <p className="mt-1 text-[14px] leading-snug text-ink/90">{copy.checkin}</p>
          <p className="mt-2 flex items-start gap-1.5 text-[13px] text-mute">
            <MapPin size={14} className="mt-0.5 shrink-0" />
            {property.address}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a
              href={mapsDriveUrl(origin, property.name)}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackMapClick({ propertyId: property.id, source: "arrival" })}
              className={cn(
                "flex h-9 items-center justify-center rounded-full text-[13px] font-semibold",
                phase === "in" || phase === "open" ? "bg-paper ring-1 ring-line" : "bg-brand text-white",
              )}
            >
              {t("drive")}
            </a>
            <a
              href={mapsPlaceUrl(origin, property.name)}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackMapClick({ propertyId: property.id, source: "arrival" })}
              className="flex h-9 items-center justify-center rounded-full bg-paper text-[13px] font-semibold ring-1 ring-line"
            >
              {t("maps")}
            </a>
            {(phase === "early" || phase === "soon") && (
              <button
                type="button"
                onClick={() => openContact("Early check-in — is the room ready?")}
                className="col-span-2 flex h-9 items-center justify-center rounded-full bg-paper text-[13px] font-semibold ring-1 ring-line"
              >
                {t("askDesk")}
              </button>
            )}
          </div>
        </article>

        {parking && (
          <article className="rounded-2xl bg-paper px-4 py-3 ring-1 ring-line">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
              <Car size={12} /> {t("parking")}
            </p>
            <p className="mt-1 font-medium">{parking.name}</p>
            <p className="mt-0.5 text-[13px] text-mute">
              {parking.walk} walk · {parking.hours}
              {parking.shortWhy ? ` · ${parking.shortWhy}` : ""}
            </p>
            <p className="mt-2 text-[13px] leading-snug">{t(PARK_COPY[phase])}</p>
            <a
              href={mapsWalkUrl(origin, parking.geo)}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackMapClick({ propertyId: property.id, placeId: parking.id, source: "arrival" })}
              className="mt-3 flex h-9 items-center justify-center gap-1 rounded-full bg-neutral-900 text-[13px] font-semibold text-white"
            >
              <Navigation size={12} />
              {t("walkToGarage")}
            </a>
          </article>
        )}

        {bags && phase !== "in" && (
          <article className="flex gap-3 rounded-2xl bg-paper px-4 py-3 ring-1 ring-line">
            <Luggage size={16} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">{t("bags")}</p>
              <p className="mt-1 text-[14px] leading-snug">{bags.details || `${bags.name} · ${bags.hours}`}</p>
            </div>
          </article>
        )}
      </div>

      {phase === "open" && (
        <button type="button" onClick={openAnswers} className="w-full border-t border-line py-3 text-sm text-accent">
          {t("wifiAndQr")}
        </button>
      )}
    </section>
  );
}
