/**
 * Partnership inquiries (AirPal.me/partner). Distinct from support (/contact)
 * and from applications (/business/onboard): this is the first handshake —
 * who they are, what they run, and how to reach them. Admin triages from
 * the Studio tab; the relationship itself starts in onboarding.
 */

export const PARTNER_SEGMENTS = [
  { id: "stay", label: "Stay", hint: "Hotels, motels, serviced apartments, hostels" },
  { id: "experience", label: "Experience", hint: "Tours, classes, culture, adventure" },
  { id: "event", label: "Event & festival", hint: "Public events and festival weeks" },
  { id: "fashion", label: "Fashion", hint: "Brands, rentals, campaigns" },
  { id: "other", label: "Something else", hint: "Tell us in your message" },
] as const;
export type PartnerSegment = (typeof PARTNER_SEGMENTS)[number]["id"];

export const PARTNER_SOURCES = [
  { id: "google", label: "Google" },
  { id: "ai", label: "AI" },
  { id: "word", label: "Word of mouth" },
  { id: "other", label: "Other" },
] as const;
export type PartnerSource = (typeof PARTNER_SOURCES)[number]["id"];

export type PartnerLeadStatus = "new" | "contacted" | "archived";

export interface PartnerLead {
  id: string;
  segment: PartnerSegment;
  source: PartnerSource;
  company: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: PartnerLeadStatus;
  createdAt: string;
  updatedAt: string;
}

export function isPartnerSegment(value: string): value is PartnerSegment {
  return PARTNER_SEGMENTS.some((s) => s.id === value);
}

export function isPartnerSource(value: string): value is PartnerSource {
  return PARTNER_SOURCES.some((s) => s.id === value);
}

export function isPartnerEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** Validation errors for the partner form. Empty means valid. */
export function validatePartnerLead(input: {
  segment: string;
  source: string;
  company: string;
  name: string;
  email: string;
  phone: string;
  message: string;
}): string[] {
  const errors: string[] = [];
  if (!isPartnerSegment(input.segment)) errors.push("Choose what kind of partner you are.");
  if (!isPartnerSource(input.source)) errors.push("Tell us how you found us.");
  if (!input.company.trim()) errors.push("Company name is required.");
  else if (input.company.trim().length > 120) errors.push("Company name is too long.");
  if (!input.name.trim()) errors.push("Your name is required.");
  else if (input.name.trim().length > 80) errors.push("Name is too long.");
  if (!isPartnerEmail(input.email)) errors.push("Enter a valid email.");
  if (input.phone.trim() && input.phone.trim().length > 40) errors.push("Phone number is too long.");
  if (input.message.trim().length < 10) errors.push("Tell us a little more (10+ characters).");
  else if (input.message.trim().length > 2000) errors.push("Message is too long (2000 max).");
  return errors;
}
