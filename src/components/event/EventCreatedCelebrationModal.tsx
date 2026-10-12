import { useState } from "react";
import { Link } from "wouter";
import { Check, Copy, ExternalLink, QrCode, Sparkles, Store, Users } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { toPublicUrl } from "@/lib/public-origin";
import type { EventFlavour } from "@shared/event";

export interface EventCreatedCelebrationModalProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  name: string;
  flavour: EventFlavour;
  venue?: string;
  city?: string;
  onOpenStalls?: () => void;
}

export function EventCreatedCelebrationModal({
  open,
  onClose,
  eventId,
  name,
  flavour,
  venue,
  city = "Sydney",
  onOpenStalls,
}: EventCreatedCelebrationModalProps) {
  const [copied, setCopied] = useState(false);
  const publicPath = `/e/${eventId}`;
  const fullUrl = toPublicUrl(publicPath);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success("Event link copied! Share it anywhere.");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Event is Officially Live!">
      <div className="space-y-4 pt-1">
        {/* Celebration Header Graphic */}
        <div className="rounded-2xl bg-gradient-to-tr from-brand/15 via-card to-amber-500/15 p-4 text-center ring-1 ring-line/80 space-y-2">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand text-white shadow-md">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-ink">{name}</h3>
            {(venue || city) && (
              <p className="text-xs text-mute font-medium">{[venue, city].filter(Boolean).join(" · ")}</p>
            )}
          </div>
          <span className="inline-block rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
            Passbook Gate &amp; RSVPs Open
          </span>
        </div>

        {/* Public Share Link Card */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-mute block">Public Attendee Link</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={fullUrl}
              className="h-11 flex-1 rounded-2xl border border-line bg-paper px-3 text-xs text-ink font-mono outline-none truncate"
            />
            <Button
              type="button"
              variant={copied ? "tonal" : "primary"}
              className="h-11 px-4 gap-1.5 rounded-2xl shrink-0"
              onClick={copyLink}
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2 pt-1">
          <Link
            href={publicPath}
            onClick={onClose}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-brand text-white font-bold text-xs shadow-md hover:bg-brand/90 transition active:scale-95"
          >
            <ExternalLink size={14} />
            <span>View Public Event Page</span>
          </Link>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/e/${eventId}/guests`}
              onClick={onClose}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-paper px-3 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition active:scale-95"
            >
              <Users size={14} className="text-accent" />
              <span>Door Guestlist</span>
            </Link>

            <Link
              href="/scan"
              onClick={onClose}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-paper px-3 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition active:scale-95"
            >
              <QrCode size={14} className="text-amber-500" />
              <span>Door Scanner</span>
            </Link>
          </div>

          {(flavour === "market" || flavour === "expo") && onOpenStalls && (
            <Button
              type="button"
              variant="tonal"
              className="w-full min-h-[44px] rounded-2xl text-xs font-bold gap-2"
              onClick={() => {
                onClose();
                onOpenStalls();
              }}
            >
              <Store size={14} />
              <span>Add Stalls &amp; Exhibitors</span>
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
