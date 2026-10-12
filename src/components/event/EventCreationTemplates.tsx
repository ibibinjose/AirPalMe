import { Sparkles, Music, Store, Laptop, Wine, PartyPopper } from "lucide-react";
import type { EventFlavour, EventLocationType } from "@shared/event";
import { cn } from "@/lib/cn";

export interface EventTemplateConfig {
  id: string;
  label: string;
  icon: typeof Music;
  badge: string;
  flavour: EventFlavour;
  suggestedName: string;
  suggestedWhy: string;
  coverImage: string;
  daysAhead: number;
  startHour: number;
  durationHours: number;
  paid: boolean;
  price: string;
  capacity: string;
  themeColor?: string;
  locationType?: EventLocationType;
  requireApproval?: boolean;
}

export const EVENT_TEMPLATES: EventTemplateConfig[] = [
  {
    id: "concert",
    label: "Concert & Gig",
    icon: Music,
    badge: "Nightlife",
    flavour: "event_space",
    suggestedName: "Acoustic Sunset Sessions",
    suggestedWhy: "Live local artists, craft beverages, and harbour vibes",
    coverImage: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
    daysAhead: 5,
    startHour: 19,
    durationHours: 4,
    paid: true,
    price: "25",
    capacity: "120",
    themeColor: "#8b5cf6",
    locationType: "in_person",
    requireApproval: false,
  },
  {
    id: "festival",
    label: "Festival & Mela",
    icon: PartyPopper,
    badge: "Culture",
    flavour: "market",
    suggestedName: "Sydney Cultural Festival & Mela",
    suggestedWhy: "Live stage, traditional food stalls, dance performances, and makers",
    coverImage: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80",
    daysAhead: 6,
    startHour: 11,
    durationHours: 8,
    paid: false,
    price: "0",
    capacity: "500",
    themeColor: "#f59e0b",
    locationType: "in_person",
    requireApproval: false,
  },
  {
    id: "market",
    label: "Weekend Market",
    icon: Store,
    badge: "Community",
    flavour: "market",
    suggestedName: "Artisanal Makers & Food Fair",
    suggestedWhy: "60+ handmade stalls, organic coffee, baked goods, and live buskers",
    coverImage: "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=1200&q=80",
    daysAhead: 6,
    startHour: 9,
    durationHours: 6,
    paid: false,
    price: "0",
    capacity: "300",
    themeColor: "#10b981",
    locationType: "in_person",
    requireApproval: false,
  },
  {
    id: "tech",
    label: "Tech & Founders",
    icon: Laptop,
    badge: "Professional",
    flavour: "expo",
    suggestedName: "Founders, AI & Design Mixer",
    suggestedWhy: "Lightning talks, tech showcases, and community networking",
    coverImage: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
    daysAhead: 3,
    startHour: 18,
    durationHours: 3,
    paid: false,
    price: "0",
    capacity: "80",
    themeColor: "#6366f1",
    locationType: "in_person",
    requireApproval: true,
  },
  {
    id: "mixer",
    label: "Social & Cocktails",
    icon: Wine,
    badge: "Social",
    flavour: "event_space",
    suggestedName: "Harbour Twilight Social",
    suggestedWhy: "Drinks, networking circle connections, and relaxed rooftop music",
    coverImage: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80",
    daysAhead: 4,
    startHour: 18,
    durationHours: 3,
    paid: true,
    price: "15",
    capacity: "60",
    themeColor: "#f43f5e",
    locationType: "in_person",
    requireApproval: false,
  },
];

export interface EventCreationTemplatesProps {
  onApplyTemplate: (template: EventTemplateConfig) => void;
  className?: string;
}

export function EventCreationTemplates({ onApplyTemplate, className }: EventCreationTemplatesProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-accent">
          <Sparkles size={13} className="text-amber-500" />
          <span>Quick-Start Templates</span>
        </span>
        <span className="text-[11px] text-mute">1-tap pre-fill</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {EVENT_TEMPLATES.map((tmpl) => {
          const Icon = tmpl.icon;
          return (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => onApplyTemplate(tmpl)}
              className="group flex flex-col items-start rounded-2xl bg-paper/90 p-3 text-left ring-1 ring-line/80 transition-all hover:bg-card hover:ring-brand/40 hover:shadow-sm active:scale-95"
            >
              <div className="flex w-full items-center justify-between">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-card text-accent ring-1 ring-line group-hover:bg-brand group-hover:text-white transition">
                  <Icon size={15} />
                </span>
                <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[9px] font-bold text-accent uppercase tracking-wider">
                  {tmpl.badge}
                </span>
              </div>
              <span className="mt-2 block text-xs font-bold text-ink leading-tight">{tmpl.label}</span>
              <span className="mt-0.5 block text-[10px] text-mute truncate w-full">
                {tmpl.paid ? `$${tmpl.price} Pass` : "Free Pass"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
