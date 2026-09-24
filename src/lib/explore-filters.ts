/** B1 — Explore When/Price filters as pure, testable helpers. */

export type ExploreWhen = "any" | "today" | "weekend" | "next-week";
export type ExplorePrice = "any" | "Free" | "$" | "$$" | "$$$";

export const EXPLORE_WHEN_OPTIONS: Array<{ id: ExploreWhen; label: string }> = [
  { id: "any", label: "Any time" },
  { id: "today", label: "Today" },
  { id: "weekend", label: "This weekend" },
  { id: "next-week", label: "Next week" },
];

export const EXPLORE_PRICE_OPTIONS: Array<{ id: ExplorePrice; label: string }> = [
  { id: "any", label: "Any" },
  { id: "Free", label: "Free" },
  { id: "$", label: "$" },
  { id: "$$", label: "$$" },
  { id: "$$$", label: "$$$" },
];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDay(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Saturday/Sunday of the current week for a zoned `today` (YYYY-MM-DD). */
export function weekendDates(todayStr: string): string[] {
  const base = parseDay(todayStr);
  if (!base) return [];
  const dow = base.getDay(); // 0 Sun … 6 Sat
  const saturday = new Date(base);
  saturday.setDate(base.getDate() + ((6 - dow + 7) % 7));
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + (dow === 0 ? 0 : 1));
  if (dow === 0) {
    // Today is Sunday: this weekend = yesterday (Sat) + today.
    const sat = new Date(base);
    sat.setDate(base.getDate() - 1);
    return [toDateStr(sat), todayStr];
  }
  return [toDateStr(saturday), toDateStr(sunday)];
}

export function nextWeekDates(todayStr: string): string[] {
  const base = parseDay(todayStr);
  if (!base) return [];
  const out: string[] = [];
  for (let i = 1; i <= 7; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(toDateStr(d));
  }
  return out;
}

export function filterEventsByWhen<T extends { date: string }>(
  events: T[],
  when: ExploreWhen,
  todayStr: string,
): T[] {
  if (when === "any") return events;
  if (when === "today") return events.filter((e) => e.date === todayStr);
  if (when === "weekend") {
    const set = new Set(weekendDates(todayStr));
    return events.filter((e) => set.has(e.date));
  }
  const set = new Set(nextWeekDates(todayStr));
  return events.filter((e) => set.has(e.date));
}

/**
 * Price applies only where the place declares a `priceLevel`.
 * Undeclared places show under "Any" so the filter never invents prices.
 */
export function filterPlacesByPrice<T extends { priceLevel?: string }>(
  places: T[],
  price: ExplorePrice,
): T[] {
  if (price === "any") return places;
  return places.filter((p) => p.priceLevel === price);
}
