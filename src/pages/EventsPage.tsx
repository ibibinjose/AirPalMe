import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, CalendarDays, Plus, Search } from "lucide-react";
import { useEvents } from "@/contexts/EventsContext";
import { useLocalNow } from "@/hooks/useLocalNow";
import type { CalendarEvent } from "@shared/event";
import { recordToCalendarBase, cityMatches } from "@/lib/remote-events";
import { bucketEvent, EVENT_BUCKETS, type EventBucket } from "@/lib/events-categories";
import { CalendarEventCard } from "@/components/calendar/CalendarEventCard";
import { CalendarDragProvider } from "@/components/calendar/CalendarDragContext";
import { triggerHapticSelection } from "@/lib/native";
import { cn } from "@/lib/cn";

type BucketedEvent = { event: CalendarEvent; bucket: EventBucket };

const EMPTY_COPY: Record<EventBucket, { title: string; body: string }> = {
  places: {
    title: "No venue events yet",
    body: "Gigs, dinners and nights at local venues will show up here.",
  },
  community: {
    title: "No community events yet",
    body: "Markets, expos and public gatherings will show up here.",
  },
  friends: {
    title: "No friend events yet",
    body: "Events created by people will show up here. Hosting something?",
  },
};

/**
 * /events — every upcoming event in one place, split into Places,
 * Community and Friends. /calendar stays the month/week/day planner;
 * this page is the browse-everything feed.
 */
export function EventsPage() {
  const [, nav] = useLocation();
  const { calendarEvents, events, userStates } = useEvents();
  const { city, today } = useLocalNow();
  const effectiveCity = city && city !== "Choose a city" && city !== "Current location" ? city : "Sydney";

  const [picked, setPicked] = useState<EventBucket | null>(null);
  const [query, setQuery] = useState("");

  const upcoming = useMemo(() => {
    const seen = new Set<string>();
    const rows: BucketedEvent[] = [];
    const push = (event: CalendarEvent, bucket: EventBucket) => {
      if (seen.has(event.id)) return;
      seen.add(event.id);
      rows.push({ event, bucket });
    };
    for (const e of calendarEvents) {
      if (e.date < today) continue;
      if (!cityMatches(e.city, effectiveCity)) continue;
      push(e, bucketEvent({ source: e.source, category: e.category }));
    }
    for (const r of events) {
      if (r.status !== "live") continue;
      const base = recordToCalendarBase(r);
      if (base.date < today) continue;
      if (!cityMatches(base.city, effectiveCity)) continue;
      const st = userStates[r.id];
      push(
        {
          ...base,
          isGoing: st?.status === "going",
          isInterested: st?.status === "interested",
          isLiked: st?.liked === true,
        },
        r.hostType === "individual" ? "friends" : bucketEvent({ source: "community", category: base.category }),
      );
    }
    rows.sort((a, b) => a.event.date.localeCompare(b.event.date));
    return rows;
  }, [calendarEvents, events, userStates, today, effectiveCity]);

  const counts = useMemo(() => {
    const c: Record<EventBucket, number> = { places: 0, community: 0, friends: 0 };
    for (const row of upcoming) c[row.bucket] += 1;
    return c;
  }, [upcoming]);

  const active: EventBucket =
    picked || (["places", "community", "friends"] as const).find((b) => counts[b] > 0) || "places";

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return upcoming.filter(({ event, bucket }) => {
      if (bucket !== active) return false;
      if (!q) return true;
      return (
        event.title.toLowerCase().includes(q) ||
        event.venue?.toLowerCase().includes(q) ||
        event.city?.toLowerCase().includes(q)
      );
    });
  }, [upcoming, active, query]);

  const empty = EMPTY_COPY[active];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 md:px-6">
      <header className="pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Events</p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-ink">Events in {effectiveCity}</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
          Every upcoming event in one feed — at places, in the community, or from friends.
        </p>
      </header>

      <div className="no-scrollbar mt-5 flex items-center gap-2 overflow-x-auto pb-1">
        <div role="group" aria-label="Event categories" className="flex shrink-0 items-center gap-2">
          {EVENT_BUCKETS.map((b) => {
            const on = active === b.id;
            return (
              <button
                key={b.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  void triggerHapticSelection();
                  setPicked(b.id);
                }}
                className={cn(
                  "flex h-11 shrink-0 touch-manipulation items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-95",
                  on ? "bg-brand text-white shadow-xs" : "bg-card text-mute ring-1 ring-line hover:text-ink",
                )}
              >
                <span className="whitespace-nowrap">{b.label}</span>
                {counts[b.id] > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      on ? "bg-white/20 text-white" : "bg-paper text-mute ring-1 ring-line",
                    )}
                  >
                    {counts[b.id]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <Link
          href="/calendar"
          className="inline-flex h-11 shrink-0 touch-manipulation items-center gap-1.5 rounded-full bg-card px-4 text-xs font-bold text-ink ring-1 ring-line transition-colors hover:bg-paper"
        >
          <CalendarDays size={14} className="text-brand" />
          Calendar view
        </Link>
        <Link
          href="/event"
          className="inline-flex h-11 shrink-0 touch-manipulation items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-brand-ink"
        >
          <Plus size={14} />
          Host an event
        </Link>
        <label className="relative block w-56 shrink-0 sm:ml-auto sm:w-64">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
          <span className="sr-only">Search events</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, venue, city…"
            className="h-11 w-full rounded-full border border-line bg-card pl-10 pr-4 text-base text-ink outline-none placeholder:text-mute focus:border-brand sm:text-sm"
          />
        </label>
      </div>

      <p className="mt-3 text-xs text-mute">{EVENT_BUCKETS.find((b) => b.id === active)?.blurb}</p>

      {visible.length === 0 ? (
        <div className="mt-4 rounded-[28px] bg-card p-8 text-center ring-1 ring-line">
          <p className="font-display text-xl font-bold text-ink">{empty.title}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-mute">{empty.body}</p>
          {active === "friends" && (
            <button
              type="button"
              onClick={() => nav("/event")}
              className="mt-4 inline-flex min-h-[44px] touch-manipulation items-center gap-1.5 rounded-full bg-brand px-5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-brand-ink"
            >
              Host an event <ArrowRight size={15} />
            </button>
          )}
        </div>
      ) : (
        <CalendarDragProvider>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {visible.map(({ event }) => (
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
