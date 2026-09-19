import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useSocial } from "@/contexts/SocialContext";
import { CircleHereSheet } from "@/components/circle/CircleHereSheet";
import { CircleHereBoard } from "@/components/circle/CircleHereBoard";
import { fetchHereAt, fetchMyHerePin, stopHereRemote } from "@/lib/here";
import { liveBackendEnabled } from "@/lib/functions";
import { herePlaceKey, type HerePin } from "@shared/here";
import { listPeople } from "@/lib/people";
import { circleHandles } from "@/lib/circle";

export function HereCheckIn({
  placeName,
  planId,
  placeId,
  eventId,
}: {
  placeName: string;
  planId?: string;
  placeId?: string;
  eventId?: string;
}) {
  const [, nav] = useLocation();
  const { user } = useAuth();
  const { mine } = useBio();
  const { followedHandles, followerHandles, likedHandles, likedByHandles } = useSocial();
  const [open, setOpen] = useState(false);
  const [minePin, setMinePin] = useState<HerePin | null>(null);
  const [pins, setPins] = useState<HerePin[]>([]);
  const placeKey = herePlaceKey({ planId, placeId, eventId });

  const people = useMemo(() => {
    const met = new Set(
      listPeople()
        .map((p) => (p.handle || "").toLowerCase())
        .filter(Boolean),
    );
    const handles = circleHandles({
      following: followedHandles,
      followers: followerHandles,
      liked: likedHandles,
      likedBy: likedByHandles,
      met,
    });
    const directory = listPeople();
    return handles.map((h) => ({ handle: h, name: directory.find((p) => p.handle === h)?.name || h }));
  }, [followedHandles, followerHandles, likedHandles, likedByHandles]);

  const load = useCallback(async () => {
    if (!liveBackendEnabled()) return;
    const [own, at] = await Promise.all([
      mine?.handle ? fetchMyHerePin(mine.handle) : Promise.resolve(null),
      placeKey ? fetchHereAt(placeKey) : Promise.resolve([]),
    ]);
    setMinePin(own);
    setPins(at);
  }, [mine?.handle, placeKey]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;

  const hereNow = minePin && minePin.placeKey === placeKey;

  async function stop() {
    try {
      await stopHereRemote();
      setMinePin(null);
      toast.success("Stopped sharing");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not stop");
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => (hereNow ? void stop() : mine?.handle ? setOpen(true) : nav("/bio/setup"))}
        className="flex w-full items-center gap-3 rounded-[20px] bg-paper px-4 py-3.5 text-left"
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-brand/10 text-brand">
          <MapPin size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium text-mute">{hereNow ? "You’re here" : "At this place"}</span>
          <span className="block truncate text-[15px] font-semibold">
            {hereNow ? minePin.placeName : `Share I’m here · ${placeName}`}
          </span>
        </span>
        <span className="text-[15px] font-semibold text-brand">{hereNow ? "Stop" : "Share"}</span>
      </button>
      <CircleHereBoard pins={pins} myHandle={mine?.handle} />
      <CircleHereSheet
        open={open}
        onClose={() => setOpen(false)}
        people={people}
        defaultPlaceName={placeName}
        planId={planId}
        placeId={placeId}
        eventId={eventId}
        onShared={() => void load()}
      />
    </div>
  );
}
