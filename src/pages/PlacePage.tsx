import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, Plus, Share2 } from "lucide-react";
import { getPlace, withWalk } from "@/lib/catalog";
import { getListedPlaceById } from "@/lib/listings";
import { shareContent } from "@/lib/share";
import { handleOfPlace } from "@/lib/bio-handle";
import { bioPath } from "@shared/bio";
import { mapsWalkUrl, mapsPlaceUrl, mapsPlaceIdUrl } from "@/lib/maps";
import { openMap } from "@/lib/analytics";
import { Button } from "@/components/ui/Button";
import { StickyAction } from "@/components/design-system/companions";
import { AddToTripSheet } from "@/components/plan/AddToTripSheet";
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
import { TradingHoursScheduleView } from "@/components/discovery/TradingHoursScheduleView";
import { NotFoundPage } from "./NotFoundPage";

export function PlacePage() {
  const [, params] = useRoute("/p/:id");
  const [, nav] = useLocation();
  const { property, marker } = useStay();
  const { remoteLoaded } = useListings();
  const { now, timeZone, here } = useLocalNow();
  const { t } = useLocale();
  const [tripOpen, setTripOpen] = useState(false);
  const place = getPlace(params?.id || "") || getListedPlaceById(params?.id || "");
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
    <div className="mx-auto max-w-lg pb-48">
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
                nav("/now");
              }
            }}
            aria-label="Go back"
            className="grid h-11 w-11 place-items-center rounded-full bg-paper/85 backdrop-blur-md text-ink shadow-md hover:bg-paper transition ring-1 ring-line/50"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            onClick={onShare}
            aria-label="Share place"
            className="grid h-11 w-11 place-items-center rounded-full bg-paper/85 backdrop-blur-md text-ink shadow-md hover:bg-paper transition ring-1 ring-line/50"
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
        {place.description && place.description.trim() !== (place.shortWhy || "").trim() && (
          <div className="mt-4 rounded-2xl bg-paper p-4 ring-1 ring-line/60">
            <h2 className="text-xs font-bold uppercase tracking-wider text-mute mb-1.5">About this venue</h2>
            <p className="text-[14px] leading-relaxed text-ink/90 whitespace-pre-line">{place.description}</p>
          </div>
        )}
        {place.deal && (
          <div className="mt-4 rounded-2xl bg-paper p-4 ring-1 ring-line/60" aria-label="Place deal">
            <p className="text-[13px] font-bold">{place.deal.badge}</p>
            {place.deal.detail && <p className="mt-1 text-[14px] text-mute">{place.deal.detail}</p>}
            {(place.deal.claimHint || place.deal.expiry) && (
              <p className="mt-1 text-[12px] text-mute">
                {[place.deal.claimHint, place.deal.expiry ? `Ends ${place.deal.expiry}` : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/plan/new?title=${encodeURIComponent(place.name)}&dest=${encodeURIComponent(place.name)}`}
                className="inline-flex min-h-[44px] items-center rounded-full bg-neutral-900 px-5 py-2 text-[14px] font-semibold text-white transition active:scale-95"
              >
                Plan it here
              </Link>
              <Link
                href="/now"
                className="inline-flex min-h-[44px] items-center rounded-full bg-card px-5 py-2 text-[14px] font-semibold ring-1 ring-line transition active:scale-95"
              >
                What now?
              </Link>
            </div>
          </div>
        )}
        {place.hours && (
          <TradingHoursScheduleView hours={place.hours} placeName={place.name} variant="inline" className="mt-4" />
        )}
        {handle && (
          <Button variant="ghost" className="mt-4 w-full" onClick={() => nav(bioPath(handle))}>
            Open @{handle}
          </Button>
        )}
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
        <button
          type="button"
          onClick={() => setTripOpen(true)}
          className="mt-3 hidden h-12 w-full touch-manipulation items-center justify-center gap-1.5 rounded-full bg-brand/10 text-[15px] font-semibold text-accent transition hover:bg-brand/15 active:scale-[0.99] lg:flex"
        >
          <Plus size={17} />
          <span>Add to Trip</span>
        </button>
        <button
          type="button"
          className="mt-4 inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center text-[14px] font-semibold text-accent"
          onClick={() => nav("/now")}
        >
          What now? →
        </button>
      </div>

      {/* One primary action, thumb-reachable: Walk there */}
      <StickyAction
        primary={
          <button
            type="button"
            onClick={() => openMap(mapsWalkUrl(from, place.geo), { contentId: place.id, destination: "walk" })}
            className="flex h-12 w-full cursor-pointer touch-manipulation items-center justify-center rounded-full bg-brand text-[15px] font-semibold text-white transition active:scale-[0.99]"
          >
            Walk there
          </button>
        }
        secondary={
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setTripOpen(true)}
              className="inline-flex h-12 cursor-pointer touch-manipulation items-center gap-1.5 rounded-full bg-brand/10 px-4 text-[14px] font-semibold text-accent transition hover:bg-brand/15 active:scale-95"
            >
              <Plus size={16} />
              <span>Add to Trip</span>
            </button>
            <button
              type="button"
              onClick={() => openMap(maps, { contentId: place.id, destination: "maps" })}
              aria-label="Open in Maps"
              className="grid h-12 w-12 shrink-0 cursor-pointer touch-manipulation place-items-center rounded-full bg-card text-[13px] font-semibold text-mute ring-1 ring-line transition hover:text-ink active:scale-95"
            >
              Maps
            </button>
          </div>
        }
      />
      <AddToTripSheet
        open={tripOpen}
        onClose={() => setTripOpen(false)}
        stop={{ name: place.name, placeId: place.id, notes: place.shortWhy }}
      />
    </div>
  );
}
