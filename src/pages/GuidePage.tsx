import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Share2 } from "lucide-react";
import { TourCard } from "@/components/guide/TourCard";
import { PlaceCard } from "@/components/discovery/PlaceCard";
import { activePlaces, placesInCity, toursForPrecinct, withWalk } from "@/lib/catalog";
import { fetchTours } from "@/lib/tours-store";
import { shareCuratedGuide } from "@/lib/share";
import type { WalkingTour } from "@shared/tours";
import { EmptyState } from "@/components/ui/EmptyState";
import { TourCardSkeletonGrid, PlaceCardSkeletonGrid } from "@/components/ui/skeletons";
import { useLocale } from "@/contexts/LocaleContext";
import { useListings } from "@/contexts/ListingsContext";
import { useLocalNow } from "@/hooks/useLocalNow";
import { useOnDataReload } from "@/hooks/useDataReload";

export function GuidePage() {
  const [, nav] = useLocation();
  const { t } = useLocale();
  const { here, city } = useLocalNow();
  const { version, remoteLoaded } = useListings();
  const [tours, setTours] = useState<WalkingTour[]>(() => toursForPrecinct(city));
  const [toursLoaded, setToursLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    void fetchTours()
      .then((rows) => {
        if (alive) setTours(toursForPrecinct(city, rows));
      })
      .finally(() => {
        if (alive) setToursLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [city]);

  useOnDataReload(async () => {
    const rows = await fetchTours();
    setTours(toursForPrecinct(city, rows));
  });

  const sights = useMemo(
    () =>
      placesInCity(
        activePlaces().filter((p) => p.category === "things"),
        city,
      )
        .map((p) => withWalk(p, here))
        .sort((a, b) => a.meters - b.meters),
    [here, city, version],
  );

  const handleShareGuide = () => {
    void shareCuratedGuide(city);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 md:px-6">
      <header className="flex items-start justify-between gap-4 py-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gold">{t("guide")}</p>
          <h1 className="font-display mt-1 text-3xl font-semibold">{t("walks")}</h1>
          <p className="mt-1 text-xs text-mute">
            Curated walks &amp; sights in <span className="font-medium text-ink">{city || "Sydney"}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleShareGuide}
          className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper hover:ring-brand/40 transition active:scale-95 cursor-pointer shadow-xs shrink-0"
          title={`Share ${city || "local"} curated guide`}
          aria-label={`Share ${city || "local"} curated guide`}
        >
          <Share2 size={13} className="text-gold" />
          <span>{t("share.guide") || "Share Guide"}</span>
        </button>
      </header>
      {!toursLoaded && tours.length === 0 ? (
        <TourCardSkeletonGrid count={2} className="grid gap-3 md:grid-cols-2" />
      ) : tours.length === 0 ? (
        <EmptyState
          title="No guided walks here yet"
          body="When a host publishes a walk, it shows up here. Explore places around you in the meantime."
          action={() => nav("/")}
          actionLabel={t("explore")}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {tours.map((tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
      )}
      <h2 className="font-display mt-10 mb-3 text-xl font-semibold">{t("see")}</h2>
      {!remoteLoaded && sights.length === 0 ? (
        <PlaceCardSkeletonGrid count={6} className="grid-cols-2 md:grid-cols-3" />
      ) : sights.length === 0 ? (
        <EmptyState
          title="No sights listed yet"
          body="Scan a street marker or open Explore when venues are published for this city."
          action={() => nav("/scan")}
          actionLabel={t("scan")}
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
            <Share2 size={15} className="text-gold shrink-0" />
            <h3 className="font-display text-base font-semibold text-ink">
              Exploring {city || "Sydney"} with travel companions?
            </h3>
          </div>
          <p className="mt-1 text-xs text-mute leading-relaxed">
            Share this curated precinct guide featuring guided walks, local sights, and hidden gems.
          </p>
        </div>
        <button
          type="button"
          onClick={handleShareGuide}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-ink/90 active:scale-95 transition cursor-pointer"
        >
          <Share2 size={13} />
          <span>{t("share.guide") || "Share Guide"}</span>
        </button>
      </div>
    </div>
  );
}
