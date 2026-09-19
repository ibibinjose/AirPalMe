import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { fieldInput } from "@/components/forms/ValidField";
import { liveBackendEnabled } from "@/lib/functions";
import { shareHereRemote } from "@/lib/here";
import { requestDeviceGeo } from "@/lib/weather";
import { HERE_HOURS, type HereAudience, type HereHours } from "@shared/here";
import { cn } from "@/lib/cn";

type Person = { handle: string; name: string };

export function CircleHereSheet({
  open,
  onClose,
  people,
  defaultPlaceName,
  planId,
  placeId,
  eventId,
  onShared,
}: {
  open: boolean;
  onClose: () => void;
  people: Person[];
  defaultPlaceName?: string;
  planId?: string;
  placeId?: string;
  eventId?: string;
  onShared?: () => void;
}) {
  const [placeName, setPlaceName] = useState(defaultPlaceName || "");
  const [audience, setAudience] = useState<HereAudience>("circle");
  const [toHandle, setToHandle] = useState("");
  const [hours, setHours] = useState<HereHours>(3);
  const [pinOnMap, setPinOnMap] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setPlaceName(defaultPlaceName || "");
  }, [open, defaultPlaceName]);

  const hourLabels: Record<HereHours, string> = { 1: "1 hour", 3: "3 hours", 8: "Until I stop" };

  const filtered = useMemo(() => {
    const q = toHandle.trim().toLowerCase().replace(/^@/, "");
    if (!q) return people.slice(0, 8);
    return people.filter((p) => p.handle.includes(q) || p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [people, toHandle]);

  async function send() {
    if (placeName.trim().length < 2) {
      toast.message("Name the place you’re at.");
      return;
    }
    if (audience === "person" && !toHandle.trim()) {
      toast.message("Pick someone in your Circle.");
      return;
    }
    if (!liveBackendEnabled()) {
      toast.message("Connect Firebase to share with your Circle.");
      return;
    }
    setBusy(true);
    try {
      const geo = await requestDeviceGeo();
      await shareHereRemote({
        placeName: placeName.trim(),
        planId,
        placeId,
        eventId,
        lat: geo?.lat,
        lng: geo?.lng,
        audience,
        toHandle: audience === "person" ? toHandle.trim() : undefined,
        hours,
        pinOnMap: audience === "circle" ? pinOnMap : pinOnMap,
      });
      toast.success(audience === "person" ? `Shared with @${toHandle.replace(/^@/, "")}` : "Shared with your Circle");
      onShared?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not share");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="I’m here">
      <p className="text-[15px] leading-6 text-mute">
        Share this event space with your Circle or one person. We pin the venue, not your home.
      </p>
      <label className="mt-4 block">
        <span className="text-[13px] font-semibold text-mute">Where</span>
        <div className="relative mt-1">
          <MapPin size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
          <input
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value.slice(0, 80))}
            placeholder="The Glenmore rooftop"
            className={`${fieldInput} pl-10`}
          />
        </div>
      </label>

      <p className="mt-4 text-[13px] font-semibold text-mute">Who sees it</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(
          [
            ["circle", "Circle"],
            ["person", "One person"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAudience(id)}
            className={cn(
              "h-11 rounded-full text-[14px] font-semibold",
              audience === id ? "bg-brand text-white" : "bg-paper text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {audience === "person" && (
        <div className="mt-3">
          <input
            value={toHandle}
            onChange={(e) => setToHandle(e.target.value.replace(/^@/, ""))}
            placeholder="Search your Circle"
            className={fieldInput}
          />
          <ul className="mt-2 max-h-36 overflow-y-auto rounded-[16px] bg-paper">
            {filtered.map((p) => (
              <li key={p.handle}>
                <button
                  type="button"
                  onClick={() => setToHandle(p.handle)}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2.5 text-left text-[15px]",
                    toHandle === p.handle && "font-semibold text-brand",
                  )}
                >
                  <span>{p.name}</span>
                  <span className="text-[12px] text-mute">@{p.handle}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-[13px] font-semibold text-mute">How long</p>
      <div className="mt-2 flex gap-2">
        {HERE_HOURS.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHours(h)}
            className={cn(
              "h-9 flex-1 rounded-full text-[12px] font-semibold",
              hours === h ? "bg-brand text-white" : "bg-paper text-ink",
            )}
          >
            {hourLabels[h]}
          </button>
        ))}
      </div>

      <label className="mt-4 flex items-center gap-3 px-1 py-1">
        <input
          type="checkbox"
          className="h-5 w-5 accent-[#1805db]"
          checked={pinOnMap}
          onChange={(e) => setPinOnMap(e.target.checked)}
        />
        <span className="text-[15px] text-ink">Pin me for people at this place</span>
      </label>

      <Button className="mt-5 w-full" disabled={busy} loading={busy} onClick={() => void send()}>
        Share
      </Button>
      <button type="button" className="mt-3 w-full text-center text-[15px] font-medium text-mute" onClick={onClose}>
        Cancel
      </button>
    </Sheet>
  );
}
