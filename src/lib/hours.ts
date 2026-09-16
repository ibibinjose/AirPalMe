import { minutesOfDay, zonedWeekdayIndex } from "./local-time";

export type HoursWindow = {
  start: number;
  end: number;
  days?: number[];
};

function clockToMinutes(hour: number, minute: number, ap?: string): number {
  if (ap) {
    const a = ap.toLowerCase();
    if (a === "am") return (hour % 12) * 60 + minute;
    return ((hour % 12) + 12) * 60 + minute;
  }
  return hour * 60 + minute;
}

function parseClock(token: string): number | null {
  const raw = token.trim();
  const ampm = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (ampm) return clockToMinutes(Number(ampm[1]), Number(ampm[2] || 0), ampm[3]);
  const h24 = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) return clockToMinutes(Number(h24[1]), Number(h24[2]));
  return null;
}

function daysFromText(text: string): number[] | undefined {
  const s = text.toLowerCase();
  if (/sat\s*[–—-]\s*sun|weekend/.test(s)) return [6, 0];
  if (/mon\s*[–—-]\s*fri|weekday/.test(s)) return [1, 2, 3, 4, 5];
  const named: Record<string, number> = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  };
  const hits = Object.keys(named).filter((k) => new RegExp(`\\b${k}\\b`).test(s));
  if (hits.length) return hits.map((k) => named[k]);
  return undefined;
}

/** Parse a free-text hours string into a minute window. */
export function parseHoursWindow(hours: string): HoursWindow | "always" | "unknown" {
  const s = hours.trim();
  if (!s) return "unknown";
  const lower = s.toLowerCase();
  if (/24\s*hours|always open|^open$/.test(lower)) return "always";

  const days = daysFromText(lower);
  const clocks = Array.from(s.matchAll(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi))
    .map((m) => parseClock(m[1] || ""))
    .filter((n): n is number => n !== null);

  if (clocks.length >= 1) {
    const start = clocks[0]!;
    let end = clocks[1];
    if (end == null) {
      if (/late|midnight/.test(lower)) end = 24 * 60 + 30;
      else if (/from\b/.test(lower)) end = Math.min(24 * 60, start + 4 * 60);
      else end = start + 3 * 60;
    }
    return { start, end, days };
  }

  if (/dinner/.test(lower)) return { start: 17 * 60, end: 22 * 60, days };
  if (/lunch/.test(lower)) return { start: 11 * 60 + 30, end: 15 * 60, days };
  if (/afternoon/.test(lower)) return { start: 12 * 60, end: 17 * 60, days };
  return "unknown";
}

/**
 * Whether a venue is open at `now` in `timeZone`.
 * Returns null when hours cannot be interpreted (do not guess).
 */
export function isOpenAt(hours: string | undefined, now: Date, timeZone: string): boolean | null {
  if (!hours) return null;
  const window = parseHoursWindow(hours);
  if (window === "always") return true;
  if (window === "unknown") return null;
  const day = zonedWeekdayIndex(now, timeZone);
  if (window.days && !window.days.includes(day)) return false;
  const mins = minutesOfDay(now, timeZone);
  if (window.end <= window.start) return mins >= window.start || mins < window.end;
  return mins >= window.start && mins < window.end;
}
