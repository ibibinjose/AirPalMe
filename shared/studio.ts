/** AirPal Studio: one backend for stays, venues, events and brands. */

export interface WalkthroughInput {
  name: string;
  business: string;
  email: string;
  phone: string;
  kind: string;
  preferredDay: string;
  notes: string;
}

export const WALKTHROUGH_KINDS = ["Hotel / Stay", "Venue / Hospitality", "Events / Organiser", "Brand / Retail", "Other"];

export function emptyWalkthrough(): WalkthroughInput {
  return { name: "", business: "", email: "", phone: "", kind: "Venue / Hospitality", preferredDay: "", notes: "" };
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function walkthroughValid(input: WalkthroughInput): boolean {
  return (
    input.name.trim().length >= 2 &&
    input.business.trim().length >= 2 &&
    isEmail(input.email) &&
    input.phone.replace(/\D/g, "").length >= 8 &&
    WALKTHROUGH_KINDS.includes(input.kind)
  );
}
