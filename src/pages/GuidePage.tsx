import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Share2 } from "lucide-react";
import { TourCard } from "@/components/guide/TourCard";
import { PlaceCard } from "@/components/discovery/PlaceCard";
import { activePlaces, placesAround, placesInCity, toursForPrecinct, withWalk } from "@/lib/catalog";
import { ROCKS_BROWSE } from "@/lib/catalog-stay";
import { fetchTours } from "@/lib/tours-store";
import { shareCuratedGuide } from "@/lib/share";
import type { WalkingTour } from "@shared/tours";
import { EmptyState } from "@/components/ui/EmptyState";
import { TourCardSkeletonGrid, PlaceCardSkeletonGrid } from "@/components/ui/skeletons";
import { useLocale } from "@/contexts/LocaleContext";
import { useListings } from "@/contexts/ListingsContext";
import { useLocalNow } from "@/hooks/useLocalNow";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { useOnDataReload } from "@/hooks/useDataReload";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

function ShareGuideButton({
  city,
  label,
  variant,
  onShare,
}: {
  city: string;
  label: string;
  variant: "ghost" | "primary";
  onShare: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onShare}
      title={`Share ${city || "local"} curated guide`}
      aria-label={`Share ${city || "local"} curated guide`}
      className={cn(
        "inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-2 rounded-full text-xs font-semibold shadow-xs transition active:scale-95",
        variant === "ghost"
          ? "bg-card px-4 text-ink ring-1 ring-line hover:bg-paper hover:ring-brand/40"
          : "bg-brand px-5 text-white hover:bg-brand-ink",
      )}
    >
      <Share2 size={13} className={variant === "ghost" ? "text-accent" : undefined} aria-hidden />
      <span>{label}</span>
    </button>
  );
}

export function GuidePage() {
  const [, nav] = useLocation();
  const { t } = useLocale();
  const { here, city, usingGps, chooseLocation } = useLocalNow();
  const aroundYou = usingGps;
  const effectiveCity = city && city !== "Choose a city" && city !== "Current location" ? city : "Sydney";
  const { version, remoteLoaded } = useListings();
  const [tours, setTours] = useState<WalkingTour[]>(() => toursForPrecinct(effectiveCity));
  const [toursLoaded, setToursLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    void fetchTours()
      .then((rows) => {
        if (alive) setTours(toursForPrecinct(effectiveCity, rows));
      })
      .finally(() => {
        if (alive) setToursLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [effectiveCity]);

  useOnDataReload(async () => {
    const rows = await fetchTours();
    setTours(toursForPrecinct(effectiveCity, rows));
  });

  // Skeletons only for genuinely slow loads — fast local data renders
  // content directly with no flash-swap layout shift.
  const toursLoading = !toursLoaded && tours.length === 0;
  const showToursSkeleton = useDelayedLoading(toursLoading);

  const sights = useMemo(() => {
    const pool = activePlaces().filter((p) => p.category === "things");
    const scoped = aroundYou ? placesAround(pool, here) : placesInCity(pool, effectiveCity);
    return scoped.map((p) => withWalk(p, here)).sort((a, b) => a.meters - b.meters);
  }, [here, effectiveCity, aroundYou, version]);

  const sightsLoading = !remoteLoaded && sights.length === 0;
  const showSightsSkeleton = useDelayedLoading(sightsLoading);

  const handleShareGuide = () => {
    void triggerHaptic("medium");
    void shareCuratedGuide(effectiveCity);
  };
  const shareLabel = t("share.guide") || "Share Guide";

  return (
    <div className="mx-auto max-w-5xl px-4 pb-[max(7rem,calc(env(safe-area-inset-bottom,0px)+6rem))] md:px-6">
      <header className="flex items-start justify-between gap-4 py-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">{t("guide")}</p>
          <h1 className="font-display mt-1 text-3xl font-semibold">{t("walks")}</h1>
          <p className="mt-1 text-xs text-mute">
            Curated walks &amp; sights in{" "}
            <span className="font-medium text-ink">{effectiveCity}</span>
          </p>
        </div>
        <ShareGuideButton city={effectiveCity} label={shareLabel} variant="ghost" onShare={handleShareGuide} />
      </header>
      {showToursSkeleton ? (
        <TourCardSkeletonGrid count={2} className="grid gap-3 md:grid-cols-2" />
      ) : toursLoading ? (
        <div className="min-h-[320px]" aria-hidden="true" />
      ) : tours.length === 0 ? (
        <EmptyState
          title="No guided walks here yet"
          body={
            aroundYou
              ? "No walks published near you yet. The Rocks has walks you can browse."
              : "When a host publishes a walk, it shows up here. Explore places around you in the meantime."
          }
          action={aroundYou ? () => chooseLocation(ROCKS_BROWSE) : () => nav("/")}
          actionLabel={aroundYou ? "See The Rocks" : t("explore")}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {tours.map((tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
      )}
      <h2 className="font-display mt-10 mb-3 text-xl font-semibold">{t("see")}</h2>
      {showSightsSkeleton ? (
        <PlaceCardSkeletonGrid count={6} className="grid-cols-2 md:grid-cols-3" />
      ) : sightsLoading ? (
        <div className="min-h-[480px]" aria-hidden="true" />
      ) : sights.length === 0 ? (
        <EmptyState
          title="No sights listed yet"
          body={
            aroundYou
              ? "Nothing listed near you yet. Check The Rocks, or add your place."
              : "Scan a street marker or open Explore when venues are published for this city."
          }
          action={aroundYou ? () => chooseLocation(ROCKS_BROWSE) : () => nav("/scan")}
          actionLabel={aroundYou ? "See The Rocks" : t("scan")}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {sights.slice(0, 6).map((p) => (
            <PlaceCard key={p.id} place={p} walk={p.walk} />
          ))}
        </div>
      )}

      <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl bg-paper p-5 ring-1 ring-line">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Share2 size={15} className="text-accent shrink-0" aria-hidden />
            <h3 className="font-display text-base font-semibold text-ink">
              Exploring {city || "Sydney"} with travel companions?
            </h3>
          </div>
          <p className="mt-1 text-xs text-mute leading-relaxed">
            Share this curated precinct guide featuring guided walks, local sights, and hidden gems.
          </p>
        </div>
        <ShareGuideButton city={city} label={shareLabel} variant="primary" onShare={handleShareGuide} />
      </div>
    </div>
  );
}
