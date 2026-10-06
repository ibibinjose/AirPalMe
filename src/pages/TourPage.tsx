import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Share2 } from "lucide-react";
import { getTour } from "@/lib/catalog";
import { fetchTours } from "@/lib/tours-store";
import { shareTour } from "@/lib/share";
import type { WalkingTour } from "@shared/tours";
import { mapsUrl } from "@/lib/geo";
import { Button } from "@/components/ui/Button";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { NotFoundPage } from "./NotFoundPage";

export function TourPage() {
  const [, params] = useRoute("/tour/:id");
  const id = params?.id || "";
  const { trackFeatureEngagement } = useAnalytics();
  const [tour, setTour] = useState<WalkingTour | undefined>(() => getTour(id));
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    let alive = true;
    void fetchTours().then((rows) => {
      if (!alive) return;
      setTour(getTour(id, rows));
      setChecked(true);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  if (!tour) {
    if (!checked) return <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-mute">Loading…</div>;
    return <NotFoundPage />;
  }
  const [, nav] = useLocation();
  const [step, setStep] = useState(0);
  const stop = tour.stops[step];
  return (
    <div className="mx-auto max-w-lg px-4 pb-28">
      <div className="flex items-center gap-3 pt-4">
        <button
          type="button"
          onClick={() => nav("/guide")}
          aria-label="Back to all walks"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full ring-1 ring-line bg-card transition hover:ring-brand/40 active:scale-95"
        >
          <ArrowLeft size={16} />
        </button>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
          {step + 1} / {tour.stops.length} · {tour.duration}
        </p>
        <button
          type="button"
          onClick={() => {
            void trackFeatureEngagement("guide", "share_tour", { tourId: tour.id, title: tour.title });
            void shareTour({ id: tour.id, title: tour.title, duration: tour.duration });
          }}
          className="ml-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-medium text-ink ring-1 ring-line hover:bg-paper hover:ring-brand/40 transition active:scale-95 cursor-pointer shadow-xs"
          title={`Share "${tour.title}" walk`}
          aria-label={`Share "${tour.title}" walk`}
        >
          <Share2 size={12} className="text-accent" />
          <span>Share</span>
        </button>
      </div>
      <h1 className="font-display mt-2 text-3xl font-semibold">{stop.name}</h1>
      <p className="mt-1 text-sm text-mute">{stop.minutesFromPrev}</p>
      <p className="mt-4 text-[15px] leading-relaxed text-ink/90">{stop.story}</p>
      <div className="mt-6 flex gap-3">
        <Button
          variant="ghost"
          className="flex-1"
          disabled={step === 0}
          onClick={() => {
            setStep((s) => {
              const next = s - 1;
              void trackFeatureEngagement("guide", "tour_step_change", { tourId: tour.id, step: next });
              return next;
            });
          }}
        >
          Back
        </Button>
        {step < tour.stops.length - 1 ? (
          <Button
            className="flex-1"
            onClick={() => {
              setStep((s) => {
                const next = s + 1;
                void trackFeatureEngagement("guide", "tour_step_change", { tourId: tour.id, step: next });
                return next;
              });
            }}
          >
            Next
          </Button>
        ) : (
          <Button
            className="flex-1"
            onClick={() => {
              setStep(0);
              void trackFeatureEngagement("guide", "tour_restart", { tourId: tour.id });
            }}
          >
            Again
          </Button>
        )}
      </div>
      <a
        className="mt-4 flex min-h-[48px] items-center justify-center rounded-full bg-card text-sm font-semibold text-accent ring-1 ring-line transition hover:bg-paper active:scale-[0.99]"
        href={mapsUrl({ lat: stop.lat, lng: stop.lng }, stop.name)}
        target="_blank"
        rel="noreferrer"
      >
        Open this stop in Maps
      </a>
    </div>
  );
}
