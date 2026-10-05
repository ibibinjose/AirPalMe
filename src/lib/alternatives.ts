/**
 * Single source for the /alternatives/:slug comparison pages.
 *
 * Honesty contract (enforced by alternatives.test.ts):
 * - The competitor is named only as query context (headline + intro).
 * - Every AirPal claim must be repo-verifiable; criteria cells and use-case
 *   bodies must not mention the competitor at all.
 * - No superlatives, ratings, counts, testimonials, or guarantees anywhere.
 * - No competitor feature/pricing claims, ever.
 */

export interface AlternativeUseCase {
  title: string;
  body: string;
  href: string;
  cta: string;
}

export interface AlternativeCriterion {
  check: string;
  airpal: string;
}

export interface AlternativeConfig {
  slug: string;
  competitor: string;
  competitorDescriptor: string;
  headline: string;
  intro: string;
  useCases: AlternativeUseCase[];
  criteria: AlternativeCriterion[];
  primaryCta: { href: string; label: string };
}

export const ALTERNATIVES: Record<string, AlternativeConfig> = {
  meetup: {
    slug: "meetup",
    competitor: "Meetup",
    competitorDescriptor: "group-based event platform",
    headline: "A Meetup alternative for casual plans",
    intro:
      "Meetup organises strangers into groups. AirPal.Me starts from your own people: make a shared plan with stops, votes and RSVPs, and see what's on nearby — all on one account.",
    useCases: [
      {
        title: "Group plans",
        body: "One shared plan holds the what, when, where and who — with stops, votes, comments and an RSVP link for the crew.",
        href: "/plan",
        cta: "Make a plan",
      },
      {
        title: "What now?",
        body: "Tell AirPal your urge and time window — get one suggestion for right now, then make it a plan in one tap.",
        href: "/now",
        cta: "What now?",
      },
      {
        title: "What's on",
        body: "Events, experiences and things to do near you, with month, week and day views.",
        href: "/calendar",
        cta: "See what's on",
      },
    ],
    criteria: [
      { check: "Who it's for", airpal: "Your own people — friends, family, colleagues" },
      { check: "Planning tools", airpal: "Shared plans with stops, votes, comments and RSVPs" },
      { check: "Finding company", airpal: "Shared plans with your own people" },
      { check: "Local discovery", airpal: "Events, deals and places nearby" },
      { check: "Guest access", airpal: "Web guests browse without an account" },
    ],
    primaryCta: { href: "/plan", label: "Make a plan" },
  },
  "touch-stay": {
    slug: "touch-stay",
    competitor: "Touch Stay",
    competitorDescriptor: "digital guest guidebook software",
    headline: "A Touch Stay alternative",
    intro:
      "Touch Stay is digital guest guidebook software. AirPal.Me is a QR guest concierge: guests scan a code — no download, no account — for Wi-Fi, dining, housekeeping, tickets and checkout, with local discovery built in.",
    useCases: [
      {
        title: "Guest side",
        body: "1-tap Wi-Fi, dining cart, housekeeping requests, tickets and express checkout, plus a 24/7 AI receptionist.",
        href: "/concierge",
        cta: "See Stay & Guide",
      },
      {
        title: "Host side",
        body: "Facilities, menu, Wi-Fi, QR print kit and a live ticket queue in one host workspace.",
        href: "/host",
        cta: "Open host workspace",
      },
      {
        title: "What's nearby",
        body: "Events, experiences and things to do around the stay.",
        href: "/calendar",
        cta: "See what's on",
      },
    ],
    criteria: [
      { check: "Guest download", airpal: "None — guests scan with the camera" },
      { check: "Guest account", airpal: "Not needed on the web" },
      { check: "Housekeeping & dining", airpal: "In-app requests with live staff dispatch" },
      { check: "What's nearby", airpal: "Events, experiences and places included" },
      { check: "Host setup", airpal: "Property, Wi-Fi and QR print kit in one workspace" },
    ],
    primaryCta: { href: "/concierge", label: "See Stay & Guide" },
  },
  hostfully: {
    slug: "hostfully",
    competitor: "Hostfully",
    competitorDescriptor: "short-term-rental platform",
    headline: "A Hostfully alternative",
    intro:
      "Hostfully is a short-term-rental platform. AirPal.Me keeps the scope tight: a QR concierge for guests, one backend for hosts and venues, and local events and experiences guests can discover.",
    useCases: [
      {
        title: "Stay & Guide",
        body: "No-download QR access to Wi-Fi, dining, housekeeping, tickets and checkout.",
        href: "/concierge",
        cta: "See Stay & Guide",
      },
      {
        title: "Business backend",
        body: "List your place, publish experiences and offers, and take bookings.",
        href: "/business",
        cta: "List your place",
      },
      {
        title: "Events for guests",
        body: "Events near the stay that guests find on their own.",
        href: "/events",
        cta: "Browse events",
      },
    ],
    criteria: [
      { check: "Guest download", airpal: "None — guests scan with the camera" },
      { check: "Scope", airpal: "Stay & Guide, discovery and bookings in one product" },
      { check: "Events for guests", airpal: "Hosts publish offers guests find nearby" },
      { check: "Event hosting", airpal: "Free or ticketed events with door check-in" },
      { check: "Getting live", airpal: "Apply, verify, then list and sell" },
    ],
    primaryCta: { href: "/business", label: "List your place" },
  },
  eventbrite: {
    slug: "eventbrite",
    competitor: "Eventbrite",
    competitorDescriptor: "event discovery and ticketing platform",
    headline: "An Eventbrite alternative with group planning",
    intro:
      "Eventbrite is an event discovery and ticketing platform. AirPal.Me lists free or ticketed events — stalls, festivals, guest lists, door check-in — and on the same platform, groups make shared plans with stops, votes and RSVPs.",
    useCases: [
      {
        title: "Host events",
        body: "Free or ticketed events with stalls, festivals, guest lists and door check-in; payouts after delivery.",
        href: "/event",
        cta: "Host an event",
      },
      {
        title: "Group plans",
        body: "Turn any outing into a shared plan with stops, votes, comments and RSVPs.",
        href: "/plan",
        cta: "Make a plan",
      },
      {
        title: "What now?",
        body: "Tell AirPal your urge and time window — get one suggestion for right now, then make it a plan in one tap.",
        href: "/now",
        cta: "What now?",
      },
    ],
    criteria: [
      { check: "Ticketing", airpal: "Free and ticketed events with door check-in" },
      { check: "Group coordination", airpal: "Shared plans on the same platform" },
      { check: "Finding company", airpal: "Shared plans with your own people" },
      { check: "Payouts", airpal: "Released after delivery" },
      { check: "Guest access", airpal: "Web guests browse without an account" },
    ],
    primaryCta: { href: "/event", label: "Host an event" },
  },
};

export const ALTERNATIVE_SLUGS = Object.keys(ALTERNATIVES).sort();
