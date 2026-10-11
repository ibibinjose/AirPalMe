export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type DayStatus = "open" | "closed" | "24hours";

export interface DaySchedule {
  status: DayStatus;
  openTime: string; // "09:00"
  closeTime: string; // "17:00"
  isLate?: boolean;
}

export type WeekSchedule = Record<DayKey, DaySchedule>;

export const DAYS_ORDER: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const DAY_METADATA: Record<DayKey, { name: string; short: string; abbrev: string; weekdayIndex: number }> = {
  mon: { name: "Monday", short: "Mon", abbrev: "M", weekdayIndex: 1 },
  tue: { name: "Tuesday", short: "Tue", abbrev: "T", weekdayIndex: 2 },
  wed: { name: "Wednesday", short: "Wed", abbrev: "W", weekdayIndex: 3 },
  thu: { name: "Thursday", short: "Thu", abbrev: "Th", weekdayIndex: 4 },
  fri: { name: "Friday", short: "Fri", abbrev: "F", weekdayIndex: 5 },
  sat: { name: "Saturday", short: "Sat", abbrev: "Sa", weekdayIndex: 6 },
  sun: { name: "Sunday", short: "Sun", abbrev: "Su", weekdayIndex: 0 },
};

export const WEEKDAY_INDEX_TO_KEY: Record<number, DayKey> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

export function createDefaultSchedule(): WeekSchedule {
  return {
    mon: { status: "open", openTime: "09:00", closeTime: "17:00" },
    tue: { status: "open", openTime: "09:00", closeTime: "17:00" },
    wed: { status: "open", openTime: "09:00", closeTime: "17:00" },
    thu: { status: "open", openTime: "09:00", closeTime: "17:00" },
    fri: { status: "open", openTime: "09:00", closeTime: "17:00" },
    sat: { status: "closed", openTime: "09:00", closeTime: "17:00" },
    sun: { status: "closed", openTime: "09:00", closeTime: "17:00" },
  };
}

export interface TradingHoursPreset {
  id: string;
  label: string;
  description: string;
  build: () => WeekSchedule;
}

export const TRADING_HOURS_PRESETS: TradingHoursPreset[] = [
  {
    id: "weekdays_standard",
    label: "Mon–Fri 9am–5pm",
    description: "Standard business / office hours",
    build: () => ({
      mon: { status: "open", openTime: "09:00", closeTime: "17:00" },
      tue: { status: "open", openTime: "09:00", closeTime: "17:00" },
      wed: { status: "open", openTime: "09:00", closeTime: "17:00" },
      thu: { status: "open", openTime: "09:00", closeTime: "17:00" },
      fri: { status: "open", openTime: "09:00", closeTime: "17:00" },
      sat: { status: "closed", openTime: "09:00", closeTime: "17:00" },
      sun: { status: "closed", openTime: "09:00", closeTime: "17:00" },
    }),
  },
  {
    id: "cafe_daily",
    label: "Daily 7am–4pm",
    description: "Café, bakery & breakfast spots",
    build: () => ({
      mon: { status: "open", openTime: "07:00", closeTime: "16:00" },
      tue: { status: "open", openTime: "07:00", closeTime: "16:00" },
      wed: { status: "open", openTime: "07:00", closeTime: "16:00" },
      thu: { status: "open", openTime: "07:00", closeTime: "16:00" },
      fri: { status: "open", openTime: "07:00", closeTime: "16:00" },
      sat: { status: "open", openTime: "07:00", closeTime: "16:00" },
      sun: { status: "open", openTime: "07:00", closeTime: "16:00" },
    }),
  },
  {
    id: "cafe_weekend_shift",
    label: "Mon–Fri 7am–3pm, Sat–Sun 8am–2pm",
    description: "Neighbourhood café with weekend hours",
    build: () => ({
      mon: { status: "open", openTime: "07:00", closeTime: "15:00" },
      tue: { status: "open", openTime: "07:00", closeTime: "15:00" },
      wed: { status: "open", openTime: "07:00", closeTime: "15:00" },
      thu: { status: "open", openTime: "07:00", closeTime: "15:00" },
      fri: { status: "open", openTime: "07:00", closeTime: "15:00" },
      sat: { status: "open", openTime: "08:00", closeTime: "14:00" },
      sun: { status: "open", openTime: "08:00", closeTime: "14:00" },
    }),
  },
  {
    id: "restaurant_dinner",
    label: "Tue–Sun 12pm–10pm",
    description: "Restaurant (closed Mondays)",
    build: () => ({
      mon: { status: "closed", openTime: "12:00", closeTime: "22:00" },
      tue: { status: "open", openTime: "12:00", closeTime: "22:00" },
      wed: { status: "open", openTime: "12:00", closeTime: "22:00" },
      thu: { status: "open", openTime: "12:00", closeTime: "22:00" },
      fri: { status: "open", openTime: "12:00", closeTime: "22:00" },
      sat: { status: "open", openTime: "12:00", closeTime: "22:00" },
      sun: { status: "open", openTime: "12:00", closeTime: "21:30" },
    }),
  },
  {
    id: "bar_night",
    label: "Wed–Sun 4pm–Late",
    description: "Bar, pub & nightlife",
    build: () => ({
      mon: { status: "closed", openTime: "16:00", closeTime: "00:00" },
      tue: { status: "closed", openTime: "16:00", closeTime: "00:00" },
      wed: { status: "open", openTime: "16:00", closeTime: "00:00", isLate: true },
      thu: { status: "open", openTime: "16:00", closeTime: "00:00", isLate: true },
      fri: { status: "open", openTime: "16:00", closeTime: "02:00", isLate: true },
      sat: { status: "open", openTime: "14:00", closeTime: "02:00", isLate: true },
      sun: { status: "open", openTime: "14:00", closeTime: "23:00" },
    }),
  },
  {
    id: "retail_shop",
    label: "Mon–Sat 9am–6pm, Sun 10am–4pm",
    description: "Retail store / boutique",
    build: () => ({
      mon: { status: "open", openTime: "09:00", closeTime: "18:00" },
      tue: { status: "open", openTime: "09:00", closeTime: "18:00" },
      wed: { status: "open", openTime: "09:00", closeTime: "18:00" },
      thu: { status: "open", openTime: "09:00", closeTime: "18:00" },
      fri: { status: "open", openTime: "09:00", closeTime: "18:00" },
      sat: { status: "open", openTime: "09:00", closeTime: "18:00" },
      sun: { status: "open", openTime: "10:00", closeTime: "16:00" },
    }),
  },
  {
    id: "open_24_7",
    label: "24/7 (Always Open)",
    description: "Gym, convenience store or 24h services",
    build: () => ({
      mon: { status: "24hours", openTime: "00:00", closeTime: "23:59" },
      tue: { status: "24hours", openTime: "00:00", closeTime: "23:59" },
      wed: { status: "24hours", openTime: "00:00", closeTime: "23:59" },
      thu: { status: "24hours", openTime: "00:00", closeTime: "23:59" },
      fri: { status: "24hours", openTime: "00:00", closeTime: "23:59" },
      sat: { status: "24hours", openTime: "00:00", closeTime: "23:59" },
      sun: { status: "24hours", openTime: "00:00", closeTime: "23:59" },
    }),
  },
];

/** Convert 24-hour time (e.g. "09:00", "16:30") to 12-hour display ("9:00 AM", "4:30 PM", "9am", "4:30pm") */
export function formatTime12h(timeStr: string, compact = false): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  let hour = parseInt(parts[0] || "0", 10);
  const minute = parseInt(parts[1] || "0", 10);
  if (isNaN(hour)) return timeStr;

  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;

  if (compact) {
    const minStr = minute === 0 ? "" : `:${minute.toString().padStart(2, "0")}`;
    return `${hour}${minStr}${ampm.toLowerCase()}`;
  }

  const minStr = minute.toString().padStart(2, "0");
  return `${hour}:${minStr} ${ampm}`;
}

/** Formats a single day's schedule into a concise readable string */
export function formatDayHours(day: DaySchedule, compact = false): string {
  if (day.status === "closed") return "Closed";
  if (day.status === "24hours") return compact ? "24h" : "Open 24 Hours";

  const start = formatTime12h(day.openTime, compact);
  if (day.isLate) {
    return `${start} – Late`;
  }
  const end = formatTime12h(day.closeTime, compact);
  return `${start} – ${end}`;
}

/** Check if two days have the exact same schedule */
export function areDaysEqual(a: DaySchedule, b: DaySchedule): boolean {
  if (a.status !== b.status) return false;
  if (a.status === "closed" || a.status === "24hours") return true;
  if (a.isLate && b.isLate) return a.openTime === b.openTime;
  return a.openTime === b.openTime && a.closeTime === b.closeTime && a.isLate === b.isLate;
}

/**
 * Formats a full 7-day schedule into an intelligent, collapsed summary string.
 * Examples:
 * - "Mon–Fri 9:00 AM – 5:00 PM, Sat–Sun Closed"
 * - "Daily 7:00 AM – 4:00 PM"
 * - "Mon–Thu 9:00 AM – 6:00 PM, Fri–Sat 9:00 AM – 8:00 PM, Sun 10:00 AM – 4:00 PM"
 * - "Open 24 Hours"
 */
export function format7DaySchedule(schedule: WeekSchedule, compact = false): string {
  // Check if all 7 days are identical
  const first = schedule.mon;
  const allSame = DAYS_ORDER.every((k) => areDaysEqual(schedule[k], first));
  if (allSame) {
    if (first.status === "24hours") return compact ? "24/7" : "Open 24 Hours";
    if (first.status === "closed") return "Closed";
    return `Daily ${formatDayHours(first, compact)}`;
  }

  // Group contiguous days with same schedule
  interface DayGroup {
    startDay: DayKey;
    endDay: DayKey;
    count: number;
    schedule: DaySchedule;
  }

  const groups: DayGroup[] = [];
  let currentGroup: DayGroup | null = null;

  for (const dayKey of DAYS_ORDER) {
    const daySched = schedule[dayKey];
    if (!currentGroup) {
      currentGroup = {
        startDay: dayKey,
        endDay: dayKey,
        count: 1,
        schedule: daySched,
      };
    } else if (areDaysEqual(currentGroup.schedule, daySched)) {
      currentGroup.endDay = dayKey;
      currentGroup.count += 1;
    } else {
      groups.push(currentGroup);
      currentGroup = {
        startDay: dayKey,
        endDay: dayKey,
        count: 1,
        schedule: daySched,
      };
    }
  }
  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups
    .map((g) => {
      let dayRange = DAY_METADATA[g.startDay].short;
      if (g.count > 1) {
        dayRange = `${DAY_METADATA[g.startDay].short}–${DAY_METADATA[g.endDay].short}`;
      }
      return `${dayRange} ${formatDayHours(g.schedule, compact)}`;
    })
    .join(", ");
}

/** Parses raw 24h clock string or 12h clock string like "8am", "8:00 AM", "17:30", "5pm" to "HH:MM" */
function parseTimeString(token: string): string | null {
  const raw = token.trim();
  if (!raw) return null;

  const ampm = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (ampm) {
    let hour = parseInt(ampm[1], 10);
    const minute = parseInt(ampm[2] || "0", 10);
    const ap = ampm[3].toLowerCase();
    if (ap === "pm" && hour < 12) hour += 12;
    if (ap === "am" && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  }

  const h24 = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) {
    const hour = parseInt(h24[1], 10);
    const minute = parseInt(h24[2], 10);
    if (hour >= 0 && hour <= 24 && minute >= 0 && minute <= 59) {
      return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    }
  }

  return null;
}

const DAY_NAME_TO_KEY: Record<string, DayKey> = {
  monday: "mon",
  mon: "mon",
  tuesday: "tue",
  tue: "tue",
  wednesday: "wed",
  wed: "wed",
  thursday: "thu",
  thu: "thu",
  friday: "fri",
  fri: "fri",
  saturday: "sat",
  sat: "sat",
  sunday: "sun",
  sun: "sun",
};

function getDayKeyFromToken(token: string): DayKey | null {
  const clean = token.toLowerCase().replace(/[^a-z]/g, "");
  return DAY_NAME_TO_KEY[clean] || null;
}

/**
 * Parses any existing freeform or structured hours string back into a full 7-day schedule.
 * Handles:
 * - Google Places: "Monday: 8:00 AM – 5:00 PM; Tuesday: 8:00 AM – 5:00 PM..."
 * - Standard ranges: "Mon–Fri 9:00 AM – 5:00 PM, Sat 10:00 AM – 2:00 PM, Sun Closed"
 * - Simple strings: "8am–5pm", "Daily 7am–10pm", "24 Hours"
 */
export function parseHoursTo7DaySchedule(raw: string): WeekSchedule {
  if (!raw || !raw.trim()) return createDefaultSchedule();

  const s = raw.trim();
  const lower = s.toLowerCase();

  // 24 Hours check
  if (/24\s*hours|always open|^open$|^24\/7$/.test(lower)) {
    const schedule = createDefaultSchedule();
    for (const key of DAYS_ORDER) {
      schedule[key] = { status: "24hours", openTime: "00:00", closeTime: "23:59" };
    }
    return schedule;
  }

  const hasSpecificDays =
    /\b(mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday|sun|sunday|weekday|weekend)\b/i.test(
      lower,
    ) && !/daily|everyday|every day|7 days|mon\s*[–-]\s*sun/i.test(lower);

  const schedule: WeekSchedule = hasSpecificDays
    ? {
        mon: { status: "closed", openTime: "09:00", closeTime: "17:00" },
        tue: { status: "closed", openTime: "09:00", closeTime: "17:00" },
        wed: { status: "closed", openTime: "09:00", closeTime: "17:00" },
        thu: { status: "closed", openTime: "09:00", closeTime: "17:00" },
        fri: { status: "closed", openTime: "09:00", closeTime: "17:00" },
        sat: { status: "closed", openTime: "09:00", closeTime: "17:00" },
        sun: { status: "closed", openTime: "09:00", closeTime: "17:00" },
      }
    : createDefaultSchedule();

  // Split by semicolon, newline, or comma (if not inside time)
  // Clean split for multiple day segments
  const segments = s
    .split(/[;\n]+/)
    .map((seg) => seg.trim())
    .filter(Boolean);

  const parsedSegments: Array<{ text: string }> = [];
  for (const seg of segments) {
    if (seg.includes(",")) {
      // Check if comma separates distinct day entries (e.g. "Mon–Fri 9am–5pm, Sat–Sun Closed")
      const subParts = seg
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      for (const sp of subParts) {
        parsedSegments.push({ text: sp });
      }
    } else {
      parsedSegments.push({ text: seg });
    }
  }

  let matchedAnyDay = false;

  for (const { text } of parsedSegments) {
    const tLower = text.toLowerCase();
    const isClosed = /closed|shut/.test(tLower);
    const is24h = /24\s*hours|24\/7|open 24/.test(tLower);
    const isLate = /late|midnight/.test(tLower);

    // Extract day range or list
    let targetDays: DayKey[] = [];

    if (/daily|everyday|every day|7 days|mon\s*[–-]\s*sun/i.test(tLower)) {
      targetDays = [...DAYS_ORDER];
    } else if (/weekday|mon\s*[–-]\s*fri/i.test(tLower)) {
      targetDays = ["mon", "tue", "wed", "thu", "fri"];
    } else if (/weekend|sat\s*[–-]\s*sun/i.test(tLower)) {
      targetDays = ["sat", "sun"];
    } else {
      // Check for range like "Mon-Thu" or "Wed-Sat"
      const rangeMatch = tLower.match(
        /\b(mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday|sun|sunday)\s*[–-]\s*(mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday|sun|sunday)\b/i,
      );
      if (rangeMatch) {
        const startKey = getDayKeyFromToken(rangeMatch[1]);
        const endKey = getDayKeyFromToken(rangeMatch[2]);
        if (startKey && endKey) {
          const startIdx = DAYS_ORDER.indexOf(startKey);
          const endIdx = DAYS_ORDER.indexOf(endKey);
          if (startIdx !== -1 && endIdx !== -1) {
            if (startIdx <= endIdx) {
              targetDays = DAYS_ORDER.slice(startIdx, endIdx + 1);
            } else {
              // Wrap around
              targetDays = [...DAYS_ORDER.slice(startIdx), ...DAYS_ORDER.slice(0, endIdx + 1)];
            }
          }
        }
      } else {
        // Individual days mentioned
        for (const k of DAYS_ORDER) {
          const name = DAY_METADATA[k].name.toLowerCase();
          const short = DAY_METADATA[k].short.toLowerCase();
          const regex = new RegExp(`\\b(${name}|${short})\\b`, "i");
          if (regex.test(tLower)) {
            targetDays.push(k);
          }
        }
      }
    }

    if (targetDays.length > 0) {
      matchedAnyDay = true;
      if (isClosed) {
        for (const d of targetDays) {
          schedule[d] = { ...schedule[d], status: "closed" };
        }
      } else if (is24h) {
        for (const d of targetDays) {
          schedule[d] = { status: "24hours", openTime: "00:00", closeTime: "23:59" };
        }
      } else {
        // Extract time strings
        const timeMatches = Array.from(text.matchAll(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi)).map((m) => m[1]);

        let openTime = "09:00";
        let closeTime = "17:00";

        if (timeMatches.length >= 1) {
          const parsedStart = parseTimeString(timeMatches[0]);
          if (parsedStart) openTime = parsedStart;
        }
        if (timeMatches.length >= 2) {
          const parsedEnd = parseTimeString(timeMatches[1]);
          if (parsedEnd) closeTime = parsedEnd;
        } else if (isLate) {
          closeTime = "00:00";
        }

        for (const d of targetDays) {
          schedule[d] = {
            status: "open",
            openTime,
            closeTime,
            isLate,
          };
        }
      }
    }
  }

  // If no day matched, check if it was a single generic time window like "8am–5pm"
  if (!matchedAnyDay) {
    const timeMatches = Array.from(s.matchAll(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi)).map((m) => m[1]);

    if (timeMatches.length >= 1) {
      const parsedStart = parseTimeString(timeMatches[0]) || "09:00";
      const parsedEnd = timeMatches.length >= 2 ? parseTimeString(timeMatches[1]) || "17:00" : "17:00";
      const isLate = /late|midnight/.test(lower);

      for (const d of DAYS_ORDER) {
        schedule[d] = {
          status: "open",
          openTime: parsedStart,
          closeTime: parsedEnd,
          isLate,
        };
      }
    }
  }

  return schedule;
}

export interface DayBreakdownItem {
  dayKey: DayKey;
  dayName: string;
  shortName: string;
  isToday: boolean;
  hoursText: string;
  status: DayStatus;
}

/**
 * Returns a clean 7-day breakdown for display, highlighting the current day.
 */
export function get7DayBreakdown(rawHours: string | undefined, currentWeekdayIndex = 1): DayBreakdownItem[] {
  const schedule = parseHoursTo7DaySchedule(rawHours || "");
  const todayKey = WEEKDAY_INDEX_TO_KEY[currentWeekdayIndex] || "mon";

  return DAYS_ORDER.map((key) => {
    const meta = DAY_METADATA[key];
    const sched = schedule[key];
    return {
      dayKey: key,
      dayName: meta.name,
      shortName: meta.short,
      isToday: key === todayKey,
      hoursText: formatDayHours(sched, false),
      status: sched.status,
    };
  });
}
