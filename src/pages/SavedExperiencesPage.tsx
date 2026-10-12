import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  Compass,
  Download,
  ExternalLink,
  MapPin,
  Store,
  Tag,
  Ticket,
  Trash2,
} from "lucide-react";
import { useEvents } from "@/contexts/EventsContext";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

type FilterTab = "all" | "events" | "deals" | "stalls";

export function SavedExperiencesPage() {
  const { calendarEvents, savedStalls, unsaveStall, toggleInterested, toggleLiked, exportItinerary } = useEvents();
  const [filter, setFilter] = useState<FilterTab>("all");

  // Bookmarked / interested events
  const bookmarkedEvents = useMemo(() => {
    return calendarEvents.filter((e) => e.isInterested || e.isLiked);
  }, [calendarEvents]);

  // Saved deals from localStorage
  const savedDeals = useMemo(() => {
    try {
      const raw = localStorage.getItem("airpal_saved_deals");
      if (!raw) return [];
      return JSON.parse(raw) as Array<{
        id: string;
        title: string;
        merchantName: string;
        discount: string;
        expires: string;
        image?: string;
      }>;
    } catch {
      return [];
    }
  }, []);

  const totalCount = bookmarkedEvents.length + savedDeals.length + (savedStalls?.length || 0);

  const handleExport = () => {
    void triggerHaptic("medium");
    if (!bookmarkedEvents.length) {
      toast.info("No saved events to export. Tap the Star or Heart on any event first!");
      return;
    }
    exportItinerary("interested");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-32 md:px-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Link
            href="/pass"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute hover:text-ink ring-1 ring-line hover:bg-paper transition"
          >
            <ArrowLeft size={14} />
            <span>AirPal Pass</span>
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Bookmarks</span>
        </div>

        {bookmarkedEvents.length > 0 && (
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition cursor-pointer"
          >
            <Download size={14} />
            <span>Export to Calendar (.ics)</span>
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Saved Experiences</h1>
          <p className="mt-1 text-sm text-mute">
            Your personal wishlist of live gigs, dining perks, and artisan stalls saved for later.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-paper p-1.5 ring-1 ring-line">
          {[
            { id: "all" as const, label: `All (${totalCount})` },
            { id: "events" as const, label: `Events (${bookmarkedEvents.length})` },
            { id: "deals" as const, label: `Perks (${savedDeals.length})` },
            { id: "stalls" as const, label: `Stalls (${savedStalls?.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                void triggerHaptic("selection");
                setFilter(tab.id);
              }}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
                filter === tab.id ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink hover:bg-card",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {totalCount === 0 ? (
        /* Empty State */
        <div className="mt-12 rounded-3xl bg-card p-10 text-center ring-1 ring-line shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Bookmark size={28} />
          </div>
          <h2 className="font-display mt-4 text-xl font-bold text-ink">Your Saved Wishlist is Empty</h2>
          <p className="mt-1.5 text-xs text-mute max-w-sm mx-auto leading-relaxed">
            Whenever you see an event, dining perk, or festival stall you want to check out later, tap the Star or Heart
            to save it here without crowding your daily agenda.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/events"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-5 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 transition"
            >
              <Ticket size={14} />
              <span>Browse Events</span>
            </Link>
            <Link
              href="/deals"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition"
            >
              <Tag size={14} />
              <span>Member Deals</span>
            </Link>
            <Link
              href="/now"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-4 text-xs font-semibold text-accent ring-1 ring-line hover:bg-card transition"
            >
              <Compass size={14} />
              <span>Discover Now</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {/* Events Section */}
          {(filter === "all" || filter === "events") && bookmarkedEvents.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-ink flex items-center gap-2">
                  <Ticket size={16} className="text-accent" />
                  <span>Saved Events &amp; Shows ({bookmarkedEvents.length})</span>
                </h2>
                <Link href="/events" className="text-xs font-semibold text-accent hover:underline">
                  Find more events
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {bookmarkedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex flex-col justify-between rounded-3xl bg-card p-4 ring-1 ring-line shadow-xs transition hover:ring-brand/40"
                  >
                    <div className="flex gap-3.5">
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
                      <div className="text-xs font-bold text-ink">{ev.ticketPrice || "Free Entry"}</div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            void triggerHaptic("light");
                            if (ev.isInterested) toggleInterested(ev.id);
                            else if (ev.isLiked) toggleLiked(ev.id);
                            toast.success("Removed from saved experiences");
                          }}
                          className="grid h-9 w-9 place-items-center rounded-full bg-paper text-mute hover:text-rose-600 ring-1 ring-line/80 transition cursor-pointer"
                          aria-label="Remove from saved"
                        >
                          <Trash2 size={14} />
                        </button>

                        <Link
                          href={`/e/${ev.id}`}
                          className="inline-flex min-h-[38px] items-center gap-1 rounded-full bg-brand px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 transition"
                        >
                          <span>Get Pass</span>
                          <ExternalLink size={12} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stalls Section */}
          {(filter === "all" || filter === "stalls") && (savedStalls?.length || 0) > 0 && (
            <div className="space-y-3">
              <h2 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Store size={16} className="text-amber-500" />
                <span>Saved Festival Stalls ({savedStalls?.length || 0})</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {savedStalls?.map((stall) => (
                  <div
                    key={stall.stallId}
                    className="flex items-center justify-between rounded-3xl bg-card p-4 ring-1 ring-line shadow-xs"
                  >
                    <div className="min-w-0 pr-3">
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        {stall.category || "Artisan & Food"}
                      </span>
                      <h3 className="font-display truncate text-sm font-bold text-ink mt-1">{stall.name}</h3>
                      <p className="truncate text-xs text-mute">Saved from festival showcase</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          void triggerHaptic("light");
                          unsaveStall(stall.stallId);
                          toast.success("Stall removed from saved");
                        }}
                        className="grid h-9 w-9 place-items-center rounded-full bg-paper text-mute hover:text-rose-600 ring-1 ring-line/80 transition cursor-pointer"
                        aria-label="Remove stall"
                      >
                        <Trash2 size={14} />
                      </button>

                      <Link
                        href={`/e/${stall.eventId}/s/${stall.stallId}`}
                        className="inline-flex min-h-[38px] items-center gap-1 rounded-full bg-paper px-3 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition"
                      >
                        <span>View Stall</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
