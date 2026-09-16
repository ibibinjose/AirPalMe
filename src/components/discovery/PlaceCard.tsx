import { useLocation } from "wouter";
import type { NearbyPlace } from "@shared/nearby";
import { Photo } from "@/components/ui/Photo";
import { BioHandleButton } from "@/components/bio/BioHandleButton";
import { handleOfPlace, hrefForPlace } from "@/lib/bio-handle";
import { isOpenAt } from "@/lib/hours";
import { freshnessOf } from "@shared/freshness";
import { useOptionalLocalNow } from "@/contexts/LocalNowContext";
import { useLocale } from "@/contexts/LocaleContext";

export function PlaceCard({
  place,
  walk,
  large = false,
}: {
  place: NearbyPlace;
  walk?: string;
  large?: boolean;
}) {
  const [, nav] = useLocation();
  const { t } = useLocale();
  const local = useOptionalLocalNow();
  // Harbour fallback is Sydney stock only — other cities render a clean ink
  // card rather than the wrong city's photo.
  const precinct = (place.precinctId || "").toLowerCase();
  const img =
    place.heroImage ||
    place.photos?.[0] ||
    (precinct === "the-rocks" || precinct === "local" || !precinct ? "/media/harbour.jpg" : undefined);
  const handle = handleOfPlace(place);
  const hoursFresh = freshnessOf(place.hoursVerifiedAt, "hours");
  const open = !hoursFresh.hideOpenNow && local ? isOpenAt(place.hours, local.now, local.timeZone) : null;
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => nav(hrefForPlace(place))}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          nav(hrefForPlace(place));
        }
      }}
      className={`group relative cursor-pointer overflow-hidden rounded-3xl bg-ink text-left ${large ? "min-h-[280px]" : "min-h-[220px]"}`}
    >
      {img && (
        <Photo
          src={img}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      )}
      <div className="hero-scrim absolute inset-0" />
      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
        {place.deal && (
          <span className="rounded-full bg-gold px-2.5 py-1 text-[11px] font-semibold text-white">
            {place.deal.badge}
          </span>
        )}
        {open != null && (
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              open ? "bg-emerald-500/90 text-white" : "bg-ink/70 text-white/85"
            }`}
          >
            {open ? t("openNow") : t("closedNow")}
          </span>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3.5 pr-12">
        <p className="font-display text-[17px] font-semibold leading-tight text-white">{place.name}</p>
        <p className="mt-0.5 text-[12px] text-white/75">
          {[walk, place.priceLevel, place.rating ? `${place.rating}` : null].filter(Boolean).join(" · ")}
        </p>
      </div>
      <BioHandleButton handle={handle} className="absolute bottom-2.5 right-2.5 z-10" />
    </div>
  );
}
