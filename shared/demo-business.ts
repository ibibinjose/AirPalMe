import { demoDocId } from "./content-meta";

/**
 * Canonical demo-business content for the /Demo showcase. Names carry
 * "Demo" so live-rendered demo docs stay honest at a glance; the
 * `demo: true` flag + `demo-` ids keep them out of discovery and KPIs.
 */
export const DEMO_BUSINESS = {
  name: "Demo Harbour Hotel",
  address: "1 Demo Quay, The Rocks NSW 2000",
  city: "Sydney",
  geo: { lat: -33.8523, lng: 151.2108 },
  phone: "+61 2 0000 0000",
  hours: "Daily 7:00 AM – 10:00 PM",
  shortWhy: "Harbour-view demo stay with rooftop sessions and a live host desk.",
  venue: "Demo Harbour Hotel · Rooftop",
  eventName: "Demo Rooftop Sessions",
  eventShortWhy: "Weekly rooftop set above the harbour. Free entry, scan to RSVP.",
} as const;

/** `?demo=1` detection for prefilled demo onboarding runs. Strict `1` only. */
export function isDemoModeSearch(search: string): boolean {
  return /(^|[?&])demo=1(&|$)/.test(search);
}

/**
 * Deterministic demo doc ids. Rebuilding the demo overwrites the same docs,
 * so the /Demo hub can deep-link them and report live build status.
 */
export const DEMO_LISTING_ID = demoDocId("list", "harbour");
export const DEMO_EVENT_ID = demoDocId("evt", "rooftop");
export const DEMO_PROPERTY_ID = demoDocId("prop", "harbour");
export const DEMO_PROPERTY_MARKER_ID = demoDocId("marker", "harbour");
export const DEMO_VENUE_ID = demoDocId("venue", "harbour");
export const DEMO_VENUE_PLACE_ID = demoDocId("place", "harbour");
export const DEMO_VENUE_MARKER_ID = demoDocId("marker", "venue");

/**
 * The listing write derives its place id via `listingId.replace(/^list-/,"pl-")`.
 * `demo-` ids never match that prefix, so the demo place shares the listing id.
 * Mirror the server derivation exactly — never hard-code a second copy.
 */
export const DEMO_PLACE_ID = DEMO_LISTING_ID.replace(/^list-/, "pl-");

/** Server-side guard: only `demo-` ids with a safe charset are stampable. */
export function isDemoDocId(value: unknown): value is string {
  return typeof value === "string" && /^demo-[a-z0-9-]+$/.test(value);
}

/** Live showcase stops: collection + doc the /Demo hub reads, and its route. */
export const DEMO_SHOWCASE = [
  {
    key: "stay",
    title: "Stay · Demo Harbour Hotel",
    body: "Scan the lobby: Wi-Fi, dining, housekeeping — the live concierge.",
    collection: "properties",
    docId: DEMO_PROPERTY_ID,
    href: `/stay/${DEMO_PROPERTY_ID}`,
  },
  {
    key: "event",
    title: "Event · Demo Rooftop Sessions",
    body: "Real event page with tickets, gate scan, and RSVP.",
    collection: "events",
    docId: DEMO_EVENT_ID,
    href: `/e/${DEMO_EVENT_ID}`,
  },
  {
    key: "business",
    title: "Business · Demo Harbour Hotel",
    body: "The listing exactly as guests discover it.",
    collection: "listings",
    docId: DEMO_LISTING_ID,
    href: `/p/${DEMO_PLACE_ID}`,
  },
] as const;

/** Root collections the demo teardown sweeps (demo == true). */
export const DEMO_TEARDOWN_COLLECTIONS = [
  "listings",
  "places",
  "events",
  "properties",
  "markers",
  "partnerVenues",
] as const;

/** Subcollections wiped under each demo parent doc. */
export const DEMO_TEARDOWN_SUBCOLLECTIONS: Record<string, readonly string[]> = {
  properties: ["menu", "private", "qrCodes"],
  events: ["stalls"],
};
