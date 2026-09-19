import type { CalendarEvent, CalendarEventCategory } from "@shared/event";
import { deviceLocale } from "./local-time";

export type CalendarFilter = "all" | "going" | "interested" | "liked" | "local" | "weekend" | "free";
export type CalendarViewMode = "month" | "week" | "day" | "list";

export type MonthDayCell = {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  events: CalendarEvent[];
  hasGoing: boolean;
  hasInterested: boolean;
  hasLiked: boolean;
  hasLocal: boolean;
};

export type CalendarTagMode = "category" | "booking";

export type EventColorTheme = {
  label: string;
  shortTag: string;
  badgeClass: string;
  tagClass: string;
  dotClass: string;
  borderClass: string;
  textClass: string;
  /** Soft tinted block for unselected filter rows. */
  blockClass: string;
  /** Solid block for the selected filter row (white text). */
  blockActiveClass: string;
  /** Tinted count pill for unselected filter rows. */
  countClass: string;
};

export const CATEGORY_THEMES: Record<CalendarEventCategory, EventColorTheme> = {
  market: {
    label: "Market",
    shortTag: "Market",
    badgeClass: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    tagClass:
      "bg-emerald-100/80 text-emerald-950 border-l-2 border-l-emerald-600 ring-1 ring-emerald-300/70 hover:bg-emerald-200/90",
    dotClass: "bg-emerald-500",
    borderClass: "border-l-emerald-500",
    textClass: "text-emerald-950",
    blockClass: "bg-emerald-500/10 ring-1 ring-emerald-500/40 hover:bg-emerald-500/20",
    blockActiveClass: "bg-emerald-600 text-white font-semibold",
    countClass: "bg-emerald-600/15 text-emerald-900 ring-1 ring-emerald-600/25",
  },
  music: {
    label: "Live Music",
    shortTag: "Music",
    badgeClass: "bg-violet-50 text-violet-800 ring-violet-200",
    tagClass:
      "bg-violet-100/80 text-violet-950 border-l-2 border-l-violet-600 ring-1 ring-violet-300/70 hover:bg-violet-200/90",
    dotClass: "bg-violet-500",
    borderClass: "border-l-violet-500",
    textClass: "text-violet-950",
    blockClass: "bg-violet-500/10 ring-1 ring-violet-500/40 hover:bg-violet-500/20",
    blockActiveClass: "bg-violet-600 text-white font-semibold",
    countClass: "bg-violet-600/15 text-violet-900 ring-1 ring-violet-600/25",
  },
  food: {
    label: "Food & Drinks",
    shortTag: "Food",
    badgeClass: "bg-amber-50 text-amber-900 ring-amber-200",
    tagClass:
      "bg-amber-100/80 text-amber-950 border-l-2 border-l-amber-600 ring-1 ring-amber-300/70 hover:bg-amber-200/90",
    dotClass: "bg-amber-500",
    borderClass: "border-l-amber-500",
    textClass: "text-amber-950",
    blockClass: "bg-amber-500/10 ring-1 ring-amber-500/40 hover:bg-amber-500/20",
    blockActiveClass: "bg-amber-600 text-white font-semibold",
    countClass: "bg-amber-600/15 text-amber-900 ring-1 ring-amber-600/25",
  },
  culture: {
    label: "Culture & Tours",
    shortTag: "Culture",
    badgeClass: "bg-sky-50 text-sky-800 ring-sky-200",
    tagClass: "bg-sky-100/80 text-sky-950 border-l-2 border-l-sky-600 ring-1 ring-sky-300/70 hover:bg-sky-200/90",
    dotClass: "bg-sky-500",
    borderClass: "border-l-sky-500",
    textClass: "text-sky-950",
    blockClass: "bg-sky-500/10 ring-1 ring-sky-500/40 hover:bg-sky-500/20",
    blockActiveClass: "bg-sky-600 text-white font-semibold",
    countClass: "bg-sky-600/15 text-sky-900 ring-1 ring-sky-600/25",
  },
  community: {
    label: "Community",
    shortTag: "Community",
    badgeClass: "bg-teal-50 text-teal-800 ring-teal-200",
    tagClass: "bg-teal-100/80 text-teal-950 border-l-2 border-l-teal-600 ring-1 ring-teal-300/70 hover:bg-teal-200/90",
    dotClass: "bg-teal-500",
    borderClass: "border-l-teal-500",
    textClass: "text-teal-950",
    blockClass: "bg-teal-500/10 ring-1 ring-teal-500/40 hover:bg-teal-500/20",
    blockActiveClass: "bg-teal-600 text-white font-semibold",
    countClass: "bg-teal-600/15 text-teal-900 ring-1 ring-teal-600/25",
  },
  expo: {
    label: "Expo & Show",
    shortTag: "Expo",
    badgeClass: "bg-indigo-50 text-indigo-800 ring-indigo-200",
    tagClass:
      "bg-indigo-100/80 text-indigo-950 border-l-2 border-l-indigo-600 ring-1 ring-indigo-300/70 hover:bg-indigo-200/90",
    dotClass: "bg-indigo-500",
    borderClass: "border-l-indigo-500",
    textClass: "text-indigo-950",
    blockClass: "bg-indigo-500/10 ring-1 ring-indigo-500/40 hover:bg-indigo-500/20",
    blockActiveClass: "bg-indigo-600 text-white font-semibold",
    countClass: "bg-indigo-600/15 text-indigo-900 ring-1 ring-indigo-600/25",
  },
  workshop: {
    label: "Workshop",
    shortTag: "Workshop",
    badgeClass: "bg-rose-50 text-rose-800 ring-rose-200",
    tagClass: "bg-rose-100/80 text-rose-950 border-l-2 border-l-rose-600 ring-1 ring-rose-300/70 hover:bg-rose-200/90",
    dotClass: "bg-rose-500",
    borderClass: "border-l-rose-500",
    textClass: "text-rose-950",
    blockClass: "bg-rose-500/10 ring-1 ring-rose-500/40 hover:bg-rose-500/20",
    blockActiveClass: "bg-rose-600 text-white font-semibold",
    countClass: "bg-rose-600/15 text-rose-900 ring-1 ring-rose-600/25",
  },
};

export type BookingStatusType = "booked" | "tentative" | "rescheduled" | "explore";

export const BOOKING_THEMES: Record<BookingStatusType, EventColorTheme> = {
  booked: {
    label: "Confirmed Booking",
    shortTag: "Booked",
    badgeClass: "bg-emerald-100 text-emerald-800 ring-emerald-300",
    tagClass:
      "bg-emerald-100/90 text-emerald-950 border-l-2 border-l-emerald-600 ring-1 ring-emerald-300/80 hover:bg-emerald-200/90",
    dotClass: "bg-emerald-500",
    borderClass: "border-l-emerald-600",
    textClass: "text-emerald-950",
    blockClass: "bg-emerald-500/10 ring-1 ring-emerald-500/40 hover:bg-emerald-500/20",
    blockActiveClass: "bg-emerald-600 text-white font-semibold",
    countClass: "bg-emerald-600/15 text-emerald-900 ring-1 ring-emerald-600/25",
  },
  tentative: {
    label: "Interested / Saved",
    shortTag: "Interested",
    badgeClass: "bg-amber-100 text-amber-900 ring-amber-300",
    tagClass:
      "bg-amber-100/90 text-amber-950 border-l-2 border-l-amber-600 ring-1 ring-amber-300/80 hover:bg-amber-200/90",
    dotClass: "bg-amber-500",
    borderClass: "border-l-amber-600",
    textClass: "text-amber-950",
    blockClass: "bg-amber-500/10 ring-1 ring-amber-500/40 hover:bg-amber-500/20",
    blockActiveClass: "bg-amber-600 text-white font-semibold",
    countClass: "bg-amber-600/15 text-amber-900 ring-1 ring-amber-600/25",
  },
  rescheduled: {
    label: "Rescheduled",
    shortTag: "Moved",
    badgeClass: "bg-orange-100 text-orange-950 ring-orange-300",
    tagClass:
      "bg-orange-100/90 text-orange-950 border-l-2 border-l-orange-600 ring-1 ring-orange-300/80 hover:bg-orange-200/90",
    dotClass: "bg-orange-500",
    borderClass: "border-l-orange-600",
    textClass: "text-orange-950",
    blockClass: "bg-orange-500/10 ring-1 ring-orange-500/40 hover:bg-orange-500/20",
    blockActiveClass: "bg-orange-600 text-white font-semibold",
    countClass: "bg-orange-600/15 text-orange-900 ring-1 ring-orange-600/25",
  },
  explore: {
    label: "Available / Explore",
    shortTag: "Explore",
    badgeClass: "bg-slate-100 text-slate-800 ring-slate-200",
    tagClass:
      "bg-slate-100/90 text-slate-900 border-l-2 border-l-slate-500 ring-1 ring-slate-300/70 hover:bg-slate-200/80",
    dotClass: "bg-slate-500",
    borderClass: "border-l-slate-500",
    textClass: "text-slate-900",
    blockClass: "bg-slate-500/10 ring-1 ring-slate-500/40 hover:bg-slate-500/20",
    blockActiveClass: "bg-slate-600 text-white font-semibold",
    countClass: "bg-slate-600/15 text-slate-900 ring-1 ring-slate-600/25",
  },
};

export function getEventBookingStatus(event: CalendarEvent): BookingStatusType {
  if (event.isRescheduled) return "rescheduled";
  if (event.isGoing) return "booked";
  if (event.isInterested) return "tentative";
  return "explore";
}

export function getEventSlotTagTheme(event: CalendarEvent, mode: CalendarTagMode = "category"): EventColorTheme {
  if (mode === "booking") {
    const status = getEventBookingStatus(event);
    return BOOKING_THEMES[status];
  }
  return CATEGORY_THEMES[event.category] || CATEGORY_THEMES.market;
}

export function isWeekendDay(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

export function isFreeAdmission(ticketPrice?: string): boolean {
  if (!ticketPrice) return true;
  const lower = ticketPrice.toLowerCase().trim();
  return (
    lower === "free" ||
    lower.includes("free entry") ||
    lower.includes("free admission") ||
    lower === "$0" ||
    lower === "0" ||
    lower === "free!"
  );
}

export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * First-of-month the calendar should open on: the month holding the nearest
 * upcoming event (so a stale hardcoded month never strands users on an empty
 * grid), else the latest event month, else the current month.
 */
export function initialMonthFor(events: Array<{ date: string }>, todayStr: string): Date {
  const upcoming = events
    .map((e) => e.date)
    .filter((d) => d >= todayStr)
    .sort();
  const anchor = upcoming[0] ?? [...events.map((e) => e.date)].sort().pop() ?? todayStr;
  return new Date(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)) - 1, 1);
}

/**
 * Format an event clock time for display.
 * Prefer the wall-clock embedded in the ISO string (with its offset) so CI
 * (UTC) and local machines show the same guest-facing time. Fall back to
 * Australia/Sydney when no offset is present.
 */
export function formatTime(isoString: string): string {
  try {
    const wall = isoString.match(/T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/i);
    if (wall) {
      const hours = Number(wall[1]);
      const minutes = Number(wall[2]);
      const utc = new Date(Date.UTC(2020, 0, 1, hours, minutes));
      return new Intl.DateTimeFormat(deviceLocale(), {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
      }).format(utc);
    }
    const d = new Date(isoString);
    return new Intl.DateTimeFormat(deviceLocale(), {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Australia/Sydney",
    }).format(d);
  } catch {
    return "";
  }
}

export function formatEventTimeRange(startsAt: string, endsAt: string): string {
  const start = formatTime(startsAt);
  const end = formatTime(endsAt);
  if (!start) return "";
  if (!end || start === end) return start;
  return `${start} – ${end}`;
}

/**
 * Shift an event's startsAt and endsAt ISO timestamps to target a new date string (YYYY-MM-DD),
 * preserving original time-of-day, timezone offset, and event duration.
 */
export function computeRescheduledTimes(
  startsAt: string,
  endsAt: string,
  newDateStr: string,
): { startsAt: string; endsAt: string; timeLabel: string } {
  const startMatch = startsAt.match(/T(\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)/);
  const startTimePart = startMatch ? startMatch[1] : "09:00:00+10:00";
  const newStartsAt = `${newDateStr}T${startTimePart}`;

  let newEndsAt = "";
  if (endsAt) {
    const endMatch = endsAt.match(/T(\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)/);
    if (endMatch) {
      newEndsAt = `${newDateStr}T${endMatch[1]}`;
    } else {
      const origDuration = new Date(endsAt).getTime() - new Date(startsAt).getTime();
      const baseMs = new Date(newStartsAt).getTime();
      newEndsAt = new Date(baseMs + (origDuration > 0 ? origDuration : 3600000)).toISOString();
    }
  } else {
    // Default 2-hour duration if none specified
    const baseMs = new Date(newStartsAt).getTime();
    newEndsAt = new Date(baseMs + 7200000).toISOString();
  }

  const timeLabel = formatEventTimeRange(newStartsAt, newEndsAt);
  return { startsAt: newStartsAt, endsAt: newEndsAt, timeLabel };
}

export function formatRelativeBadge(dateStr: string, referenceDateStr?: string): { label: string; highlight: boolean } {
  const ref = referenceDateStr ? new Date(referenceDateStr + "T00:00:00") : new Date();
  const refStr = toDateStr(ref);
  const target = new Date(dateStr + "T00:00:00");

  const diffDays = Math.round((target.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));

  if (dateStr === refStr) return { label: "Today", highlight: true };
  if (diffDays === 1) return { label: "Tomorrow", highlight: true };
  if (diffDays > 1 && diffDays <= 6) {
    const weekday = new Intl.DateTimeFormat(deviceLocale(), { weekday: "short" }).format(target);
    return { label: `This ${weekday}`, highlight: false };
  }
  const formatted = new Intl.DateTimeFormat(deviceLocale(), {
    month: "short",
    day: "numeric",
  }).format(target);
  return { label: formatted, highlight: false };
}

export function getMonthGrid(
  year: number,
  month: number,
  events: CalendarEvent[],
  todayStr = toDateStr(new Date()),
): MonthDayCell[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Australian / ISO week starting Monday (0 = Monday, 6 = Sunday)
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const list = eventsByDate.get(ev.date) || [];
    list.push(ev);
    eventsByDate.set(ev.date, list);
  }

  const cells: MonthDayCell[] = [];

  // Previous month trailing days
  const prevMonthLastDate = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const day = prevMonthLastDate - i;
    const d = new Date(year, month - 1, day);
    const dateStr = toDateStr(d);
    const dayEvents = eventsByDate.get(dateStr) || [];
    cells.push({
      date: d,
      dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: isWeekendDay(d),
      events: dayEvents,
      hasGoing: dayEvents.some((e) => e.isGoing),
      hasInterested: dayEvents.some((e) => e.isInterested),
      hasLiked: dayEvents.some((e) => e.isLiked),
      hasLocal: dayEvents.some((e) => e.isLocal),
    });
  }

  // Current month days
  const daysInMonth = lastDay.getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dateStr = toDateStr(d);
    const dayEvents = eventsByDate.get(dateStr) || [];
    cells.push({
      date: d,
      dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isWeekend: isWeekendDay(d),
      events: dayEvents,
      hasGoing: dayEvents.some((e) => e.isGoing),
      hasInterested: dayEvents.some((e) => e.isInterested),
      hasLiked: dayEvents.some((e) => e.isLiked),
      hasLocal: dayEvents.some((e) => e.isLocal),
    });
  }

  // Next month leading days to complete grid (multiples of 7)
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let day = 1; day <= remaining; day++) {
    const d = new Date(year, month + 1, day);
    const dateStr = toDateStr(d);
    const dayEvents = eventsByDate.get(dateStr) || [];
    cells.push({
      date: d,
      dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: isWeekendDay(d),
      events: dayEvents,
      hasGoing: dayEvents.some((e) => e.isGoing),
      hasInterested: dayEvents.some((e) => e.isInterested),
      hasLiked: dayEvents.some((e) => e.isLiked),
      hasLocal: dayEvents.some((e) => e.isLocal),
    });
  }

  return cells;
}

/**
 * Returns the 7 days of the week containing the base date (Monday to Sunday).
 */
export function getWeekDays(baseDate: Date, events: CalendarEvent[]): MonthDayCell[] {
  const current = new Date(baseDate);
  current.setHours(0, 0, 0, 0);
  const dayOfWeek = (current.getDay() + 6) % 7; // 0 = Monday, 6 = Sunday
  const monday = new Date(current);
  monday.setDate(current.getDate() - dayOfWeek);

  const todayStr = toDateStr(new Date());
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const list = eventsByDate.get(ev.date) || [];
    list.push(ev);
    eventsByDate.set(ev.date, list);
  }

  const cells: MonthDayCell[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = toDateStr(d);
    const dayEvents = (eventsByDate.get(dateStr) || []).sort((a, b) => a.startsAt.localeCompare(b.startsAt));

    cells.push({
      date: d,
      dateStr,
      dayNumber: d.getDate(),
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isWeekend: isWeekendDay(d),
      events: dayEvents,
      hasGoing: dayEvents.some((e) => e.isGoing),
      hasInterested: dayEvents.some((e) => e.isInterested),
      hasLiked: dayEvents.some((e) => e.isLiked),
      hasLocal: dayEvents.some((e) => e.isLocal),
    });
  }

  return cells;
}

export type EventDateGroup = {
  dateStr: string;
  displayDate: string;
  dayBadge: string;
  isToday: boolean;
  events: CalendarEvent[];
};

export function groupEventsByDate(events: CalendarEvent[]): EventDateGroup[] {
  const todayStr = toDateStr(new Date());
  const sorted = [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const groupsMap = new Map<string, CalendarEvent[]>();

  for (const ev of sorted) {
    const list = groupsMap.get(ev.date) || [];
    list.push(ev);
    groupsMap.set(ev.date, list);
  }

  const groups: EventDateGroup[] = [];
  for (const [dateStr, evList] of Array.from(groupsMap.entries())) {
    const target = new Date(dateStr + "T00:00:00");
    const displayDate = new Intl.DateTimeFormat(deviceLocale(), {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(target);

    const rel = formatRelativeBadge(dateStr, todayStr);
    groups.push({
      dateStr,
      displayDate,
      dayBadge: rel.label,
      isToday: dateStr === todayStr,
      events: evList,
    });
  }

  return groups;
}

/**
 * Checks if an event falls on the upcoming weekend (Saturday or Sunday)
 */
export function isThisWeekend(dateStr: string, refDate = new Date()): boolean {
  try {
    const target = new Date(dateStr + "T00:00:00");
    const dayOfWeek = target.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) return false;

    // Determine upcoming Saturday date
    const today = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
    const todayDay = today.getDay();
    const daysToSat = (6 - todayDay + 7) % 7;
    const sat = new Date(today);
    sat.setDate(today.getDate() + daysToSat);
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);

    const satStr = toDateStr(sat);
    const sunStr = toDateStr(sun);

    return dateStr === satStr || dateStr === sunStr;
  } catch {
    return false;
  }
}

export const CALENDAR_CATEGORIES: Array<{ id: "all" | CalendarEventCategory; label: string; shortTag: string }> = [
  { id: "all", label: "All Categories", shortTag: "All" },
  { id: "market", label: "Markets", shortTag: "Market" },
  { id: "music", label: "Live Music", shortTag: "Music" },
  { id: "food", label: "Food & Drinks", shortTag: "Food" },
  { id: "culture", label: "Culture & Tours", shortTag: "Culture" },
  { id: "workshop", label: "Workshops", shortTag: "Workshop" },
  { id: "community", label: "Community", shortTag: "Community" },
  { id: "expo", label: "Expos & Shows", shortTag: "Expo" },
];

/**
 * Collects and ranks unique tags across events by frequency.
 */
export function getAllEventTags(events: CalendarEvent[]): string[] {
  const counts = new Map<string, number>();
  for (const ev of events) {
    if (ev.tags && Array.isArray(ev.tags)) {
      for (const t of ev.tags) {
        const clean = t.trim();
        if (clean) {
          counts.set(clean, (counts.get(clean) || 0) + 1);
        }
      }
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
}

export function filterCalendarEvents(
  events: CalendarEvent[],
  filter: CalendarFilter,
  searchQuery = "",
  category: "all" | CalendarEventCategory = "all",
  selectedDate?: string,
): CalendarEvent[] {
  return events.filter((ev) => {
    // Attendance/Interest filter
    if (filter === "going" && !ev.isGoing) return false;
    if (filter === "interested" && !ev.isInterested) return false;
    if (filter === "liked" && !ev.isLiked) return false;
    if (filter === "local" && !ev.isLocal) return false;
    if (filter === "weekend") {
      const d = new Date(ev.date + "T00:00:00");
      if (!isWeekendDay(d)) return false;
    }
    if (filter === "free" && !isFreeAdmission(ev.ticketPrice)) return false;

    // Date filter
    if (selectedDate && ev.date !== selectedDate) return false;

    // Category filter
    if (category !== "all" && ev.category !== category) return false;

    // Search query matching title, tags, venue, category, description
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const cleanQ = q.replace(/^#/, "");

      const matchTitle = ev.title.toLowerCase().includes(q) || ev.title.toLowerCase().includes(cleanQ);
      const matchTags = Boolean(
        ev.tags?.some((tag) => {
          const tLower = tag.toLowerCase();
          return tLower.includes(cleanQ) || cleanQ.includes(tLower) || `#${tLower}` === q;
        }),
      );
      const matchVenue = ev.venue.toLowerCase().includes(q) || ev.venue.toLowerCase().includes(cleanQ);
      const matchDesc = ev.description.toLowerCase().includes(q);
      const matchCity = ev.city.toLowerCase().includes(q);
      const matchCat =
        ev.categoryLabel.toLowerCase().includes(q) ||
        ev.category.toLowerCase() === cleanQ ||
        ev.categoryLabel.toLowerCase().includes(cleanQ);

      if (!matchTitle && !matchTags && !matchVenue && !matchDesc && !matchCity && !matchCat) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Maximum number of scheduled events before a day slot is considered fully booked.
 */
export const MAX_EVENTS_PER_SLOT = 4;

/**
 * Checks if two events or timestamps have an overlapping time interval.
 */
export function areTimeIntervalsOverlapping(
  startA: string | Date | number,
  endA: string | Date | number,
  startB: string | Date | number,
  endB: string | Date | number,
): boolean {
  const sA = new Date(startA).getTime();
  const eA = new Date(endA).getTime();
  const sB = new Date(startB).getTime();
  const eB = new Date(endB).getTime();

  if (isNaN(sA) || isNaN(eA) || isNaN(sB) || isNaN(eB)) return false;
  // Overlaps if Event A starts before Event B ends AND Event A ends after Event B starts
  return sA < eB && eA > sB;
}

export interface NearestOpeningSlot {
  dateStr: string;
  diffDays: number;
  formattedDate: string;
  dayBadge: string;
}

export interface SlotCollisionResult {
  hasCollision: boolean;
  isOverlapping: boolean;
  isFullyBooked: boolean;
  conflictingEvents: CalendarEvent[];
  overlappingEvents: CalendarEvent[];
  reason: string;
  nearestOpening: NearestOpeningSlot | null;
}

/**
 * Searches for the nearest available date opening without time overlap or capacity overflow.
 */
export function findNearestAvailableOpening(
  eventToMove: CalendarEvent,
  fromDateStr: string,
  allEvents: CalendarEvent[],
  referenceDateStr?: string,
): NearestOpeningSlot | null {
  const baseDate = new Date(fromDateStr + "T00:00:00");
  const refDate = referenceDateStr ? new Date(referenceDateStr + "T00:00:00") : new Date();
  const refDateStr = toDateStr(refDate);

  // Search nearby candidate days (+1, -1, +2, -2, up to 30 days)
  const candidateOffsets: number[] = [];
  for (let offset = 1; offset <= 30; offset++) {
    candidateOffsets.push(offset);
    candidateOffsets.push(-offset);
  }

  for (const offset of candidateOffsets) {
    const candidate = new Date(baseDate);
    candidate.setDate(baseDate.getDate() + offset);
    const candidateStr = toDateStr(candidate);

    // Skip dates that are in the past if the target was today or future
    if (candidateStr < refDateStr && fromDateStr >= refDateStr) {
      continue;
    }

    const eventsOnCandidate = allEvents.filter((e) => e.date === candidateStr && e.id !== eventToMove.id);

    if (eventsOnCandidate.length >= MAX_EVENTS_PER_SLOT) {
      continue;
    }

    const projected = computeRescheduledTimes(eventToMove.startsAt, eventToMove.endsAt, candidateStr);

    const hasOverlap = eventsOnCandidate.some((other) =>
      areTimeIntervalsOverlapping(projected.startsAt, projected.endsAt, other.startsAt, other.endsAt),
    );

    if (!hasOverlap) {
      const rel = formatRelativeBadge(candidateStr, referenceDateStr);
      const weekday = new Intl.DateTimeFormat(deviceLocale(), { weekday: "short" }).format(candidate);
      const monthDay = new Intl.DateTimeFormat(deviceLocale(), { month: "short", day: "numeric" }).format(candidate);
      return {
        dateStr: candidateStr,
        diffDays: offset,
        formattedDate: `${weekday}, ${monthDay}`,
        dayBadge: rel.label,
      };
    }
  }

  return null;
}

/**
 * Checks whether scheduling an event into targetDateStr causes a collision
 * (either direct time overlap with another event or slot capacity overflow).
 */
export function checkSlotCollision(
  eventToMove: CalendarEvent,
  targetDateStr: string,
  allEvents: CalendarEvent[],
  referenceDateStr?: string,
): SlotCollisionResult {
  const otherEventsOnTarget = allEvents.filter((e) => e.date === targetDateStr && e.id !== eventToMove.id);

  const projected = computeRescheduledTimes(eventToMove.startsAt, eventToMove.endsAt, targetDateStr);

  const overlappingEvents = otherEventsOnTarget.filter((other) =>
    areTimeIntervalsOverlapping(projected.startsAt, projected.endsAt, other.startsAt, other.endsAt),
  );

  const isFullyBooked = otherEventsOnTarget.length >= MAX_EVENTS_PER_SLOT;
  const isOverlapping = overlappingEvents.length > 0;
  const hasCollision = isOverlapping || isFullyBooked;

  let reason = "";
  if (isOverlapping && isFullyBooked) {
    reason = `Slot is fully booked (${otherEventsOnTarget.length} events) and time overlaps with "${overlappingEvents[0]?.title}"`;
  } else if (isOverlapping) {
    const titles = overlappingEvents.map((e) => `"${e.title}"`).join(", ");
    reason = `Time overlap (${projected.timeLabel}) with ${titles}`;
  } else if (isFullyBooked) {
    reason = `Slot is fully booked with ${otherEventsOnTarget.length} scheduled events`;
  }

  const nearestOpening = hasCollision
    ? findNearestAvailableOpening(eventToMove, targetDateStr, allEvents, referenceDateStr)
    : null;

  return {
    hasCollision,
    isOverlapping,
    isFullyBooked,
    conflictingEvents: isOverlapping ? overlappingEvents : otherEventsOnTarget,
    overlappingEvents,
    reason,
    nearestOpening,
  };
}

/**
 * Calculates estimated walking distance and time from The Rocks / stay origin
 */
export function estimateWalkFromRocks(venueName: string): { label: string; minutes: number } {
  const v = venueName.toLowerCase();
  if (v.includes("playfair") || v.includes("argyle") || v.includes("george st")) {
    return { label: "1–3 min walk · In The Rocks", minutes: 2 };
  }
  if (v.includes("campbells cove") || v.includes("hickson") || v.includes("overseas passenger")) {
    return { label: "4–6 min walk · Waterfront", minutes: 5 };
  }
  if (v.includes("circular quay") || v.includes("wharf") || v.includes("first fleet")) {
    return { label: "5–8 min walk · Circular Quay", minutes: 6 };
  }
  if (v.includes("opera house") || v.includes("bennelong") || v.includes("botanic")) {
    return { label: "12–15 min scenic stroll", minutes: 14 };
  }
  if (v.includes("barangaroo") || v.includes("walsh bay") || v.includes("pier")) {
    return { label: "8–12 min walk · Barangaroo", minutes: 10 };
  }
  return { label: "Under 15 min from Stay", minutes: 12 };
}
