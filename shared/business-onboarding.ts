/** Business onboarding: Find Your Venue → Owner Details → Verify Claim → Choose Plan → Review & Sign-Off. */

export const ONBOARD_STEPS = [
  { id: "venue", label: "Find Your Venue" },
  { id: "owner", label: "Owner Details" },
  { id: "verify", label: "Verify Claim" },
  { id: "plan", label: "Choose Plan" },
  { id: "review", label: "Review & Sign-Off" },
] as const;

export type OnboardStepId = (typeof ONBOARD_STEPS)[number]["id"];

export type BusinessPlanId = "presence" | "featured" | "partner";

export interface BusinessPlan {
  id: BusinessPlanId;
  name: string;
  price: string;
  blurb: string;
  perks: string[];
}

/** Placeholder pricing — confirm with the founder before launch. */
export const BUSINESS_PLANS: BusinessPlan[] = [
  {
    id: "presence",
    name: "Presence",
    price: "Free",
    blurb: "Get found. Your venue in the AirPal directory with a scannable QR.",
    perks: ["Directory listing", "Guest reviews", "Print-at-home QR kit"],
  },
  {
    id: "featured",
    name: "Featured",
    price: "$49/mo",
    blurb: "Stand out when visitors are deciding where to go.",
    perks: ["Everything in Presence", "Top placement in Explore", "One guest deal with QR redemption"],
  },
  {
    id: "partner",
    name: "Partner",
    price: "Custom",
    blurb: "AirPal runs experiences with you and brings the crowd.",
    perks: ["Everything in Featured", "Co-hosted AirPal Experiences", "Bookings, analytics & campaign reports"],
  },
];

export interface VenueSelection {
  mode: "listed" | "unlisted";
  venueId: string;
  venueName: string;
}

export interface OwnerDetails {
  name: string;
  email: string;
  phone: string;
  role: string;
  abnOrTaxId: string;
  customPerk: string;
}

export interface VerifyDetails {
  workEmailMatches: boolean;
  abnProvided: boolean;
  authorityConfirmed: boolean;
}

export interface OnboardDraft {
  venue: VenueSelection;
  owner: OwnerDetails;
  verify: VerifyDetails;
  plan: BusinessPlanId;
  address: string;
  category: string;
  shortWhy: string;
  hours: string;
  acceptedTerms: boolean;
}

export function emptyDraft(): OnboardDraft {
  return {
    venue: { mode: "listed", venueId: "", venueName: "" },
    owner: { name: "", email: "", phone: "", role: "Owner", abnOrTaxId: "", customPerk: "" },
    verify: { workEmailMatches: false, abnProvided: false, authorityConfirmed: false },
    plan: "presence",
    address: "",
    category: "eat",
    shortWhy: "",
    hours: "",
    acceptedTerms: false,
  };
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function isPhone(value: string): boolean {
  return value.replace(/\D/g, "").length >= 8;
}

export function venueStepValid(d: OnboardDraft): boolean {
  if (d.venue.mode === "listed") return d.venue.venueId.trim().length > 0;
  return (
    d.venue.venueName.trim().length >= 2 &&
    d.address.trim().length >= 4 &&
    d.shortWhy.trim().length >= 10
  );
}

export function ownerStepValid(d: OnboardDraft): boolean {
  const o = d.owner;
  return o.name.trim().length >= 2 && isEmail(o.email) && isPhone(o.phone) && o.role.trim().length > 0;
}

export function verifyStepValid(d: OnboardDraft): boolean {
  const v = d.verify;
  const evidence = (v.workEmailMatches ? 1 : 0) + (v.abnProvided && d.owner.abnOrTaxId.trim() ? 1 : 0);
  return evidence >= 1 && v.authorityConfirmed;
}

export function reviewReady(d: OnboardDraft): boolean {
  return venueStepValid(d) && ownerStepValid(d) && verifyStepValid(d) && d.acceptedTerms;
}
