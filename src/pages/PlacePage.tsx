import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Share2 } from "lucide-react";
import { getPlace, withWalk } from "@/lib/catalog";
import { shareContent } from "@/lib/share";
import { handleOfPlace } from "@/lib/bio-handle";
import { bioPath } from "@shared/bio";
import { mapsWalkUrl, mapsPlaceUrl, mapsPlaceIdUrl } from "@/lib/maps";
import { openMap } from "@/lib/analytics";
import { Button } from "@/components/ui/Button";
import { HereCheckIn } from "@/components/circle/HereCheckIn";
import { BioHandleButton } from "@/components/bio/BioHandleButton";
import { Photo } from "@/components/ui/Photo";
import { useStay } from "@/contexts/StayContext";
import { useListings } from "@/contexts/ListingsContext";
import { stayOrigin } from "@/lib/highlights";
import { isOpenAt } from "@/lib/hours";
import { freshnessOf } from "@shared/freshness";
import { useLocalNow } from "@/hooks/useLocalNow";
import { useLocale } from "@/contexts/LocaleContext";
import { PageLoading } from "@/components/ui/PageLoading";
import { NotFoundPage } from "./NotFoundPage";

export function PlacePage() {
  const [, params] = useRoute("/p/:id");
  const [, nav] = useLocation();
  const { property, marker } = useStay();
  const { remoteLoaded } = useListings();
  const { now, timeZone, here } = useLocalNow();
  const { t } = useLocale();
  const place = getPlace(params?.id || "");
  if (!place && !remoteLoaded) {
    return <PageLoading />;
  }
  if (!place) return <NotFoundPage />;
  const from = stayOrigin(property, marker?.geo) || here;
  const walked = withWalk(place, from);
  const hoursFresh = freshnessOf(place.hoursVerifiedAt, "hours");
  const open = hoursFresh.hideOpenNow ? null : isOpenAt(place.hours, now, timeZone);
  const img = place.heroImage || place.photos?.[0] || "/media/harbour.jpg";
  const handle = handleOfPlace(place);
  const maps = place.mapsPlaceId ? mapsPlaceIdUrl(place.mapsPlaceId) : mapsPlaceUrl(place.geo, place.name);

  const onShare = async () => {
    await shareContent({
      title: place.name,
      text: place.shortWhy,
      url: window.location.href,
      dialogTitle: `Share ${place.name}`,
      copiedMessage: "Place link copied to clipboard",
    });
  };

  return (
    <div className="mx-auto max-w-lg pb-10">
      <div className="relative">
        <Photo src={img} className="h-[360px] w-full object-cover" />
        <div className="hero-scrim absolute inset-0" />

        {/* Floating Top Controls */}
        <div className="absolute inset-x-4 top-4 z-20 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (document.referrer && document.referrer.includes(window.location.host)) {
                window.history.back();
              } else {
                nav("/");
              }
            }}
            aria-label="Go back"
            className="grid h-10 w-10 place-items-center rounded-full bg-paper/85 backdrop-blur-md text-ink shadow-md hover:bg-paper transition ring-1 ring-line/50"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            onClick={onShare}
            aria-label="Share place"
            className="grid h-10 w-10 place-items-center rounded-full bg-paper/85 backdrop-blur-md text-ink shadow-md hover:bg-paper transition ring-1 ring-line/50"
          >
            <Share2 size={16} />
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5 pr-14">
          {place.deal && (
            <span className="rounded-full bg-gold px-2.5 py-1 text-[11px] font-semibold text-white">
              {place.deal.badge}
            </span>
          )}
          <h1 className="font-display mt-2 text-3xl font-semibold text-white">{place.name}</h1>
          <p className="text-sm text-white/75">
            {[
              walked.walk,
              place.priceLevel,
              place.hours,
              open == null
                ? hoursFresh.hideOpenNow
                  ? t("hoursUnverified")
                  : null
                : open
                  ? t("openNow")
                  : t("closedNow"),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <BioHandleButton handle={handle} className="absolute bottom-4 right-4 z-10" />
      </div>
      <div className="px-4 pt-5">
        <p className="text-[15px] leading-relaxed">{place.insiderTip || place.shortWhy}</p>
        {handle && (
          <Button className="mt-6 w-full" onClick={() => nav(bioPath(handle))}>
            Open @{handle}
          </Button>
        )}
        <div className={handle ? "mt-3 flex gap-3" : "mt-6 flex gap-3"}>
          <Button
            className="flex-1"
            variant={handle ? "ghost" : "primary"}
            onClick={() => openMap(mapsWalkUrl(from, place.geo), { contentId: place.id, destination: "walk" })}
          >
            Walk
          </Button>
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => openMap(maps, { contentId: place.id, destination: "maps" })}
          >
            Maps
          </Button>
        </div>
        <HereCheckIn placeName={place.name} placeId={place.id} />
        {place.bookingUrl && (
          <Button
            variant="ghost"
            className="mt-3 w-full"
            onClick={() => window.open(place.bookingUrl, "_blank", "noopener,noreferrer")}
          >
            {place.bookingLabel || "Book"}
          </Button>
        )}
        <button className="mt-4 w-full text-sm text-mute" onClick={() => nav("/")}>
          Discover
        </button>
      </div>
    </div>
  );
}
