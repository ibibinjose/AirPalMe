import { Check } from "lucide-react";
import { ImageField } from "@/components/media/ImageField";
import { Photo } from "@/components/ui/Photo";
import { mediaSrcSet } from "@/lib/media-srcset";
import { triggerHapticSelection } from "@/lib/native";
import { cn } from "@/lib/cn";

/** Curated self-hosted artwork — no CDN, no tracking, always available offline. */
export const PLAN_COVERS: Array<{ id: string; src: string; label: string }> = [
  { id: "harbour", src: "/media/harbour.jpg", label: "Harbour" },
  { id: "laneway", src: "/media/laneway.jpg", label: "Laneway" },
  { id: "walk", src: "/media/walk.jpg", label: "Coast walk" },
  { id: "room", src: "/media/room.jpg", label: "Night in" },
  { id: "campus", src: "/media/campus.jpg", label: "Campus" },
];

export function isPlanCover(src: string | undefined): boolean {
  return Boolean(src) && PLAN_COVERS.some((c) => c.src === src);
}

export function PlanCoverPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (src: string | undefined) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-accent">Cover</span>
        <span className="text-[11px] font-medium text-mute">Artwork or your own photo</span>
      </div>
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Plan cover artwork">
        {PLAN_COVERS.map((cover) => {
          const selected = value === cover.src;
          return (
            <button
              key={cover.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={cover.label}
              title={cover.label}
              onClick={() => {
                void triggerHapticSelection();
                onChange(selected ? undefined : cover.src);
              }}
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-2xl ring-2 ring-offset-2 ring-offset-card transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                selected ? "ring-brand" : "ring-transparent hover:ring-line",
              )}
            >
              <Photo
                src={cover.src}
                srcSet={mediaSrcSet(cover.src)}
                sizes="120px"
                alt=""
                className="h-full w-full object-cover"
              />
              {selected && (
                <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-brand text-white shadow-xs">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3">
        <ImageField
          kind="cover"
          folder="listings"
          label="Or upload your own"
          value={isPlanCover(value) ? undefined : value}
          onChange={(src) => void onChange(src)}
        />
      </div>
    </div>
  );
}
