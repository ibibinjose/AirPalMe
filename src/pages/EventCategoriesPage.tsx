import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Laptop,
  MapPin,
  Music,
  PartyPopper,
  Sparkles,
  Ticket,
  Utensils,
  Wine,
} from "lucide-react";
import { useEvents } from "@/contexts/EventsContext";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

interface CategoryMeta {
  id: string;
  name: string;
  tagline: string;
  icon: typeof Music;
  color: string;
  image: string;
  keywords: string[];
}

const CATEGORIES: CategoryMeta[] = [
  {
    id: "music",
    name: "Live Music & Concerts",
    tagline: "Harbour galas, indie acoustic gigs, and headline concerts.",
    icon: Music,
    color: "from-purple-600/30 to-indigo-600/10",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
    keywords: ["music", "concert", "gig", "band", "acoustic", "live"],
  },
  {
    id: "workshops",
    name: "Workshops & Masterclasses",
    tagline: "Hands-on creative arts, coffee masterclasses, and skills labs.",
    icon: Laptop,
    color: "from-sky-600/30 to-blue-600/10",
    image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80",
    keywords: ["workshop", "masterclass", "learn", "studio", "creative", "skills"],
  },
  {
    id: "food",
    name: "Food, Dining & Night Markets",
    tagline: "Street food melas, wine tastings, and chef tasting pop-ups.",
    icon: Utensils,
    color: "from-amber-600/30 to-orange-600/10",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80",
    keywords: ["food", "dining", "dinner", "market", "mela", "wine", "cocktails", "eat"],
  },
  {
    id: "tech",
    name: "Tech & Creative Mixers",
    tagline: "Founder huddles, AI demos, and tech community gatherings.",
    icon: Sparkles,
    color: "from-indigo-600/30 to-violet-600/10",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80",
    keywords: ["tech", "ai", "founder", "networking", "huddle", "pitch", "mixer"],
  },
  {
    id: "culture",
    name: "Indian Festivals & Melas",
    tagline: "Diwali galas, dandiya nights, cultural fairs, and artisan stalls.",
    icon: PartyPopper,
    color: "from-rose-600/30 to-pink-600/10",
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop&q=80",
    keywords: ["festival", "diwali", "holi", "indian", "culture", "cultural", "stall"],
  },
  {
    id: "social",
    name: "Nightlife, Rooftops & Socials",
    tagline: "Sunset aperitivos, rooftop lounges, and weekend mingles.",
    icon: Wine,
    color: "from-emerald-600/30 to-teal-600/10",
    image: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&auto=format&fit=crop&q=80",
    keywords: ["nightlife", "rooftop", "social", "drinks", "mingle", "sundowner", "party"],
  },
];

export function EventCategoriesPage() {
  const { calendarEvents } = useEvents();
  const [selectedCatId, setSelectedCatId] = useState<string>("all");

  // Compute event counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      counts[cat.id] = calendarEvents.filter((ev) => {
        const text = `${ev.title} ${ev.category} ${ev.description}`.toLowerCase();
        return cat.keywords.some((kw) => text.includes(kw));
      }).length;
    }
    return counts;
  }, [calendarEvents]);

  // Filter events when category is selected
  const matchingEvents = useMemo(() => {
    if (selectedCatId === "all") return calendarEvents.slice(0, 8);
    const cat = CATEGORIES.find((c) => c.id === selectedCatId);
    if (!cat) return [];
    return calendarEvents.filter((ev) => {
      const text = `${ev.title} ${ev.category} ${ev.description}`.toLowerCase();
      return cat.keywords.some((kw) => text.includes(kw));
    });
  }, [calendarEvents, selectedCatId]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-32 md:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Link
            href="/events"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute hover:text-ink ring-1 ring-line hover:bg-paper transition"
          >
            <ArrowLeft size={14} />
            <span>All Events</span>
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Discover</span>
        </div>

        <Link
          href="/event"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 transition active:scale-95"
        >
          <Ticket size={14} />
          <span>Host an Event</span>
        </Link>
      </div>

      <div className="text-center max-w-xl mx-auto">
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-ink">
          Browse Events by Category
        </h1>
        <p className="mt-2 text-sm text-mute">
          Dive straight into the scenes you love — live music gigs, artisan masterclasses, dining melas, and tech
          mixers.
        </p>
      </div>

      {/* Grid of Category Cards */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count = categoryCounts[cat.id] || 0;
          const isSelected = selectedCatId === cat.id;

          return (
            <div
              key={cat.id}
              onClick={() => {
                void triggerHaptic("selection");
                setSelectedCatId(isSelected ? "all" : cat.id);
              }}
              className={cn(
                "group relative overflow-hidden rounded-3xl p-5 ring-1 transition cursor-pointer select-none",
                isSelected
                  ? "ring-2 ring-brand bg-card shadow-md scale-[1.01]"
                  : "bg-card ring-line hover:ring-brand/50 hover:shadow-sm",
              )}
            >
              {/* Cover background snippet */}
              <div className="absolute inset-0 z-0 opacity-15 transition group-hover:opacity-25">
                <img src={cat.image} alt={cat.name} className="h-full w-full object-cover" />
              </div>

              <div className="relative z-10 flex flex-col justify-between h-44">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-paper ring-1 ring-line/80 shadow-xs">
                    <Icon size={18} className="text-accent" />
                  </div>
                  <span className="rounded-full bg-paper/90 backdrop-blur-xs px-2.5 py-1 text-[11px] font-bold text-ink ring-1 ring-line/80">
                    {count} {count === 1 ? "Event" : "Events"}
                  </span>
                </div>

                <div>
                  <h3 className="font-display text-lg font-bold text-ink group-hover:text-brand transition">
                    {cat.name}
                  </h3>
                  <p className="mt-1 text-xs text-mute line-clamp-2 leading-relaxed">{cat.tagline}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Results Feed for Category */}
      <section className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">
              {selectedCatId === "all"
                ? "Featured Experiences"
                : `${CATEGORIES.find((c) => c.id === selectedCatId)?.name} (${matchingEvents.length})`}
            </h2>
            <p className="text-xs text-mute">
              {selectedCatId === "all"
                ? "Tap any category card above to focus on that specific scene."
                : "Showing verified events matching your selected category."}
            </p>
          </div>

          {selectedCatId !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedCatId("all")}
              className="text-xs font-semibold text-accent hover:underline cursor-pointer"
            >
              Clear filter
            </button>
          )}
        </div>

        {matchingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchingEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-col justify-between rounded-3xl bg-card p-4.5 ring-1 ring-line shadow-xs hover:ring-brand/40 transition"
              >
                <div className="flex gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-paper ring-1 ring-line/50">
                    {ev.heroImage ? (
                      <img src={ev.heroImage} alt={ev.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-accent">
                        <Calendar size={24} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                        {ev.category}
                      </span>
                      <span className="text-[11px] text-mute">{ev.date}</span>
                    </div>
                    <h3 className="font-display truncate text-sm font-bold text-ink mt-1">{ev.title}</h3>
                    <p className="truncate text-xs text-mute flex items-center gap-1 mt-0.5">
                      <MapPin size={12} className="shrink-0 text-mute" />
                      <span>{ev.venue || ev.city || "Venue TBA"}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3">
                  <div className="text-xs font-bold text-ink">{ev.ticketPrice || "Free Admission"}</div>
                  <Link
                    href={`/e/${ev.id}`}
                    className="inline-flex min-h-[38px] items-center gap-1 rounded-full bg-brand px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 transition"
                  >
                    <span>View Event &amp; Book</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-card p-8 text-center ring-1 ring-line shadow-xs">
            <p className="text-xs text-mute">No upcoming events currently listed under this category.</p>
            <Link
              href="/event"
              className="mt-3 inline-flex min-h-[40px] items-center rounded-full bg-paper px-4 text-xs font-semibold text-accent ring-1 ring-line hover:bg-card transition"
            >
              Host the first event in this category
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
