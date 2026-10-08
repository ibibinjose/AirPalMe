export const BRAND = {
  name: "AirPal.Me",
  tagline: "Life Made Easy.",
  mechanism: "ME = Made Easy",
  coreIdea: "AirPal connects people with the people, places, things and experiences that make life easier.",
  publicPositioning: "People, places, things and experiences — made easier.",
  wedge: {
    name: "AirPal Mate",
    tagline: "Find someone to go with you.",
  },
} as const;

export const BRAND_TAGLINE = BRAND.tagline;

/**
 * AirPal Ecosystem Architecture:
 * - AIRPAL: Master brand & universal identity (1 account, 1 engine).
 * - AirPal.Me: Personal Life & Identity (companion, bio, day plan, weather, outfit, schedule).
 * - AirPal Pass: Events, Deals & Experiences (tickets, festivals, perks, QR passbook, organiser tools).
 */
export const ECOSYSTEM = {
  master: {
    name: "AirPal",
    tagline: "Life Made Easy.",
    identity: "One Account · Universal Identity",
  },
  me: {
    id: "me",
    name: "AirPal.Me",
    shortName: "Me",
    coreJob: "Plan your day. Organise your life. Share who you are.",
    tagline: "My life, organised by AirPal.",
    path: "/",
  },
  pass: {
    id: "pass",
    name: "AirPal Pass",
    shortName: "Pass",
    coreJob: "Discover what's happening. Get access. Save money.",
    tagline: "Your pass to experiences.",
    path: "/pass",
  },
} as const;

