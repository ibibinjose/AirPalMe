import { useState } from "react";
import { Check, Copy, ExternalLink, Globe, Lock, MapPin, Navigation, ShieldCheck, Video } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import type { EventLocationType } from "@shared/event";

export interface EventLocationCardProps {
  venue: string;
  room?: string;
  address?: string;
  city: string;
  geo?: { lat: number; lng: number };
  locationType?: EventLocationType;
  virtualUrl?: string;
  className?: string;
}

export function EventLocationCard({
  venue,
  room,
  address,
  city,
  geo,
  locationType = "in_person",
  virtualUrl,
  className,
}: EventLocationCardProps) {
  const [copied, setCopied] = useState(false);

  // VIRTUAL MODE
  if (locationType === "virtual") {
    return (
      <div
        className={cn(
          "rounded-[24px] bg-card/90 p-4 ring-1 ring-line/70 shadow-clay backdrop-blur-md space-y-3",
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-line/50 pb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
            <Video size={14} className="text-accent" />
            <span>Virtual Experience · Online Stream</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
            <Globe size={10} /> Online
          </span>
        </div>

        <div>
          <h3 className="text-sm font-bold text-ink">{venue || "Online Live Stream & Interactive Gathering"}</h3>
          <p className="mt-0.5 text-xs text-mute leading-relaxed">
            {address || "Accessible globally from your phone or browser"}
          </p>
        </div>

        <div className="rounded-2xl bg-paper/90 p-3.5 border border-line/70 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-brand/15 text-accent ring-1 ring-brand/20">
              <ShieldCheck size={14} />
            </span>
            <span>Stream Access Gate</span>
          </div>
          <p className="text-[11px] text-mute leading-relaxed">
            {virtualUrl
              ? "Live stream link is protected and delivered with your AirPal Pass."
              : "Meeting coordinates & streaming room details are issued to registered pass holders."}
          </p>
          {virtualUrl && (
            <div className="pt-1">
              <a
                href={virtualUrl.startsWith("http") ? virtualUrl : `https://${virtualUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full min-h-[38px] items-center justify-center gap-1.5 rounded-full bg-brand px-3 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition active:scale-98"
              >
                <Video size={13} />
                <span>Open Virtual Stream</span>
                <ExternalLink size={11} className="opacity-80" />
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // SECRET / TBA MODE
  if (locationType === "secret") {
    return (
      <div
        className={cn(
          "rounded-[24px] bg-card/90 p-4 ring-1 ring-line/70 shadow-clay backdrop-blur-md space-y-3",
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-line/50 pb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
            <Lock size={14} className="text-amber-500" />
            <span>Secret Venue · Confidential</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 ring-1 ring-amber-400/30">
            TBA to Guests
          </span>
        </div>

        <div>
          <h3 className="text-sm font-bold text-ink">{venue || "Secret Location"}</h3>
          <p className="mt-0.5 text-xs text-mute leading-relaxed">
            {city ? `General vicinity: ${city}` : "Location announced before event"}
          </p>
        </div>

        <div className="rounded-2xl bg-amber-500/10 p-3.5 border border-amber-500/20 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-ink">
            <Lock size={13} className="text-amber-600 dark:text-amber-400" />
            <span>Revealed Upon Confirmation</span>
          </div>
          <p className="text-[11px] text-mute leading-relaxed">
            Exact address and private entry instructions are kept confidential to curb uninvited crashers. Approved
            ticket holders will see coordinates in their AirPal Pass.
          </p>
        </div>
      </div>
    );
  }

  // IN-PERSON MODE (Default)
  const displayTitle = [venue, room].filter(Boolean).join(" · ") || city || "Venue Location";
  const displayAddress = address || (venue ? `${venue}, ${city}` : city);

  const mapQuery = encodeURIComponent(geo ? `${geo.lat},${geo.lng}` : address || `${venue}, ${city}`);
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy address");
    }
  };

  return (
    <div
      className={cn(
        "rounded-[24px] bg-card/90 p-4 ring-1 ring-line/70 shadow-clay backdrop-blur-md space-y-3",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-line/50 pb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
          <MapPin size={14} className="text-accent" />
          <span>Location &amp; Venue</span>
        </div>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
        >
          <span>Directions</span>
          <ExternalLink size={11} />
        </a>
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink">{displayTitle}</h3>
        <p className="mt-0.5 text-xs text-mute leading-relaxed">{displayAddress}</p>
      </div>

      {/* Map Embed Container */}
      <div className="relative aspect-[16/8] sm:aspect-[16/7] w-full overflow-hidden rounded-2xl bg-paper ring-1 ring-line/60">
        <iframe
          title={`Map of ${displayTitle}`}
          src={`https://www.google.com/maps?q=${mapQuery}&z=15&output=embed`}
          className="h-full w-full border-0 filter contrast-[1.02] opacity-90 dark:opacity-80"
          loading="lazy"
        />
        {/* Soft overlay on corners for sleek Liquid Glass look */}
        <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-inset ring-black/5 dark:ring-white/10" />
      </div>

      {/* Address Action Bar */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={copyAddress}
          className="flex-1 inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-full bg-paper px-3 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card hover:ring-brand/30 transition active:scale-95 cursor-pointer"
        >
          {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="text-mute" />}
          <span>{copied ? "Copied" : "Copy Address"}</span>
        </button>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-full bg-paper px-3 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card hover:ring-brand/30 transition active:scale-95 cursor-pointer"
        >
          <Navigation size={13} className="text-accent" />
          <span>Get Directions</span>
        </a>
      </div>
    </div>
  );
}
