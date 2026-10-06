import { MapPin } from "lucide-react";
import type { HerePin } from "@shared/here";
import { mapsUrl } from "@/lib/geo";
import { cn } from "@/lib/cn";

export function CircleHereBoard({
  pins,
  myHandle,
  onOpen,
}: {
  pins: HerePin[];
  myHandle?: string;
  onOpen?: (pin: HerePin) => void;
}) {
  if (!pins.length) return null;
  return (
    <section className="mt-4 rounded-[20px] bg-paper p-4">
      <p className="text-[13px] font-semibold text-mute">Here now</p>
      <ul className="mt-2 divide-y divide-line/70">
        {pins.map((p) => (
          <li key={p.handle} className="flex items-center gap-3 py-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand/10 text-accent">
              <MapPin size={16} />
            </span>
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen?.(p)}>
              <p className="truncate text-[15px] font-semibold">
                {p.handle === myHandle ? "You" : p.name} <span className="font-normal text-mute">· {p.placeName}</span>
              </p>
              <p className="text-[12px] text-mute">
                {p.handle === myHandle ? "Sharing with your Circle" : "Pinned at this place"}
              </p>
            </button>
            {p.geo && (
              <a
                href={mapsUrl(p.geo, p.placeName)}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] font-semibold text-accent"
              >
                Maps
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HereEmptyHint({ className }: { className?: string }) {
  return (
    <p className={cn("text-[13px] text-mute", className)}>
      Nobody’s pinned here yet. Share I’m here so your Circle can find you.
    </p>
  );
}
