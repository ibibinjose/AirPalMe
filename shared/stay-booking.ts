/**
 * D3 — reservable room-nights on the one bookings engine.
 * Money units: nightly prices are dollars (RoomType.startingPrice);
 * quotes convert to integer cents. The server recomputes every number.
 */

export interface StayDateRange {
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
}

export interface StayQuoteInput extends StayDateRange {
  nightlyDollars: number;
  guests: number;
  capacity: number;
}

export interface StayQuote {
  nights: number;
  nightlyCents: number;
  totalCents: number;
  guests: number;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isStayDay(s: string): boolean {
  if (!DAY_RE.test(s)) return false;
  const d = new Date(`${s}T12:00:00`);
  return !Number.isNaN(d.getTime());
}

function dayToMs(s: string): number {
  return new Date(`${s}T12:00:00`).getTime();
}

/** Whole nights in [checkIn, checkOut). Zero/negative when malformed or inverted. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  if (!isStayDay(checkIn) || !isStayDay(checkOut)) return 0;
  const nights = Math.round((dayToMs(checkOut) - dayToMs(checkIn)) / 86400000);
  return nights > 0 ? nights : 0;
}

/** Every date string in [checkIn, checkOut). Cap 62 nights against runaway ranges. */
export function stayDateList(checkIn: string, checkOut: string): string[] {
  const nights = Math.min(nightsBetween(checkIn, checkOut), 62);
  if (!nights) return [];
  const base = dayToMs(checkIn);
  const out: string[] = [];
  for (let i = 0; i < nights; i += 1) {
    const d = new Date(base + i * 86400000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}

/** Quote a stay, or an error string when the request cannot be priced. */
export function quoteStayNights(input: StayQuoteInput): StayQuote | string {
  const nights = nightsBetween(input.checkIn, input.checkOut);
  if (!nights) return "Check-out must be after check-in.";
  if (nights > 62) return "Stays over 62 nights need the host directly.";
  const nightly = Number(input.nightlyDollars);
  if (!Number.isFinite(nightly) || nightly <= 0) return "This room has no nightly price yet.";
  const guests = Math.max(1, Math.floor(Number(input.guests) || 1));
  if (guests > Math.max(1, Math.floor(Number(input.capacity) || 1))) {
    return "Too many guests for this room.";
  }
  const nightlyCents = Math.round(nightly * 100);
  return { nights, nightlyCents, totalCents: nightlyCents * nights, guests };
}

/** True when every night is free of host blocks. */
export function stayRangeFree(dates: string[], blocked: ReadonlySet<string>): boolean {
  return dates.every((d) => !blocked.has(d));
}

/**
 * True when [aIn, aOut) overlaps [bIn, bOut). Malformed ranges never
 * overlap — they fail validation elsewhere.
 */
export function stayRangesOverlap(aIn: string, aOut: string, bIn: string, bOut: string): boolean {
  if (!isStayDay(aIn) || !isStayDay(aOut) || !isStayDay(bIn) || !isStayDay(bOut)) return false;
  return dayToMs(aIn) < dayToMs(bOut) && dayToMs(bIn) < dayToMs(aOut);
}

/** Block-doc id for a property night. */
export function stayBlockId(propertyId: string, date: string): string {
  return `${propertyId.trim()}_${date.trim()}`;
}
