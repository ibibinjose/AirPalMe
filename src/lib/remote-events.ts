import type { CalendarEvent, CalendarEventCategory, EventRecord, Speaker } from "@shared/event";
import {
  cleanCapacity,
  cleanTicketCents,
  eventGatePath,
  isEventFlavour,
  isStallCategory,
  normalizeSpeakerHandle,
} from "@shared/event";
import type { NearbyEvent } from "@shared/nearby";
import { formatEventTimeRange, toDateStr } from "./calendar-utils";
import { toZonedDateStr } from "./local-time";

const EVENT_CATEGORIES: ReadonlySet<string> = new Set([
  "music",
  "market",
  "expo",
  "community",
  "food",
  "nightlife",
  "arts",
  "sports",
  "wellness",
]);

function asCategory(value: unknown): CalendarEventCategory {
  return typeof value === "string" && EVENT_CATEGORIES.has(value) ? (value as CalendarEventCategory) : "community";
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Do two city labels refer to the same place? An event with no city is
 * unscoped — visible everywhere until its owner sets one. Never fabricate
 * a city for display; callers show venue/city as stored.
 */
export function cityMatches(eventCity: string | undefined, userCity: string | undefined): boolean {
  const e = (eventCity || "").trim().toLowerCase();
  const u = (userCity || "").trim().toLowerCase();
  if (!e || !u) return true;
  return e.includes(u) || u.includes(e);
}

/**
 * Validate a Firestore `events/{id}` doc shaped like a curated NearbyEvent
 * (recurring display-hours content, e.g. migrated precinct guides).
 * Accepts DB `live` status (publicly listable per firestore.rules) and
 * coerces it to the local `active` union member. Returns null when the doc
 * cannot be honestly scheduled — never invent times.
 */
export function toNearbyEvent(doc: Record<string, unknown>, id: string): NearbyEvent | null {
  const title = str(doc.title || doc.name).trim();
  const when = str(doc.when).trim();
  if (!title || !when) return null;
  const rawStatus = str(doc.status).trim();
  if (rawStatus !== "active" && rawStatus !== "live") return null;
  return {
    id,
    title,
    detail: str(doc.detail || doc.description),
    when,
    precinctId: str(doc.precinctId) || "local",
    status: "active",
    kind: "event",
    category: undefined,
    venueName: str(doc.venueName || doc.venue) || undefined,
    heroImage: str(doc.heroImage) || undefined,
    ticketPrice: str(doc.ticketPrice) || undefined,
    ticketUrl: str(doc.ticketUrl) || undefined,
    insiderTip: str(doc.insiderTip) || undefined,
    scheduleVerifiedAt: str(doc.scheduleVerifiedAt || doc.updatedAt) || undefined,
  };
}

/**
 * Clean a raw speakers array from Firestore or user input. Drops nameless
 * entries, trims lengths, normalizes @handles. Never invents a speaker.
 */

export function cleanSpeakers(value: unknown): Speaker[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const cleaned = value
    .filter(
      (s): s is { name: unknown; role?: unknown; handle?: unknown } =>
        !!s && typeof s === "object" && typeof (s as { name?: unknown }).name === "string",
    )
    .map((s) => {
      const name = String(s.name).trim().slice(0, 80);
      const role = typeof s.role === "string" && s.role.trim() ? s.role.trim().slice(0, 120) : undefined;
      const handle = typeof s.handle === "string" && s.handle.trim() ? normalizeSpeakerHandle(s.handle) : undefined;
      return { name, ...(role ? { role } : {}), ...(handle ? { handle } : {}) };
    })
    .filter((s) => s.name.length > 0)
    .slice(0, 24);
  return cleaned.length ? cleaned : undefined;
}

/** Shared base mapper: EventRecord (organiser-created, local or remote) → CalendarEvent fields. */
export function recordToCalendarBase(e: EventRecord): Omit<CalendarEvent, "isGoing" | "isInterested" | "isLiked"> {
  const originalDate = e.startsAt ? toDateStr(new Date(e.startsAt)) : toDateStr(new Date());
  const categoryMap: Record<string, CalendarEventCategory> = {
    market: "market",
    expo: "expo",
    event_space: "community",
  };
  const category = categoryMap[e.flavour] || "community";
  return {
    id: e.id,
    title: e.name,
    description: `${e.flavour} with ${e.stallCount || 0} stalls at ${e.venue || e.city}`,
    heroImage: e.coverImage,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    date: originalDate,
    timeLabel: formatEventTimeRange(e.startsAt, e.endsAt),
    city: e.city,
    venue: e.venue || e.city,
    room: e.room,
    ticketPriceCents: e.ticketPriceCents,
    capacity: e.capacity,
    organiserUid: e.organiserUid,
    category,
    categoryLabel: e.flavour === "market" ? "Market" : e.flavour === "expo" ? "Expo" : "Event",
    gatePath: e.gatePath,
    source: "community",
    isLocal: true,
    scheduleVerifiedAt: e.scheduleVerifiedAt || e.updatedAt,
    speakers: e.speakers,
    tags: [
      e.flavour === "market" ? "Market" : e.flavour === "expo" ? "Expo" : "Community",
      e.city,
      ...(e.categoryChips || []),
    ].filter(Boolean),
  };
}

/** Map a raw Firestore doc to a CalendarEvent base, or null when unusable. */
export function docToCalendarBase(
  doc: Record<string, unknown>,
  id: string,
): Omit<CalendarEvent, "isGoing" | "isInterested" | "isLiked"> | null {
  // EventRecord-shaped docs (organiser-created via upsertEvent).
  if (typeof doc.startsAt === "string" && typeof doc.name === "string") {
    const rec = {
      id,
      name: doc.name,
      flavour: doc.flavour,
      city: str(doc.city),
      venue: typeof doc.venue === "string" ? doc.venue : undefined,
      coverImage:
        typeof doc.coverImage === "string"
          ? doc.coverImage
          : typeof doc.heroImage === "string"
            ? doc.heroImage
            : undefined,
      startsAt: doc.startsAt,
      endsAt: typeof doc.endsAt === "string" ? doc.endsAt : doc.startsAt,
      stallCount: typeof doc.stallCount === "number" ? doc.stallCount : 0,
      gatePath: typeof doc.gatePath === "string" ? doc.gatePath : undefined,
      speakers: cleanSpeakers(doc.speakers),
      ticketPriceCents: cleanTicketCents(doc.ticketPriceCents),
      capacity: cleanCapacity(doc.capacity),
      organiserUid: str(doc.organiserUid) || undefined,
    } as EventRecord;
    if (!rec.name.trim() || !rec.city.trim()) return null;
    return recordToCalendarBase(rec);
  }
  // Already CalendarEvent-shaped docs (migrated curated content).
  if (typeof doc.title === "string" && typeof doc.startsAt === "string" && typeof doc.date === "string") {
    if (!doc.title.trim()) return null;
    return {
      id,
      title: doc.title,
      description: str(doc.description),
      startsAt: doc.startsAt,
      endsAt: typeof doc.endsAt === "string" ? doc.endsAt : doc.startsAt,
      date: doc.date,
      timeLabel: str(doc.timeLabel),
      city: str(doc.city),
      venue: str(doc.venue || doc.city),
      room: str(doc.room) || undefined,
      category: asCategory(doc.category),
      categoryLabel: str(doc.categoryLabel) || "Event",
      heroImage:
        typeof doc.heroImage === "string"
          ? doc.heroImage
          : typeof doc.coverImage === "string"
            ? doc.coverImage
            : undefined,
      ticketPrice: typeof doc.ticketPrice === "string" ? doc.ticketPrice : undefined,
      ticketUrl: typeof doc.ticketUrl === "string" ? doc.ticketUrl : undefined,
      gatePath: typeof doc.gatePath === "string" ? doc.gatePath : undefined,
      source: doc.source === "partner" || doc.source === "user" ? doc.source : "local",
      isLocal: true,
      tags: Array.isArray(doc.tags) ? doc.tags.filter((t): t is string => typeof t === "string") : [],
      speakers: cleanSpeakers(doc.speakers),
      ticketPriceCents: cleanTicketCents(doc.ticketPriceCents),
      capacity: cleanCapacity(doc.capacity),
      organiserUid: str(doc.organiserUid) || undefined,
    };
  }
  return null;
}

/**
 * Map a Firestore doc to a full EventRecord (expo directory pages), or null.
 * Accepts organiser-created docs; curated NearbyEvent docs are NOT records.
 */
/**
 * Best Google Maps link for a session: exact Place ID first, then GPS pin,
 * then a text search of venue + room + area. Never fabricates a place.
 */
export function eventMapsUrl(session: {
  venue?: string;
  room?: string;
  address?: string;
  city?: string;
  geo?: { lat: number; lng: number };
  mapsPlaceId?: string;
}): string | null {
  if (session.mapsPlaceId) {
    return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(session.mapsPlaceId)}`;
  }
  if (session.geo && Number.isFinite(session.geo.lat) && Number.isFinite(session.geo.lng)) {
    const q = [session.venue, session.room, `${session.geo.lat},${session.geo.lng}`].filter(Boolean).join(" ");
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }
  const q = [session.venue, session.room, session.address, session.city].filter(Boolean).join(", ");
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function docToEventRecord(doc: Record<string, unknown>, id: string): EventRecord | null {
  const name = str(doc.name).trim();
  const startsAt = str(doc.startsAt);
  if (!name || !parseMs(startsAt)) return null;
  const flavourRaw = str(doc.flavour);
  if (!isEventFlavour(flavourRaw)) return null;
  const city = str(doc.city).trim();
  if (!city) return null;
  return {
    id,
    name,
    flavour: flavourRaw,
    city,
    venue: str(doc.venue) || undefined,
    room: str(doc.room) || undefined,
    address: str(doc.address) || undefined,
    description: str(doc.description) || undefined,
    shortWhy: str(doc.shortWhy) || undefined,
    mapsPlaceId: str(doc.mapsPlaceId) || undefined,
    geo:
      doc.geo && typeof doc.geo === "object" && "lat" in doc.geo && "lng" in doc.geo
        ? (doc.geo as { lat: number; lng: number })
        : undefined,
    coverImage: str(doc.coverImage) || undefined,
    hostName: str(doc.hostName) || undefined,
    hostHandle: str(doc.hostHandle) || undefined,
    hostType: doc.hostType === "business" || doc.hostType === "individual" ? doc.hostType : undefined,
    businessName: str(doc.businessName) || undefined,
    businessHandle: str(doc.businessHandle) || undefined,
    collaboratorHandles: Array.isArray(doc.collaboratorHandles)
      ? doc.collaboratorHandles.filter((h): h is string => typeof h === "string")
      : undefined,
    startsAt,
    endsAt: str(doc.endsAt) || startsAt,
    status: doc.status === "ended" ? "ended" : "live",
    gatePath: str(doc.gatePath) || eventGatePath(id),
    ticketPriceCents: cleanTicketCents(doc.ticketPriceCents),
    capacity: cleanCapacity(doc.capacity),
    festivalSlug: str(doc.festivalSlug) || undefined,
    track: str(doc.track) || undefined,
    registrationUrl: str(doc.registrationUrl) || undefined,
    registrationNote: str(doc.registrationNote) || undefined,
    speakers: cleanSpeakers(doc.speakers),
    organiserUid: str(doc.organiserUid) || undefined,
    categoryChips: Array.isArray(doc.categoryChips)
      ? doc.categoryChips.filter(isStallCategory)
      : ["eat", "coffee", "shops", "things"],
    stallCount: typeof doc.stallCount === "number" ? doc.stallCount : 0,
  };
}

function parseMs(iso: string): number | null {
  const at = Date.parse(iso);
  return Number.isFinite(at) ? at : null;
}

/**
 * Calendar events happening around the guest right now: live window contains
 * now, city matches the GPS-derived city (unscoped events included).
 */
export function liveCalendarEvents(
  events: CalendarEvent[],
  now: Date,
  timeZone: string,
  city?: string,
): CalendarEvent[] {
  const at = now.getTime();
  return events
    .filter((e) => {
      const start = parseMs(e.startsAt);
      const end = parseMs(e.endsAt);
      if (start == null || end == null || at < start || at > end) return false;
      return cityMatches(e.city, city);
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Calendar events dated today (zoned) and not finished, in the guest's city. */
export function tonightCalendarEvents(
  events: CalendarEvent[],
  now: Date,
  timeZone: string,
  city?: string,
): CalendarEvent[] {
  const today = toZonedDateStr(now, timeZone);
  const at = now.getTime();
  return events
    .filter((e) => {
      if (e.date !== today) return false;
      const end = parseMs(e.endsAt);
      if (end != null && at > end + 20 * 60 * 1000) return false;
      return cityMatches(e.city, city);
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
