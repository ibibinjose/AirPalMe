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
      "Touch Stay is digital guest guidebook software. AirPal.Me is a precinct discovery and resident arrival platform: visitors scan a code — no download, no account — for precinct highlights, walking routes, deals and building arrival.",
    useCases: [
      {
        title: "Precinct guides",
        body: "Multi-stop walking tours, dining highlights, scenic stops, and precinct history without installing an app.",
        href: "/guide",
        cta: "See precinct guides",
      },
      {
        title: "Host side",
        body: "Community hub, precinct perks, QR print kit and arrival management in one workspace.",
        href: "/host",
        cta: "Open host workspace",
      },
      {
        title: "What's nearby",
        body: "Events, cultural festivals and experiences around the area.",
        href: "/calendar",
        cta: "See what's on",
      },
    ],
    criteria: [
      { check: "Guest download", airpal: "None — visitors scan with the camera" },
      { check: "Guest account", airpal: "Not needed on the web" },
      { check: "Precinct discovery", airpal: "Self-guided walking guides, dining and local perks" },
      { check: "What's nearby", airpal: "Events, experiences and places included" },
      { check: "Host setup", airpal: "Community hub, deals and QR print kit in one workspace" },
    ],
    primaryCta: { href: "/guide", label: "See precinct guides" },
  },
  hostfully: {
    slug: "hostfully",
    competitor: "Hostfully",
    competitorDescriptor: "short-term-rental platform",
    headline: "A Hostfully alternative",
    intro:
      "Hostfully is a short-term-rental platform. AirPal.Me focuses on B2B2C PBSA resident arrival and precinct discovery: 60-second check-in for residents, Belonging Reports for operators, and local events they discover nearby.",
    useCases: [
      {
        title: "Resident arrival",
        body: "No-download QR check-in, building cohorts, orientation, and community desk.",
        href: "/join",
        cta: "See resident arrival",
      },
      {
        title: "Business backend",
        body: "List your place, publish experiences and offers, and take bookings.",
        href: "/business",
        cta: "List your place",
      },
      {
        title: "Events for guests",
        body: "Events near the area that attendees find on their own.",
        href: "/events",
        cta: "Browse events",
      },
    ],
    criteria: [
      { check: "Resident download", airpal: "None — residents scan with the camera" },
      { check: "Scope", airpal: "Arrival engine, discovery and bookings in one product" },
      { check: "Events for residents", airpal: "Operators publish offers residents find nearby" },
      { check: "Event hosting", airpal: "Free or ticketed events with door check-in" },
      { check: "Getting live", airpal: "Apply, verify, then list and onboard" },
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
