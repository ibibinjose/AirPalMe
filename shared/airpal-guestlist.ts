/**
 * AirPal Guestlist — the marketing signup for event invitations by city.
 * (Not the per-event door guestlist in `./guestlist`: this is the mailing
 * list people join from bios with Name, City, Email + interest opt-ins.)
 *
 * Signups land in `guestlist_signups` via callable only, keyed by
 * normalized email so re-subscribes update instead of duplicating.
 * Consent is captured per submit for Spam Act honesty; sending itself
 * needs a real ESP sender, which is a follow-up with brand keys.
 */

export const GUESTLIST_INTERESTS = [
  { id: "events", label: "Live events" },
  { id: "nightlife", label: "Nightlife" },
  { id: "food", label: "Food & drink" },
  { id: "arts", label: "Arts & culture" },
] as const;

export type GuestlistInterest = (typeof GUESTLIST_INTERESTS)[number]["id"];

/** Consent line shown on the form; versioned so audits can quote it. */
export const GUESTLIST_CONSENT_V1 = "Yes — email me event invites from AirPal.Me. I can unsubscribe anytime.";

export interface GuestlistSignupInput {
  name: string;
  city: string;
  email: string;
  interests: GuestlistInterest[];
  /** Which bio surface referred them, e.g. a venue @handle. */
  source?: string;
}

export function isGuestlistInterest(value: unknown): value is GuestlistInterest {
  return (
    typeof value === "string" && (GUESTLIST_INTERESTS as readonly { id: string }[]).some((item) => item.id === value)
  );
}

export function normalizeSignupEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Firestore doc id: the normalized email. Deterministic dedupe. */
export function guestlistSignupId(email: string): string {
  return normalizeSignupEmail(email);
}

/**
 * Shared validation, client copy and server enforcement. Returns error
 * strings (empty when valid) so the form can show the first problem.
 */
export function validateGuestlistSignup(input: {
  name?: unknown;
  city?: unknown;
  email?: unknown;
  interests?: unknown;
  source?: unknown;
}): string[] {
  const problems: string[] = [];
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 1) problems.push("Add your name.");
  else if (name.length > 80) problems.push("Keep your name under 80 characters.");
  const city = typeof input.city === "string" ? input.city.trim() : "";
  if (city.length < 1) problems.push("Choose your city.");
  else if (city.length > 60) problems.push("Keep your city under 60 characters.");
  const email = typeof input.email === "string" ? normalizeSignupEmail(input.email) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) problems.push("Add a valid email address.");
  else if (email.length > 160) problems.push("That email address is too long.");
  const interests = Array.isArray(input.interests) ? input.interests : null;
  if (!interests) problems.push("Invalid interests selection.");
  else if (interests.length > GUESTLIST_INTERESTS.length) problems.push("Too many interests selected.");
  else if (!interests.every(isGuestlistInterest)) problems.push("Unknown interest selected.");
  if (input.source !== undefined && (typeof input.source !== "string" || input.source.length > 60)) {
    problems.push("Invalid signup source.");
  }
  return problems;
}
