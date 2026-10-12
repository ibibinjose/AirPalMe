import { useState, useMemo } from "react";
import { Link, useLocation, useParams, useSearch } from "wouter";
import { ArrowLeft, Compass, Share2 } from "lucide-react";
import { useEvents } from "@/contexts/EventsContext";
import { EventCoverGlow } from "@/components/event/EventCoverGlow";
import { EventDateCalendarBlock } from "@/components/event/EventDateCalendarBlock";
import { EventLocationCard } from "@/components/event/EventLocationCard";
import { EventHostCard } from "@/components/event/EventHostCard";
import { EventRegistrationCard } from "@/components/event/EventRegistrationCard";
import { EventShareModal } from "@/components/event/EventShareModal";
import { triggerHaptic } from "@/lib/native";
import { toast } from "sonner";

export function ExperienceDetailsPage() {
  const [, nav] = useLocation();
  const params = useParams<{ id?: string }>();
  const searchStr = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(searchStr), [searchStr]);
  const experienceId = params.id || searchParams.get("id");

  const { calendarEvents, toggleGoing } = useEvents();

  // Find the requested experience or default to the premier featured experience
  const experience = useMemo(() => {
    if (experienceId) {
      const found = calendarEvents.find((e) => e.id === experienceId);
      if (found) return found;
    }
    return calendarEvents[0] || null;
  }, [calendarEvents, experienceId]);

  const [shareOpen, setShareOpen] = useState(false);
  const [tier, setTier] = useState<"standard" | "vip" | "group">("standard");
  const [spots, setSpots] = useState(1);
  const [buying, setBuying] = useState(false);

  if (!experience) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <Compass size={40} className="mx-auto text-accent mb-3" />
        <h1 className="font-display text-2xl font-bold text-ink">Experience Not Found</h1>
        <p className="mt-1 text-sm text-mute">We could not locate this experience in our live directory.</p>
        <Link
          href="/events"
          className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 transition"
        >
          Browse All Experiences
        </Link>
      </div>
    );
  }

  const handleBookingSubmit = () => {
    void triggerHaptic("medium");
    setBuying(true);
    setTimeout(() => {
      setBuying(false);
      toggleGoing(experience.id);
      toast.success(`Pass confirmed for ${experience.title}! Added to your itinerary.`);
      nav(`/e/${experience.id}`);
    }, 600);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-32 md:px-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Link
            href="/events"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute hover:text-ink ring-1 ring-line hover:bg-paper transition"
          >
            <ArrowLeft size={14} />
            <span>All Experiences</span>
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Experience Details</span>
        </div>

        <button
          type="button"
          onClick={() => {
            void triggerHaptic("medium");
            setShareOpen(true);
          }}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition cursor-pointer"
        >
          <Share2 size={14} />
          <span>Share</span>
        </button>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Media Hero & Host Details */}
        <div className="lg:col-span-5 space-y-6">
          <EventCoverGlow src={experience.heroImage} alt={experience.title} themeColor={experience.themeColor} />

          <EventHostCard
            hostName={experience.hostName || "AirPal Curator"}
            hostHandle={experience.hostHandle || "airpal"}
            hostType={experience.hostType}
            collaboratorHandles={experience.collaboratorHandles}
          />
        </div>

        {/* Right Column: Information, Date, Location Map, and Booking */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
                {experience.categoryLabel || experience.category || "Experience"}
              </span>
              <span className="text-xs text-mute">{experience.city || "Sydney"}</span>
            </div>

            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-ink">{experience.title}</h1>
          </div>

          {/* Date & Time Block */}
          <EventDateCalendarBlock event={experience} />

          {/* Location & Map Card */}
          <EventLocationCard
            locationType={experience.locationType}
            venue={experience.venue}
            room={experience.room}
            city={experience.city}
            virtualUrl={experience.virtualUrl}
          />

          {/* Description & Agenda */}
          <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs">
            <h2 className="font-display text-lg font-bold text-ink mb-3">About this Experience</h2>
            <div className="prose prose-sm text-xs leading-relaxed text-ink/80 whitespace-pre-line">
              {experience.description || "Join fellow members for this curated real-world experience."}
            </div>
          </div>

          {/* Booking Card */}
          <EventRegistrationCard
            paidCents={experience.ticketPriceCents || 0}
            capacity={experience.capacity}
            requireApproval={experience.requireApproval}
            isGoing={experience.isGoing}
            buying={buying}
            tier={tier}
            spots={spots}
            onTierChange={setTier}
            onSpotsChange={setSpots}
            onSubmit={handleBookingSubmit}
            onToggleGoing={() => toggleGoing(experience.id)}
          />
        </div>
      </div>

      {/* Share Modal */}
      <EventShareModal
        open={shareOpen}
        eventId={experience.id}
        title={experience.title}
        venue={experience.venue}
        date={experience.date}
        heroImage={experience.heroImage}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}
