import { Eye, ShieldCheck, Ticket } from "lucide-react";
import { EVENT_FLAVOUR_LABELS, type CalendarEvent, type EventFlavour, type EventLocationType } from "@shared/event";
import { EventCoverGlow } from "./EventCoverGlow";
import { EventDateCalendarBlock } from "./EventDateCalendarBlock";
import { EventHostCard } from "./EventHostCard";
import { EventLocationCard } from "./EventLocationCard";
import { cn } from "@/lib/cn";

export interface EventLivePreviewCardProps {
  title: string;
  coverImage?: string;
  flavour?: EventFlavour;
  shortWhy?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  venue?: string;
  address?: string;
  city?: string;
  geo?: { lat: number; lng: number };
  locationType?: EventLocationType;
  virtualUrl?: string;
  requireApproval?: boolean;
  themeColor?: string;
  hostName?: string;
  hostHandle?: string;
  hostType?: "business" | "individual";
  collaboratorHandles?: string[];
  ticketPriceCents?: number;
  capacity?: number;
  className?: string;
}

export function EventLivePreviewCard({
  title,
  coverImage,
  flavour = "market",
  shortWhy,
  description,
  startsAt,
  endsAt,
  venue,
  address,
  city = "Sydney",
  geo,
  locationType = "in_person",
  virtualUrl,
  requireApproval,
  themeColor,
  hostName,
  hostHandle,
  hostType = "business",
  collaboratorHandles = [],
  ticketPriceCents = 0,
  capacity,
  className,
}: EventLivePreviewCardProps) {
  const displayTitle = title.trim() || "Untitled Gathering";
  const displayShortWhy =
    shortWhy?.trim() ||
    (flavour === "market" ? "Artisanal stalls, food & music" : "Join us for this special experience");

  const isoStarts = startsAt || new Date().toISOString();
  const isoEnds = endsAt || isoStarts;

  const mockCalendarEvent: CalendarEvent = {
    id: "preview-card",
    title: displayTitle,
    description: description || displayShortWhy,
    startsAt: isoStarts,
    endsAt: isoEnds,
    date: new Date(isoStarts).toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }),
    timeLabel: new Date(isoStarts).toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
    }),
    city,
    venue: venue || "Venue to be announced",
    category: flavour === "market" ? "market" : flavour === "expo" ? "expo" : "community",
    categoryLabel: EVENT_FLAVOUR_LABELS[flavour],
    heroImage: coverImage,
    source: "user",
    isLocal: true,
    isGoing: false,
    isInterested: false,
    isLiked: false,
  };

  return (
    <div
      className={cn(
        "rounded-[32px] bg-card/90 p-4 sm:p-5 ring-1 ring-line/80 shadow-clay backdrop-blur-xl space-y-4",
        className,
      )}
    >
      {/* Live Preview Header Pill */}
      <div className="flex items-center justify-between border-b border-line/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink flex items-center gap-1">
            <Eye size={12} className="text-accent" />
            <span>Live Attendee Preview</span>
          </span>
        </div>
        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
          {EVENT_FLAVOUR_LABELS[flavour]}
        </span>
      </div>

      {/* Ambient Cover Banner */}
      <div className="max-w-[420px] mx-auto">
        <EventCoverGlow src={coverImage} alt={displayTitle} themeColor={themeColor} aspectRatio="square" />
      </div>

      {/* Date & Time Calendar Block */}
      <EventDateCalendarBlock event={mockCalendarEvent} />

      {/* Event Title & Subhead */}
      <div className="space-y-1.5 pt-1">
        <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink leading-tight">
          {displayTitle}
        </h2>
        <p className="text-xs sm:text-sm text-mute leading-relaxed font-medium">{displayShortWhy}</p>
      </div>

      {/* Location / Venue Card */}
      <EventLocationCard
        venue={
          venue ||
          (locationType === "virtual"
            ? "Online Stream"
            : locationType === "secret"
              ? "Secret Venue"
              : "Venue to be announced")
        }
        address={address}
        city={city}
        geo={geo}
        locationType={locationType}
        virtualUrl={virtualUrl}
      />

      {/* Host Card Preview */}
      <EventHostCard
        hostName={hostName}
        hostHandle={hostHandle}
        hostType={hostType}
        collaboratorHandles={collaboratorHandles}
      />

      {/* Ticket Tier Mock Card */}
      <div className="rounded-[24px] bg-paper/80 p-4 ring-1 ring-line/70 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
            <Ticket size={14} className="text-amber-500" />
            <span>Admission &amp; Access</span>
          </div>
          <span className="text-xs font-black text-ink">
            {ticketPriceCents > 0 ? `$${(ticketPriceCents / 100).toFixed(2)} AUD` : "Free Admission"}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-mute pt-1 border-t border-line/40">
          <span>Capacity</span>
          <span className="font-semibold text-ink">{capacity ? `${capacity} guest spots` : "Open admission"}</span>
        </div>
        {requireApproval && (
          <div className="flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-300 font-semibold pt-1 border-t border-line/40">
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} className="text-amber-500" />
              <span>Guest Screening</span>
            </span>
            <span>Host Approval Required</span>
          </div>
        )}
        <div className="rounded-xl bg-gradient-to-r from-brand/10 to-amber-500/10 p-2 text-center text-[11px] font-bold text-accent">
          {requireApproval
            ? "Request to Join · Passbook unlocked upon host approval"
            : "One-tap RSVP & Instant Apple/Google Wallet Pass"}
        </div>
      </div>
    </div>
  );
}
