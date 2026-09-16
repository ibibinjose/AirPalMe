/** Timezone-aware calendar helpers. Never use UTC ISO dates for "today". */

export const DEFAULT_TZ = "Australia/Sydney";

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ;
  } catch {
    return DEFAULT_TZ;
  }
}

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: string;
};

export function zonedParts(date: Date, timeZone = deviceTimeZone()): ZonedParts {
  try {
    const fmt = new Intl.DateTimeFormat("en-AU", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    });
    const bag: Record<string, string> = {};
    for (const part of fmt.formatToParts(date)) {
      if (part.type !== "literal") bag[part.type] = part.value;
    }
    return {
      year: Number(bag.year) || date.getFullYear(),
      month: Number(bag.month) || date.getMonth() + 1,
      day: Number(bag.day) || date.getDate(),
      hour: Number(bag.hour),
      minute: Number(bag.minute),
      weekday: bag.weekday || "",
    };
  } catch {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      weekday: "",
    };
  }
}

export function toZonedDateStr(date: Date, timeZone?: string): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** 0 = Sunday … 6 = Saturday in the given zone. */
export function zonedWeekdayIndex(date: Date, timeZone?: string): number {
  const name = zonedParts(date, timeZone).weekday.slice(0, 3);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[name] ?? date.getDay();
}

export function minutesOfDay(date: Date, timeZone?: string): number {
  const p = zonedParts(date, timeZone);
  return p.hour * 60 + p.minute;
}

export function formatLocalTime(date: Date, timeZone?: string): string {
  try {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone });
  } catch {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
}

export function formatLocalDay(date: Date, timeZone?: string): string {
  try {
    return date.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", timeZone });
  } catch {
    return date.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
  }
}
