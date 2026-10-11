/**
 * Festival week programs (Spark Festival 2026 and beyond).
 *
 * A festival is a thin curated shell: the document carries the festival's own
 * identity (name, dates, city, cover, copy) while every session on the program
 * is a regular `events` document with `festivalSlug` set. Attendance,
 * calendar, tickets, and reviews all reuse the existing events engine —
 * there is no second booking or RSVP system.
 */

export type FestivalStatus = "draft" | "live" | "ended";

export interface Festival {
  /** URL slug — lowercase letters, digits, hyphens. Lives at /f/:slug. */
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  city: string;
  /** YYYY-MM-DD calendar dates in the festival timezone. */
  startDate: string;
  endDate: string;
  /** IANA timezone for day grouping. Defaults to Australia/Sydney. */
  timeZone?: string;
  venueSummary?: string;
  coverImage?: string;
  organizerName?: string;
  organizerHandle?: string;
  /** Where an organiser hosts their own session (Spark: "Host your own event"). */
  hostYourEventUrl?: string;
  /** Free-form registration note shown under the program (e.g. "Every event is free"). */
  admissionNote?: string;
  status: FestivalStatus;
  createdByUid?: string;
  createdAt: string;
  updatedAt: string;
}

const FESTIVAL_SLUG_RE = /^[a-z0-9-]{3,60}$/;

/** Route-level slugs under /f/ that must never become a festival. */
const RESERVED_FESTIVAL_SLUGS = ["new"] as const;

export function isValidFestivalSlug(slug: string): boolean {
  if (!FESTIVAL_SLUG_RE.test(slug)) return false;
  if ((RESERVED_FESTIVAL_SLUGS as readonly string[]).includes(slug)) return false;
  if (slug.startsWith("-") || slug.endsWith("-") || slug.includes("--")) return false;
  return true;
}

export function slugifyFestivalName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 60);
  return slug;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidFestivalDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const at = Date.parse(`${value}T12:00:00Z`);
  if (!Number.isFinite(at)) return false;
  const check = new Date(at);
  return check.getUTCFullYear() === y && check.getUTCMonth() + 1 === m && check.getUTCDate() === d;
}

interface FestivalDay {
  /** YYYY-MM-DD in the festival timezone. */
  date: string;
  /** Anchor key mirroring Spark's #day-mon … #day-sun convention. */
  anchor: string;
  /** Full label, e.g. "Monday 21 September". */
  label: string;
  /** Short tab label, e.g. "Mon 21". */
  shortLabel: string;
}

const DAY_ANCHORS = ["day-sun", "day-mon", "day-tue", "day-wed", "day-thu", "day-fri", "day-sat"];

/** Sydney-zoned weekday index (0 = Sunday) for a calendar date. */
function zonedWeekdayIndex(dateStr: string, timeZone: string): number {
  const at = Date.parse(`${dateStr}T12:00:00Z`);
  const weekday = new Date(at).toLocaleDateString("en-US", { weekday: "short", timeZone });
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

function addDays(dateStr: string, days: number): string {
  const at = Date.parse(`${dateStr}T12:00:00Z`);
  const next = new Date(at + days * 86400000);
  return next.toISOString().slice(0, 10);
}

function dayLabel(dateStr: string, timeZone: string, style: "long" | "short"): string {
  const at = Date.parse(`${dateStr}T12:00:00Z`);
  const date = new Date(at);
  try {
    if (style === "long") {
      return date.toLocaleDateString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone,
      });
    }
    return date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", timeZone });
  } catch {
    return dateStr;
  }
}

/** Every calendar day from startDate to endDate inclusive (max 14). */
export function festivalDays(festival: Pick<Festival, "startDate" | "endDate" | "timeZone">): FestivalDay[] {
  const timeZone = festival.timeZone || "Australia/Sydney";
  if (!isValidFestivalDate(festival.startDate) || !isValidFestivalDate(festival.endDate)) return [];
  if (festival.endDate < festival.startDate) return [];
  const days: FestivalDay[] = [];
  let cursor = festival.startDate;
  while (cursor <= festival.endDate && days.length < 14) {
    const idx = zonedWeekdayIndex(cursor, timeZone);
    days.push({
      date: cursor,
      anchor: DAY_ANCHORS[idx] || `day-${cursor}`,
      label: dayLabel(cursor, timeZone, "long"),
      shortLabel: dayLabel(cursor, timeZone, "short"),
    });
    cursor = addDays(cursor, 1);
  }
  return days;
}

/** Sydney-zoned YYYY-MM-DD for an ISO instant. */
export function zonedDateStr(iso: string, timeZone: string): string {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    }).formatToParts(new Date(at));
    const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return "";
  }
}

interface FestivalSessionLike {
  id: string;
  startsAt: string;
}

/** Group sessions by festival day; sessions outside the range are dropped. */
export function groupSessionsByDay<T extends FestivalSessionLike>(
  sessions: T[],
  days: FestivalDay[],
  timeZone: string,
): { day: FestivalDay; sessions: T[] }[] {
  const byDate = new Map<string, T[]>();
  for (const session of sessions) {
    const date = zonedDateStr(session.startsAt, timeZone);
    if (!date) continue;
    const list = byDate.get(date) || [];
    list.push(session);
    byDate.set(date, list);
  }
  return days.map((day) => ({
    day,
    sessions: (byDate.get(day.date) || []).sort((a, b) =>
      a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0,
    ),
  }));
}

/**
 * Offset minutes (local − UTC) for a zoned wall time, e.g. AEST = +600.
 * Resolves DST for the actual date, so October Sydney sessions get +660.
 */
function tzOffsetMinutes(dateStr: string, timeStr: string, timeZone: string): number {
  const [hh, mm] = timeStr.split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
  const utcGuess = Date.parse(`${dateStr}T${timeStr}:00Z`);
  if (!Number.isFinite(utcGuess)) return 0;
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = dtf.formatToParts(new Date(utcGuess));
    const get = (type: string) => parts.find((p) => p.type === type)?.value || "0";
    const asUtc = Date.UTC(
      Number(get("year")),
      Number(get("month")) - 1,
      Number(get("day")),
      Number(get("hour")) % 24,
      Number(get("minute")),
      Number(get("second")),
    );
    return Math.round((asUtc - utcGuess) / 60000);
  } catch {
    return 0;
  }
}

/** Wall time in a timezone → ISO instant, e.g. ("2026-09-21", "09:00", Sydney) → “…+10:00”. */
export function zonedTimeToIso(dateStr: string, timeStr: string, timeZone: string): string {
  if (!isValidFestivalDate(dateStr) || !/^\d{2}:\d{2}$/.test(timeStr)) return "";
  const offset = tzOffsetMinutes(dateStr, timeStr, timeZone);
  const sign = offset < 0 ? "-" : "+";
  const abs = Math.abs(offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dateStr}T${timeStr}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/**
 * Who may attach an event to a festival program. Returns null when allowed,
 * otherwise the reason it is refused. Only the festival organiser or a
 * platform admin can pull an event into someone else's program — otherwise
 * any organiser could spam any festival.
 */
export function checkSessionAttach(
  festival: { slug: string; createdByUid?: string } | null,
  callerUid: string,
  isAdmin: boolean,
): string | null {
  if (!festival) return "Festival not found.";
  if (isAdmin) return null;
  if (festival.createdByUid && festival.createdByUid === callerUid) return null;
  return "Only the festival organiser can add sessions to this program.";
}

/** Validation errors for the organizer create form. Empty means valid. */
export function validateFestival(input: {
  name: string;
  slug: string;
  city: string;
  startDate: string;
  endDate: string;
}): string[] {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push("Festival name is required.");
  if (!isValidFestivalSlug(input.slug)) {
    errors.push("Slug must be 3–60 lowercase letters, digits, or single hyphens.");
  }
  if (!input.city.trim()) errors.push("City is required.");
  if (!isValidFestivalDate(input.startDate)) errors.push("Start date must be YYYY-MM-DD.");
  if (!isValidFestivalDate(input.endDate)) errors.push("End date must be YYYY-MM-DD.");
  if (isValidFestivalDate(input.startDate) && isValidFestivalDate(input.endDate) && input.endDate < input.startDate) {
    errors.push("End date cannot be before start date.");
  }
  return errors;
}
