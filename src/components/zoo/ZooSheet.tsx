import { useLocation } from "wouter";
import { Heart, UserPlus } from "lucide-react";
import { animalById, huntProgress, type ZooHunt, type ZooHuntStop } from "@shared/zoo";
import { bioPath } from "@shared/bio";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { ZooSticker } from "@/components/zoo/ZooSticker";
import { useAuth } from "@/contexts/AuthContext";
import { useZoo } from "@/contexts/ZooContext";
import { cn } from "@/lib/cn";

export function ZooSheet({
  open,
  onClose,
  hunt,
  stop,
}: {
  open: boolean;
  onClose: () => void;
  hunt: ZooHunt;
  stop: ZooHuntStop;
}) {
  const [, nav] = useLocation();
  const { user } = useAuth();
  const { state, collect, like, follow } = useZoo();
  const animal = animalById(stop.animalId);
  const inZoo = state.stickers.some((s) => s.animalId === stop.animalId && s.huntId === hunt.id);
  const shop = state.shops.find((s) => s.handle === stop.handle);
  const progress = huntProgress(state, hunt.id, [hunt]);

  function add() {
    collect(hunt, stop);
    onClose();
    nav(user ? "/me/zoo" : `/start?next=${encodeURIComponent("/me/zoo")}`);
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">{hunt.name}</p>
      <h2 className="font-display mt-1 text-2xl font-semibold">{inZoo ? `${animal?.name} is in your Zoo` : `${animal?.name}`}</h2>
      <p className="mt-1 text-sm text-mute">{inZoo ? progress.label : "Add this sticker to your Zoo. The shop page stays open."}</p>
      <div className="mx-auto mt-4 h-44 w-44">
        <ZooSticker animalId={stop.animalId} className="h-full w-full" />
      </div>
      <div className="mt-4 rounded-2xl bg-paper px-4 py-3 ring-1 ring-line">
        <p className="text-[12px] text-mute">@{stop.handle}</p>
        <p className="font-medium">{stop.name}</p>
        {stop.offer && (
          <p className="mt-1 text-[13px] text-gold">
            {stop.offer.badge} · {stop.offer.detail}
          </p>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            if (!shop) collect(hunt, stop);
            like(stop.handle, !shop?.liked);
          }}
          className={cn(
            "flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-sm font-medium ring-1",
            shop?.liked ? "bg-ink text-white ring-ink" : "bg-white text-ink ring-line",
          )}
        >
          <Heart size={16} fill={shop?.liked ? "currentColor" : "none"} />
          Like
        </button>
        <button
          type="button"
          onClick={() => {
            if (!shop) collect(hunt, stop);
            follow(stop.handle, !shop?.followed);
          }}
          className={cn(
            "flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-sm font-medium ring-1",
            shop?.followed ? "bg-ink text-white ring-ink" : "bg-white text-ink ring-line",
          )}
        >
          <UserPlus size={16} />
          Follow
        </button>
      </div>
      <Button className="mt-3 w-full" onClick={add}>
        {inZoo ? "Open my Zoo" : user ? "Add to my Zoo" : "Add to my Zoo — join"}
      </Button>
      <button type="button" className="mt-3 w-full text-sm text-mute" onClick={onClose}>
        Stay on this page
      </button>
      <button
        type="button"
        className="mt-2 w-full text-sm text-brand"
        onClick={() => {
          onClose();
          nav(bioPath(stop.handle));
        }}
      >
        Business page
      </button>
    </Sheet>
  );
}
