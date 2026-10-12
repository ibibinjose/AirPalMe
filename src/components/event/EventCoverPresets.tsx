import { Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface EventCoverPreset {
  id: string;
  label: string;
  category: string;
  url: string;
}

export const EVENT_COVER_PRESETS: EventCoverPreset[] = [
  {
    id: "concert",
    label: "Live Concert & Gigs",
    category: "Nightlife",
    url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "festival",
    label: "Festival & Celebration",
    category: "Culture",
    url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "harbour",
    label: "Sydney Harbour Vibes",
    category: "Scenic",
    url: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "market",
    label: "Artisanal Market & Mela",
    category: "Community",
    url: "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "tech",
    label: "Tech, AI & Founders",
    category: "Professional",
    url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "cocktails",
    label: "Cocktails & Networking",
    category: "Social",
    url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "art",
    label: "Art, Design & Expo",
    category: "Creative",
    url: "https://images.unsplash.com/photo-1578301978018-3005759f48c7?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "acoustic",
    label: "Acoustic Lounge & Sunset",
    category: "Relaxed",
    url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
  },
];

export interface EventCoverPresetSelectorProps {
  currentUrl?: string;
  onSelect: (url: string) => void;
  className?: string;
}

export function EventCoverPresetSelector({ currentUrl, onSelect, className }: EventCoverPresetSelectorProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-mute">
          <Sparkles size={12} className="text-amber-500" />
          <span>Curated Cover Presets</span>
        </span>
        <span className="text-[11px] text-mute">Click to apply instantly</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {EVENT_COVER_PRESETS.map((preset) => {
          const isSelected = currentUrl === preset.url;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.url)}
              className={cn(
                "group relative overflow-hidden rounded-2xl border text-left transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand",
                isSelected
                  ? "border-brand ring-2 ring-brand/50 shadow-md"
                  : "border-line/70 hover:border-brand/40 bg-card",
              )}
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <img
                  src={preset.url}
                  alt={preset.label}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {isSelected && (
                  <span className="absolute top-2 right-2 grid h-5 w-5 place-items-center rounded-full bg-brand text-white shadow-md">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
                <div className="absolute bottom-1.5 left-2 right-2">
                  <span className="block text-[11px] font-bold text-white leading-tight drop-shadow-sm truncate">
                    {preset.label}
                  </span>
                  <span className="block text-[9px] font-medium text-white/70 uppercase tracking-wider">
                    {preset.category}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
