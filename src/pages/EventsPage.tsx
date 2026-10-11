import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { ArrowLeft, CalendarDays, ChevronDown, MapPin, Plus, Search, Ticket, X } from "lucide-react";
import { useEvents } from "@/contexts/EventsContext";
import { useLocalNow } from "@/contexts/LocalNowContext";
import type { CalendarEvent } from "@shared/event";
import { recordToCalendarBase, cityMatches } from "@/lib/remote-events";
import { CalendarEventCard } from "@/components/calendar/CalendarEventCard";
import { CalendarDragProvider } from "@/components/calendar/CalendarDragContext";
import { triggerHaptic, triggerHapticSelection } from "@/lib/native";
import { CITY_OPTIONS } from "@/lib/cities";
import { toZonedDateStr } from "@/lib/local-time";
import { cn } from "@/lib/cn";

type EventCategory = "all" | "cultural" | "music" | "festivals" | "nightlife" | "community";
type DateRange = "all" | "today" | "weekend" | "week" | "month";

const CATEGORIES: { id: EventCategory; label: string; icon: string }[] = [
  { id: "all", label: "All Access", icon: "🎟️" },
  { id: "cultural", label: "Cultural", icon: "🪔" },
  { id: "music", label: "Concerts & Gigs", icon: "🎵" },
  { id: "festivals", label: "Festivals & Melas", icon: "🎪" },
  { id: "nightlife", label: "Nightlife", icon: "🍸" },
  { id: "community", label: "Community", icon: "✨" },
];

const DATE_RANGES: { id: DateRange; label: string }[] = [
  { id: "all", label: "All Dates" },
  { id: "today", label: "Today" },
  { id: "weekend", label: "This Weekend" },
  { id: "week", label: "Next 7 Days" },
  { id: "month", label: "Next 30 Days" },
];

function matchesCategory(event: CalendarEvent, cat: EventCategory): boolean {
  if (cat === "all") return true;
  const titleLower = (event.title || "").toLowerCase();
  const catLower = (event.category || "").toLowerCase();
  if (cat === "cultural") {
    return (
      catLower.includes("cultural") ||
      titleLower.includes("diwali") ||
      titleLower.includes("dandiya") ||
      titleLower.includes("bollywood") ||
      titleLower.includes("holi") ||
      titleLower.includes("india") ||
      titleLower.includes("garba") ||
      titleLower.includes("bhangra") ||
      titleLower.includes("desi")
    );
  }
  if (cat === "music") {
    return (
      catLower.includes("music") ||
      catLower.includes("concert") ||
      catLower.includes("gig") ||
      titleLower.includes("live") ||
      titleLower.includes("band") ||
      titleLower.includes("dj") ||
      titleLower.includes("concert")
    );
  }
  if (cat === "festivals") {
    return (
      catLower.includes("festival") ||
      catLower.includes("mela") ||
      catLower.includes("fair") ||
      titleLower.includes("festival") ||
      titleLower.includes("mela") ||
      titleLower.includes("carnival") ||
      titleLower.includes("expo")
    );
  }
  if (cat === "nightlife") {
    return (
      catLower.includes("club") ||
      catLower.includes("nightlife") ||
      catLower.includes("bar") ||
      titleLower.includes("night") ||
      titleLower.includes("party") ||
      titleLower.includes("club")
    );
  }
  if (cat === "community") {
    return (
      catLower.includes("community") ||
      catLower.includes("market") ||
      catLower.includes("expo") ||
      titleLower.includes("meetup") ||
      titleLower.includes("market")
    );
  }
  return true;
}

function matchesDateRange(date: string, range: DateRange, today: string): boolean {
  if (range === "all") return date >= today;
  if (range === "today") return date === today;
  if (range === "weekend") {
    const todayDate = new Date(today);
    const dayOfWeek = todayDate.getDay();
    const daysUntilSat = (6 - dayOfWeek + 7) % 7;
    const sat = new Date(todayDate);
    sat.setDate(todayDate.getDate() + daysUntilSat);
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    const satStr = toZonedDateStr(sat);
    const sunStr = toZonedDateStr(sun);
    return date === satStr || date === sunStr;
  }
  if (range === "week") {
    const todayDate = new Date(today);
    const in7 = new Date(todayDate);
    in7.setDate(todayDate.getDate() + 7);
    const in7Str = toZonedDateStr(in7);
    return date >= today && date <= in7Str;
  }
  if (range === "month") {
    const todayDate = new Date(today);
    const in30 = new Date(todayDate);
    in30.setDate(todayDate.getDate() + 30);
    const in30Str = toZonedDateStr(in30);
    return date >= today && date <= in30Str;
  }
  return date >= today;
}

/**
 * /events — Comprehensive directory of all live events with category filters
 * (Cultural, Concerts, Festivals & Melas, Nightlife, Community), city picker,
 * and date ranges. Feeds into EventPage.
 */
export function EventsPage() {
  const [, nav] = useLocation();
  const { calendarEvents, events, userStates } = useEvents();
  const { city, today, chooseLocation } = useLocalNow();
  const effectiveCity = city && city !== "Choose a city" && city !== "Current location" ? city : "Sydney";

  const searchString = useSearch();
  const searchParam = useMemo(() => {
    try {
      return new URLSearchParams(searchString).get("q")?.trim() || "";
    } catch {
      return "";
    }
  }, [searchString]);

  const [category, setCategory] = useState<EventCategory>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [query, setQuery] = useState(() => searchParam);
  const [cityMenuOpen, setCityMenuOpen] = useState(false);

  useEffect(() => {
    if (searchParam) {
      setQuery(searchParam);
    }
  }, [searchParam]);

  // All upcoming events for the selected city
  const cityEvents = useMemo(() => {
    const seen = new Set<string>();
    const rows: CalendarEvent[] = [];
    const push = (e: CalendarEvent) => {
      if (seen.has(e.id)) return;
      seen.add(e.id);
      rows.push(e);
    };

    for (const e of calendarEvents) {
      if (e.date < today) continue;
      if (!cityMatches(e.city, effectiveCity)) continue;
      push(e);
    }

    for (const r of events) {
      if (r.status !== "live") continue;
      const base = recordToCalendarBase(r);
      if (base.date < today) continue;
      if (!cityMatches(base.city, effectiveCity)) continue;
      const st = userStates[r.id];
      push({
        ...base,
        isGoing: st?.status === "going",
        isInterested: st?.status === "interested",
        isLiked: st?.liked === true,
      });
    }

    rows.sort((a, b) => a.date.localeCompare(b.date));
    return rows;
  }, [calendarEvents, events, userStates, today, effectiveCity]);

  // Dynamic counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<EventCategory, number> = {
      all: cityEvents.length,
      cultural: 0,
      music: 0,
      festivals: 0,
      nightlife: 0,
      community: 0,
    };
    for (const ev of cityEvents) {
      if (matchesCategory(ev, "cultural")) counts.cultural += 1;
      if (matchesCategory(ev, "music")) counts.music += 1;
      if (matchesCategory(ev, "festivals")) counts.festivals += 1;
      if (matchesCategory(ev, "nightlife")) counts.nightlife += 1;
      if (matchesCategory(ev, "community")) counts.community += 1;
    }
    return counts;
  }, [cityEvents]);

  // Filtered visible events
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cityEvents.filter((ev) => {
      if (!matchesCategory(ev, category)) return false;
      if (!matchesDateRange(ev.date, dateRange, today)) return false;
      if (q) {
        const titleMatch = (ev.title || "").toLowerCase().includes(q);
        const venueMatch = (ev.venue || "").toLowerCase().includes(q);
        const descMatch = (ev.description || "").toLowerCase().includes(q);
        if (!titleMatch && !venueMatch && !descMatch) return false;
      }
      return true;
    });
  }, [cityEvents, category, dateRange, today, query]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 md:px-6">
      {/* Top Navigation & Header */}
      <header className="pt-4 sm:pt-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/pass"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-3.5 text-[11px] font-bold uppercase tracking-wider text-accent ring-1 ring-line hover:bg-card transition"
            >
              <ArrowLeft size={13} /> AirPal Pass
            </Link>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">
              Events &amp; Tickets
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
              Events in
            </h1>

            {/* City Picker Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  setCityMenuOpen((v) => !v);
                }}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl bg-card px-3.5 py-1.5 text-2xl font-display font-extrabold text-brand ring-1 ring-line hover:bg-paper transition shadow-2xs"
                aria-expanded={cityMenuOpen}
                aria-label="Select city"
              >
                <MapPin size={18} className="text-amber-500 shrink-0" />
                <span>{effectiveCity}</span>
                <ChevronDown size={16} className={cn("text-mute transition-transform", cityMenuOpen && "rotate-180")} />
              </button>

              {/* City Dropdown Menu */}
              {cityMenuOpen && (
                <div
                  className="absolute left-0 top-full z-30 mt-2 w-64 rounded-3xl bg-card p-2 shadow-xl ring-1 ring-line animate-in fade-in zoom-in-95 duration-150"
                  role="menu"
                >
                  <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-mute">
                    Choose Destination
                  </p>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {CITY_OPTIONS.map((c) => {
                      const selected = cityMatches(c.label, effectiveCity);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            void triggerHapticSelection();
                            chooseLocation({ mode: "city", city: c.label, lat: c.lat, lng: c.lng });
                            setCityMenuOpen(false);
                          }}
                          className={cn(
                            "flex w-full min-h-[40px] items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition active:scale-[0.98]",
                            selected
                              ? "bg-brand text-white"
                              : "text-ink hover:bg-paper",
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span>{c.flag || "📍"}</span>
                            <span>{c.label}</span>
                          </span>
                          <span className={cn("text-[10px]", selected ? "text-white/80" : "text-mute")}>
                            {c.region}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-mute">
            Live directory of cultural festivals, concerts, gigs &amp; nightlife in {effectiveCity}.
          </p>
        </div>

        {/* Primary Header Action: Host Event */}
        <div className="flex items-center gap-2">
          <Link
            href="/calendar"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-4 py-2 text-xs font-bold text-ink ring-1 ring-line hover:bg-paper transition active:scale-95 shadow-xs"
          >
            <CalendarDays size={14} className="text-accent" />
            <span>Calendar</span>
          </Link>
          <Link
            href="/event"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition active:scale-95"
          >
            <Plus size={15} />
            <span>Host Event</span>
          </Link>
        </div>
      </header>

      {/* Category Pills Strip */}
      <nav aria-label="Event Categories" className="no-scrollbar mt-6 flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => {
          const active = category === cat.id;
          const count = categoryCounts[cat.id];
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                void triggerHapticSelection();
                setCategory(cat.id);
              }}
              className={cn(
                "inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-4 text-xs sm:text-[13px] font-bold transition shadow-2xs active:scale-95 cursor-pointer",
                active
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 ring-1 ring-neutral-900 shadow-sm"
                  : "bg-card text-ink ring-1 ring-line hover:bg-paper",
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    active
                      ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                      : "bg-paper text-mute ring-1 ring-line",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Secondary Filter & Search Bar */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Date Ranges */}
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
          {DATE_RANGES.map((dr) => {
            const active = dateRange === dr.id;
            return (
              <button
                key={dr.id}
                type="button"
                onClick={() => {
                  void triggerHapticSelection();
                  setDateRange(dr.id);
                }}
                className={cn(
                  "inline-flex min-h-[36px] shrink-0 items-center rounded-xl px-3 text-xs font-semibold transition active:scale-95 cursor-pointer",
                  active
                    ? "bg-brand/15 text-accent ring-1 ring-brand/30"
                    : "bg-card text-mute ring-1 ring-line hover:text-ink hover:bg-paper",
                )}
              >
                {dr.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, venues…"
            className="h-10 w-full rounded-2xl border border-line bg-card pl-9 pr-8 text-xs font-medium text-ink outline-none placeholder:text-mute focus:border-brand focus:ring-1 focus:ring-brand"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Event Results Section */}
      {visible.length === 0 ? (
        <div className="mt-6 rounded-[28px] bg-card p-10 text-center ring-1 ring-line shadow-xs">
          <Ticket size={36} className="mx-auto text-mute" />
          <p className="font-display text-lg font-bold text-ink mt-3">No events match this filter</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-mute">
            No live events found for {effectiveCity} with selected category and dates. Try resetting filters or host your own gig.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setCategory("all");
                setDateRange("all");
                setQuery("");
              }}
              className="inline-flex min-h-[44px] items-center rounded-full bg-paper px-4 text-xs font-bold text-ink ring-1 ring-line hover:bg-card transition"
            >
              Reset Filters
            </button>
            <Link
              href="/event"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-5 text-xs font-bold text-white shadow-xs transition hover:bg-brand/90"
            >
              <Plus size={14} /> Host an Event
            </Link>
          </div>
        </div>
      ) : (
        <CalendarDragProvider>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {visible.map((event) => (
              <CalendarEventCard
                key={event.id}
                event={event}
                onSelect={(selected) => nav(selected.gatePath || `/e/${selected.id}`)}
              />
            ))}
          </div>
        </CalendarDragProvider>
      )}
    </div>
  );
}
