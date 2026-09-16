import { useLocation } from "wouter";
import type { WalkingTour } from "@shared/tours";
import { Photo } from "@/components/ui/Photo";

const TOUR_IMAGES: Record<string, string> = {
  "rocks-harbour": "/media/harbour.jpg",
  "hobart-treasures": "/media/walk.jpg",
};

const DEFAULT_TOUR_IMAGE = "/media/laneway.jpg";

export function TourCard({ tour }: { tour: WalkingTour }) {
  const [, nav] = useLocation();
  return (
    <button
      onClick={() => nav(`/tour/${tour.id}`)}
      className="relative min-h-[240px] w-full overflow-hidden rounded-3xl text-left"
    >
      <Photo src={TOUR_IMAGES[tour.id] || DEFAULT_TOUR_IMAGE} className="absolute inset-0 h-full w-full object-cover" />
      <div className="hero-scrim absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">{tour.duration} · {tour.distance}</p>
        <p className="font-display mt-1 text-2xl font-semibold text-white">{tour.title}</p>
      </div>
    </button>
  );
}
