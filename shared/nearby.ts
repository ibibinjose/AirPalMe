/** Real Nearby — markers, precinct places, events/offers, scan analytics. */

export const MARKER_KINDS = ["lobby", "room", "venue", "meeting", "precinct", "street", "event"] as const;

/** Reserved for later transport / aviation markers. Do not emit yet. */
export const RESERVED_MARKER_KINDS = ["vehicle", "seat", "gate", "aircraft"] as const;

export type MarkerKind = (typeof MARKER_KINDS)[number];
export type ReservedMarkerKind = (typeof RESERVED_MARKER_KINDS)[number];

export const PLACE_CATEGORIES = [
  "eat",
  "coffee",
  "shops",
  "events",
  "services",
  "things",
  "parking",
  "facilities",
  "stay",
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export const PLACE_CATEGORY_LABELS: Record<PlaceCategory, string> = {
  eat: "Eat & drink",
  coffee: "Coffee",
  shops: "Shops",
  events: "Events",
  services: "Services",
  things: "Things to do",
  parking: "Parking",
  facilities: "Facilities",
  stay: "Stay",
};

export type Geo = { lat: number; lng: number };

/** D3 commercial stay kinds; residential stays stay out until legal compliance lands. */
export type PropertyTradeKind =
  | "hotel"
  | "motel"
  | "serviced-apartment"
  | "hostel"
  | "boutique"
  | "campus"
  | "venue";

export type MarkerDoc = {
  id: string;
  kind: MarkerKind;
  status: "active" | "inactive";
  label?: string;
  geo?: Geo;
  propertyId?: string;
  propertyName?: string;
  precinctId?: string;
  roomToken?: string;
  city?: string;
  citySlug?: string;
  handle?: string;
  ownerUid?: string;
  placeId?: string;
  /** What this venue is (eat, coffee, stay, shops…). Used to derive rival categories. */
  venueCategory?: PlaceCategory;
  /** Parent property trade. Lobby/room inherit this. */
  propertyKind?: PropertyTradeKind;
  /**
   * When false, Nearby hides same-trade rivals.
   * Default false for venue/lobby/room/meeting; true for street/precinct/event.
   */
  allowCompetitors?: boolean;
  /** Derived rival place categories. Empty when allowCompetitors is true. */
  suppressCategories?: PlaceCategory[];
};

export type PrecinctDoc = {
  id: string;
  name: string;
  city: string;
  citySlug: string;
  status: "active" | "inactive";
  geo?: Geo;
  summary?: string;
};

export type PlaceDeal = {
  badge: string; // e.g. "15% Guest Perk"
  detail: string; // e.g. "Show room key at the bar for 15% off food and craft schooners"
  expiry?: string;
  claimHint?: string; // e.g. "Show Room Key" or "Show AirPal Pass"
};

export type NearbyPlace = {
  id: string;
  name: string;
  category: PlaceCategory;
  shortWhy: string;
  /** Detailed venue / business description */
  description?: string;
  geo: Geo;
  hours?: string;
  /** Last host confirmation of opening hours. */
  hoursVerifiedAt?: string;
  source: "seed" | "host" | "partner";
  status: "active" | "inactive";
  precinctId: string;
  address?: string;
  priceLevel?: "Free" | "$" | "$$" | "$$$";
  rating?: number;
  reviewCount?: number;
  propertyId?: string;
  /** Direct outbound booking or ordering URL (OpenTable, TheFork, direct website, Uber Eats, etc.) */
  bookingUrl?: string;
  /** Action label (e.g. "Reserve table", "Order online", "Book stay", "Visit website") */
  bookingLabel?: string;
  /** Action category classification */
  bookingActionType?: "reserve" | "order" | "book" | "ticket" | "visit";
  /** Average spend / booking value in local currency (e.g. $45 restaurant, $15 cafe, $240 hotel) for attributed demand calculations */
  avgBookingValue?: number;
  /** Primary photo URL */
  heroImage?: string;
  /** Carousel photo gallery (2-4 images) */
  photos?: string[];
  /** Exclusive in-stay perk or merchant deal */
  deal?: PlaceDeal;
  /** Curated concierge insider tip */
  insiderTip?: string;
  /** Transit notes from marker */
  transitNotes?: string;
  /** Open status override */
  openNow?: boolean;
  /** Verified partner badge flag */
  verifiedPartner?: boolean;
  /** Tagline / subtitle */
  subTitle?: string;
  /** Canonical AirPal @handle for the Bio button */
  handle?: string;
  /** Google Maps place id when the venue is a real Maps listing */
  mapsPlaceId?: string;
  phone?: string;
};

export type NearbyEvent = {
  id: string;
  title: string;
  detail: string;
  when: string;
  precinctId: string;
  status: "active" | "inactive";
  category?: PlaceCategory;
  placeId?: string;
  propertyId?: string;
  kind: "event" | "offer";
  heroImage?: string;
  photos?: string[];
  startTime?: string;
  endTime?: string;
  isLiveNow?: boolean;
  isEnded?: boolean;
  ticketUrl?: string;
  ticketPrice?: string;
  venueName?: string;
  deal?: PlaceDeal;
  insiderTip?: string;
  /** Last host confirmation of the schedule / “when” copy. */
  scheduleVerifiedAt?: string;
};

export type ScanEventKind =
  | "open"
  | "category"
  | "place"
  | "place_view"
  | "ask"
  | "issue"
  | "offers"
  | "order"
  | "booking_click"
  | "booking_return"
  | "qr_scan"
  | "map_open"
  | "wifi_reveal"
  | "question"
  | "offer_claim"
  | "event_save";

export type ScanEventDoc = {
  id?: string;
  markerId: string;
  ts: string;
  uid: string;
  kind: ScanEventKind;
  category?: PlaceCategory;
  placeId?: string;
  propertyId?: string;
  propertyName?: string;
  placeName?: string;
  precinctId?: string;
  destinationUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  estimatedValue?: number;
  note?: string;
};

export type ScanEventSummary = {
  total: number;
  byKind: Partial<Record<ScanEventKind, number>>;
  bookingClicks: number;
  placeViews: number;
  opens: number;
  estimatedAttributedDemand: number;
  topMarkers: Array<{
    markerId: string;
    count: number;
    bookingClicks?: number;
    estimatedDemand?: number;
    label?: string;
    kind?: string;
  }>;
  topBookingTargets?: Array<{
    id: string;
    name: string;
    type: "property" | "place";
    count: number;
    estimatedValue: number;
  }>;
};

export function summarizeScanEvents(
  events: Array<{
    markerId: string;
    kind?: string;
    placeId?: string;
    propertyId?: string;
    propertyName?: string;
    placeName?: string;
    estimatedValue?: number;
  }>,
  topN = 8,
  defaultAvgValue = 180,
): ScanEventSummary {
  const byKind: Partial<Record<ScanEventKind, number>> = {};
  const byMarker = new Map<string, { total: number; bookings: number; estimatedDemand: number }>();
  const byTarget = new Map<
    string,
    { id: string; name: string; type: "property" | "place"; count: number; estimatedValue: number }
  >();

  let bookingClicks = 0;
  let placeViews = 0;
  let opens = 0;
  let estimatedAttributedDemand = 0;

  for (const event of events) {
    const kind = event.kind as ScanEventKind;
    if (kind) {
      byKind[kind] = (byKind[kind] || 0) + 1;
      if (kind === "booking_click") bookingClicks++;
      if (kind === "place_view" || kind === "place") placeViews++;
      if (kind === "open") opens++;
    }

    const value =
      event.estimatedValue && event.estimatedValue > 0
        ? event.estimatedValue
        : kind === "booking_click"
          ? defaultAvgValue
          : 0;
    if (kind === "booking_click") {
      estimatedAttributedDemand += value;
    }

    if (event.markerId) {
      const current = byMarker.get(event.markerId) || { total: 0, bookings: 0, estimatedDemand: 0 };
      current.total += 1;
      if (kind === "booking_click") {
        current.bookings += 1;
        current.estimatedDemand += value;
      }
      byMarker.set(event.markerId, current);
    }

    if (kind === "booking_click" && (event.propertyId || event.placeId)) {
      const targetId = event.propertyId || event.placeId!;
      const targetName = event.propertyName || event.placeName || targetId;
      const targetType = event.propertyId ? "property" : "place";
      const existing = byTarget.get(targetId) || {
        id: targetId,
        name: targetName,
        type: targetType,
        count: 0,
        estimatedValue: 0,
      };
      existing.count += 1;
      existing.estimatedValue += value;
      byTarget.set(targetId, existing);
    }
  }

  const topMarkers = Array.from(byMarker.entries())
    .sort((a, b) => b[1].bookings * 1000 + b[1].total - (a[1].bookings * 1000 + a[1].total) || a[0].localeCompare(b[0]))
    .slice(0, topN)
    .map(([markerId, stat]) => ({
      markerId,
      count: stat.total,
      bookingClicks: stat.bookings,
      estimatedDemand: stat.estimatedDemand,
    }));

  const topBookingTargets = Array.from(byTarget.values())
    .sort((a, b) => b.count - a.count || b.estimatedValue - a.estimatedValue)
    .slice(0, 6);

  return {
    total: events.length,
    byKind,
    bookingClicks,
    placeViews,
    opens,
    estimatedAttributedDemand,
    topMarkers,
    topBookingTargets,
  };
}

export type NearbyAskContext = {
  precinctName: string;
  markerKind?: MarkerKind;
  markerLabel?: string;
  propertyName?: string;
  isRoomStay?: boolean;
  suppressCategories?: PlaceCategory[];
};

export type MarkerCompetitorInput = {
  kind: MarkerKind;
  venueCategory?: PlaceCategory;
  propertyKind?: PropertyTradeKind;
  allowCompetitors?: boolean;
  propertyAllowCompetitors?: boolean;
  suppressCategories?: PlaceCategory[];
};

/** Street / precinct / poster: full graph. Venue, lobby, room, meeting: protect the host. */
export function defaultAllowCompetitors(kind: MarkerKind): boolean {
  return kind === "street" || kind === "precinct" || kind === "event";
}

/**
 * Only the original Sydney pilot has a seeded default precinct.
 * Every other city (Melbourne, Kochi, Kovalam, …) uses an explicit precinctId from CMS/host.
 */
export const PILOT_CITY_PRECINCT: Record<string, string> = {
  sydney: "the-rocks",
};

export function resolvePrecinctId(precinctId?: string, citySlug?: string): string | undefined {
  const explicit = (precinctId || "").trim();
  if (explicit) return explicit;
  const slug = (citySlug || "").trim().toLowerCase();
  return PILOT_CITY_PRECINCT[slug];
}

/** Map a host-typed city/area ("Kovalam Beach", "Sydney Harbour") to a precinct id when CMS has not set one. */
export function guessPrecinctIdFromCityText(text?: string): string | undefined {
  const raw = (text || "").trim();
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (/\b(the rocks|sydney|circular quay)\b/.test(lower)) return "the-rocks";
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || undefined
  );
}

export function parsePropertyTradeKind(value: string | undefined): PropertyTradeKind | undefined {
  if (
    value === "hotel" ||
    value === "motel" ||
    value === "serviced-apartment" ||
    value === "hostel" ||
    value === "boutique" ||
    value === "campus" ||
    value === "venue"
  )
    return value;
  return undefined;
}

/** What trade this marker is in — restaurant, stay, shop, etc. */
export function venueTradeOf(input: MarkerCompetitorInput): PlaceCategory | undefined {
  if (input.venueCategory && isPlaceCategory(input.venueCategory)) return input.venueCategory;
  if (input.kind === "street" || input.kind === "precinct" || input.kind === "event") return undefined;
  if (
    input.propertyKind === "hotel" ||
    input.propertyKind === "motel" ||
    input.propertyKind === "serviced-apartment" ||
    input.propertyKind === "hostel" ||
    input.propertyKind === "boutique" ||
    input.propertyKind === "campus"
  )
    return "stay";
  if (input.propertyKind === "venue" || input.kind === "venue") return "eat";
  if (input.kind === "lobby" || input.kind === "room" || input.kind === "meeting") return "stay";
  return undefined;
}

/** Restaurant/café hide eat+coffee; hotel hides stay; other trades hide themselves. */
export function defaultSuppressCategories(trade: PlaceCategory | undefined): PlaceCategory[] {
  if (!trade) return [];
  if (trade === "eat") return ["eat", "coffee"];
  if (trade === "coffee") return ["coffee", "eat"];
  return [trade];
}

export function resolveCompetitorPolicy(input: MarkerCompetitorInput): {
  allowCompetitors: boolean;
  suppressCategories: PlaceCategory[];
  trade?: PlaceCategory;
} {
  const allowCompetitors =
    input.propertyAllowCompetitors ?? input.allowCompetitors ?? defaultAllowCompetitors(input.kind);
  const trade = venueTradeOf(input);
  if (allowCompetitors) return { allowCompetitors: true, suppressCategories: [], trade };
  const stored = (input.suppressCategories || []).filter(isPlaceCategory);
  return {
    allowCompetitors: false,
    suppressCategories: stored.length ? stored : defaultSuppressCategories(trade),
    trade,
  };
}

export function isOwnOrHostPick(
  place: { id: string; propertyId?: string },
  ctx: { ownPlaceId?: string; ownPropertyId?: string; recommendedIds?: string[] },
): boolean {
  if (ctx.ownPlaceId && place.id === ctx.ownPlaceId) return true;
  if (ctx.ownPropertyId && place.propertyId && place.propertyId === ctx.ownPropertyId) return true;
  if (ctx.recommendedIds?.includes(place.id)) return true;
  return false;
}

/** Drop same-category rivals. Own place, own property listings, and host picks always stay. */
export function filterCompetitorPlaces<T extends { id: string; category: PlaceCategory; propertyId?: string }>(
  places: T[],
  suppressCategories: PlaceCategory[],
  ctx: { ownPlaceId?: string; ownPropertyId?: string; recommendedIds?: string[] } = {},
): T[] {
  if (!suppressCategories.length) return places;
  const suppress = new Set(suppressCategories);
  return places.filter((place) => isOwnOrHostPick(place, ctx) || !suppress.has(place.category));
}

export function filterCompetitorEvents<T extends { category?: PlaceCategory; propertyId?: string }>(
  events: T[],
  suppressCategories: PlaceCategory[],
  ctx: { ownPropertyId?: string } = {},
): T[] {
  if (!suppressCategories.length) return events;
  const suppress = new Set(suppressCategories);
  return events.filter((event) => {
    if (ctx.ownPropertyId && event.propertyId === ctx.ownPropertyId) return true;
    if (!event.category) return true;
    return !suppress.has(event.category);
  });
}

export function markerHereLine(context: NearbyAskContext): string {
  const label = context.markerLabel || "this marker";
  const place = context.propertyName;
  if (place && context.markerKind === "room") return `You're at ${label} in ${place}.`;
  if (place && context.markerKind === "lobby") return `You're at the ${place} lobby.`;
  if (place) return `You're at ${label} (${place}).`;
  return `You're at ${label} in ${context.precinctName}.`;
}

export function nearbyAskCategory(raw: string): PlaceCategory | undefined {
  const q = raw.toLowerCase();
  if (q.includes("coffee") || q.includes("cafe") || q.includes("caff")) return "coffee";
  if (q.includes("park")) return "parking";
  if (q.includes("shop") || q.includes("buy") || q.includes("retail")) return "shops";
  if (
    q.includes("eat") ||
    q.includes("food") ||
    q.includes("dinner") ||
    q.includes("lunch") ||
    q.includes("restaurant")
  )
    return "eat";
  if (q.includes("event") || q.includes("tonight") || q.includes("what's on") || q.includes("whats on"))
    return "events";
  return undefined;
}

export function isStayScopedAsk(raw: string): boolean {
  const q = raw.toLowerCase();
  return /\b(wifi|wi-fi|wi fi|password|ssid|towel|housekeep|clean(?:ing)?|staff|front desk|maintenance|a\/c|\bac\b|room service)\b/.test(
    q,
  );
}

/** Local marker answers only — not a destination LLM. */
export function answerNearbyAsk(
  raw: string,
  places: Array<{ name: string; category: PlaceCategory; shortWhy: string }>,
  context: NearbyAskContext,
): string {
  const here = markerHereLine(context);
  if (isStayScopedAsk(raw)) {
    if (context.isRoomStay) {
      return `${here} Wi-Fi, cleaning, and staff for this room are on the room companion — tap Open room companion, or Clean/issue on this marker. Assist is for nearby picks.`;
    }
    return `${here} This marker is discovery-only. Use the QR in your room for Wi-Fi and staff. I can still point you to nearby coffee, food, and what's on.`;
  }
  const matchCategory = nearbyAskCategory(raw);
  if (matchCategory && context.suppressCategories?.includes(matchCategory)) {
    return `${here} I won't send you to a nearby ${PLACE_CATEGORY_LABELS[matchCategory].toLowerCase()} from this marker. Try shops, things to do, or what's on.`;
  }
  const pool = matchCategory ? places.filter((place) => place.category === matchCategory) : places;
  const top = pool.slice(0, 3);
  if (!top.length) {
    return `${here} I don't have a nearby pick for that yet in ${context.precinctName}. Try another chip, or ask the front desk if you're staying close by.`;
  }
  const heading = matchCategory ? PLACE_CATEGORY_LABELS[matchCategory] : "Nearby";
  return `${here} ${heading} around ${context.precinctName}: ${top.map((place) => `${place.name} — ${place.shortWhy}`).join(" ")}`;
}

export function conciergeOrderHref(marker: {
  kind: MarkerKind;
  propertyId?: string;
  roomToken?: string;
}): string | undefined {
  if (marker.kind === "room" && marker.propertyId && marker.roomToken) {
    return `/g/${marker.propertyId}?r=${encodeURIComponent(marker.roomToken)}&type=dining`;
  }
  return undefined;
}

export function isMarkerKind(value: string | undefined): value is MarkerKind {
  return Boolean(value && (MARKER_KINDS as readonly string[]).includes(value));
}

export function isPlaceCategory(value: string | undefined): value is PlaceCategory {
  return Boolean(value && (PLACE_CATEGORIES as readonly string[]).includes(value));
}

export function parseMarkerKind(value: string | undefined): MarkerKind {
  return isMarkerKind(value) ? value : "street";
}

const EARTH_M = 6371000;

export function haversineMeters(a: Geo, b: Geo): number {
  if (
    !a ||
    !b ||
    !Number.isFinite(a.lat) ||
    !Number.isFinite(a.lng) ||
    !Number.isFinite(b.lat) ||
    !Number.isFinite(b.lng)
  ) {
    return 0;
  }
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(Math.max(0, h))));
}

export function formatWalk(meters: number): { distance: string; walkTime: string } {
  const m = Math.max(0, Math.round(meters));
  const mins = Math.max(1, Math.round(m / 80));
  return {
    distance: m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`,
    walkTime: mins === 1 ? "1 min walk" : `${mins} min walk`,
  };
}

/** Host recommended IDs first (stable order), then distance. */
export function sortNearbyPlaces<T extends { id: string; geo?: Geo }>(
  places: T[],
  origin: Geo | undefined,
  recommendedIds: string[] = [],
): Array<{ place: T; meters?: number; walk?: { distance: string; walkTime: string }; hostPick: boolean }> {
  const rank = new Map(recommendedIds.map((id, index) => [id, index]));
  const hasValidOrigin = Boolean(origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng));
  return places
    .map((place) => {
      const hasValidGeo = Boolean(place.geo && Number.isFinite(place.geo.lat) && Number.isFinite(place.geo.lng));
      const meters = hasValidOrigin && hasValidGeo ? haversineMeters(origin!, place.geo!) : undefined;
      return {
        place,
        meters,
        walk: meters != null ? formatWalk(meters) : undefined,
        hostPick: rank.has(place.id),
      };
    })
    .sort((a, b) => {
      const ar = rank.has(a.place.id) ? rank.get(a.place.id)! : 1000;
      const br = rank.has(b.place.id) ? rank.get(b.place.id)! : 1000;
      if (ar !== br) return ar - br;
      return (a.meters ?? 9e9) - (b.meters ?? 9e9);
    });
}
