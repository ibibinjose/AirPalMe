import { Link } from "wouter";
import type { NearbyPlace } from "@shared/nearby";
import { Photo } from "@/components/ui/Photo";
import { hrefForPlace } from "@/lib/bio-handle";
import { isOpenAt } from "@/lib/hours";
import { freshnessOf } from "@shared/freshness";
import { useOptionalLocalNow } from "@/contexts/LocalNowContext";
import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/cn";

export function PlaceCard({ place, walk, large = false }: { place: NearbyPlace; walk?: string; large?: boolean }) {
  const { t } = useLocale();
  const local = useOptionalLocalNow();
  // Harbour fallback is Sydney stock only — other cities render a clean ink
  // card rather than the wrong city's photo.
  const precinct = (place.precinctId || "").toLowerCase();
  const img =
    place.heroImage ||
    place.photos?.[0] ||
    (precinct === "the-rocks" || precinct === "local" || !precinct ? "/media/harbour.jpg" : undefined);
  const hoursFresh = freshnessOf(place.hoursVerifiedAt, "hours");
  const open = !hoursFresh.hideOpenNow && local ? isOpenAt(place.hours, local.now, local.timeZone) : null;
  const onPhoto = Boolean(img);
  return (
    <Link
      href={hrefForPlace(place)}
      className={cn(
        "group relative block overflow-hidden rounded-3xl text-left ring-1 ring-line",
        large ? "min-h-[280px]" : "min-h-[220px]",
        onPhoto ? "bg-paper" : "bg-card",
      )}
    >
      {img && (
        <Photo
          src={img}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      )}
      {onPhoto && <div className="hero-scrim absolute inset-0" />}
      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
        {place.deal && (
          <span className="rounded-full bg-gold px-2.5 py-1 text-[11px] font-semibold text-white">
            {place.deal.badge}
          </span>
        )}
        {open != null && (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              open
                ? "bg-emerald-500/90 text-white"
                : onPhoto
                  ? "bg-ink/70 text-white/85"
                  : "bg-paper text-mute ring-1 ring-line",
            )}
          >
            {open ? t("openNow") : t("closedNow")}
          </span>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3.5">
        <p
          className={cn(
            "font-display line-clamp-2 text-[17px] font-semibold leading-tight",
            onPhoto ? "text-white" : "text-ink",
          )}
        >
          {place.name}
        </p>
        <p className={cn("mt-0.5 truncate text-[12px]", onPhoto ? "text-white/75" : "text-mute")}>
          {[walk, place.priceLevel, place.rating ? `${place.rating}` : null].filter(Boolean).join(" · ")}
        </p>
      </div>
    </Link>
  );
}
