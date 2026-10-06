import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRoute, useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { BioHandleButton } from "@/components/bio/BioHandleButton";
import { FollowButton } from "@/components/social/SocialButtons";
import { useAuth } from "@/contexts/AuthContext";
import { useEvents } from "@/contexts/EventsContext";
import { bioPath, handleFromPlaceId } from "@shared/bio";
import { stallUnitDisplay } from "@shared/event";
import { loadBios } from "@/lib/bio-store";
import { EmojiRate } from "@/components/feedback/EmojiRate";
import { NotFoundPage } from "./NotFoundPage";

export function StallPage() {
  const [, params] = useRoute("/e/:eventId/s/:stallId");
  const [, nav] = useLocation();
  const { requireUser } = useAuth();
  const { getEvent, stallsFor, saveStall, unsaveStall, isSaved, fetchRemoteStalls } = useEvents();
  const eventId = params?.eventId || "";
  const [stallsReady, setStallsReady] = useState(false);
  useEffect(() => {
    if (eventId) void fetchRemoteStalls(eventId).then(() => setStallsReady(true));
  }, [eventId, fetchRemoteStalls]);
  const event = getEvent(eventId);
  const stall = stallsFor(eventId).find((s) => s.id === params?.stallId);
  if (!event || !stall) {
    if (!stallsReady) {
      return <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-mute">Loading…</div>;
    }
    return <NotFoundPage />;
  }
  const saved = isSaved(stall.id);
  const handle =
    stall.handle || loadBios().find((p) => p.stallId === stall.id)?.handle || handleFromPlaceId(stall.id) || undefined;

  return (
    <div className="mx-auto max-w-lg px-4 pb-28">
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-mute hover:text-ink transition"
          onClick={() => {
            if (document.referrer && document.referrer.includes(window.location.host)) {
              window.history.back();
            } else {
              nav(event.gatePath);
            }
          }}
        >
          <ArrowLeft size={16} />
          <span>{event.name}</span>
        </button>
        <BioHandleButton handle={handle} />
      </div>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
        {stallUnitDisplay(event.flavour, stall.booth)} · {stall.category}
        {stall.location ? ` · ${stall.location}` : ""}
      </p>
      <h1 className="font-display mt-1 text-3xl font-semibold">{stall.name}</h1>
      {stall.shortWhy && <p className="mt-3 text-[15px] leading-relaxed">{stall.shortWhy}</p>}
      {stall.offer && (
        <p className="mt-4 rounded-2xl bg-card px-4 py-3 text-[15px] ring-1 ring-line">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">Offer</span>
          <span className="mt-1 block">{stall.offer}</span>
        </p>
      )}
      {handle && (
        <div className="mt-6 flex gap-2">
          <Button className="flex-1" variant="ghost" onClick={() => nav(bioPath(handle))}>
            Open @{handle}
          </Button>
          <FollowButton handle={handle} name={stall.name} />
        </div>
      )}
      <Button
        className={handle ? "mt-3 w-full" : "mt-6 w-full"}
        variant={saved ? "ghost" : "primary"}
        onClick={() => {
          if (saved) {
            void unsaveStall(stall.id);
            toast.message("Removed");
            return;
          }
          if (!requireUser("Sign in to save stalls.")) return;
          void saveStall(stall, event);
          toast.success("Saved");
        }}
      >
        {saved ? "Saved" : "Save stall"}
      </Button>
      <EmojiRate target="stall" eventId={event.id} stallId={stall.id} stallName={stall.name} />
    </div>
  );
}
