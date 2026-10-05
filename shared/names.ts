/**
 * Canonical words on AirPal. Use these in UI instead of inventing
 * Venue / Partner / Hub / Concierge / Me synonyms.
 * Source: docs/AIRPAL.md Part E. Do not relabel chrome without updating the single doc.
 */
export const NAMES = {
  explore: "Explore",
  plans: "Plans",
  plan: "Plan",
  stay: "Stay",
  circle: "Circle",
  scan: "Scan",
  place: "Place",
  places: "Places",
  addPlace: "Add your place",
  yourPlace: "Your place",
  /** Same AirPal login plus a live place. Not a second app or a second user. */
  partnerAccount: "Partner account",
  stayHost: "Stay host",
  account: "Account",
  experience: "Experience",
  experiences: "Experiences",
} as const;
