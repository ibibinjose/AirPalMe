/** Business onboarding: Register → You → Verify → Go live. */

import type { GooglePlaceImport } from "./google-place";
import { emailMatchesWebsite } from "./google-place";

export const ONBOARD_STEPS = [
  { id: "venue", label: "Register" },
  { id: "owner", label: "You" },
  { id: "verify", label: "Verify" },
  { id: "review", label: "Go live" },
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
  googleListingConfirmed: boolean;
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
  googlePlaceId: string;
  website: string;
  logoUrl: string;
  heroImage: string;
  menuUrl: string;
  googleMapsUri: string;
  geo?: { lat: number; lng: number };
  phoneFromGoogle: string;
}

export function emptyDraft(): OnboardDraft {
  return {
    venue: { mode: "unlisted", venueId: "", venueName: "" },
    owner: { name: "", email: "", phone: "", role: "Owner", abnOrTaxId: "", customPerk: "" },
    verify: { workEmailMatches: false, abnProvided: false, authorityConfirmed: false, googleListingConfirmed: false },
    plan: "presence",
    address: "",
    category: "eat",
    shortWhy: "",
    hours: "",
    acceptedTerms: false,
    googlePlaceId: "",
    website: "",
    logoUrl: "",
    heroImage: "",
    menuUrl: "",
    googleMapsUri: "",
    phoneFromGoogle: "",
  };
}

export function applyGooglePlace(d: OnboardDraft, place: GooglePlaceImport): OnboardDraft {
  const workEmailMatches = emailMatchesWebsite(d.owner.email, place.website) || d.verify.workEmailMatches;
  return {
    ...d,
    venue: { mode: "unlisted", venueId: "", venueName: place.name },
    address: place.address,
    category: place.category,
    shortWhy: place.shortWhy,
    hours: place.hours,
    googlePlaceId: place.placeId,
    website: place.website,
    logoUrl: place.photoNames[0] || "",
    heroImage: place.photoNames[0] || "",
    menuUrl: place.menuUrl,
    googleMapsUri: place.googleMapsUri,
    geo: place.geo,
    phoneFromGoogle: place.phone,
    owner: {
      ...d.owner,
      phone: d.owner.phone.trim() || place.phone,
    },
    verify: {
      ...d.verify,
      workEmailMatches,
      googleListingConfirmed: d.verify.googleListingConfirmed,
    },
  };
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function isPhone(value: string): boolean {
  return value.replace(/\D/g, "").length >= 8;
}

/** First screen: name (typed or imported from Google) and a category. Address can wait for Google. */
export function nameStepValid(d: OnboardDraft): boolean {
  return d.venue.venueName.trim().length >= 2 && d.category.trim().length > 0;
}

export function venueStepValid(d: OnboardDraft): boolean {
  if (!nameStepValid(d)) return false;
  if (d.googlePlaceId.trim().length > 8 && d.address.trim().length >= 4) return true;
  if (d.venue.mode === "listed") return d.venue.venueId.trim().length > 0;
  return d.address.trim().length >= 4;
}

export function ownerStepValid(d: OnboardDraft): boolean {
  const o = d.owner;
  return o.name.trim().length >= 2 && isEmail(o.email) && isPhone(o.phone) && o.role.trim().length > 0;
}

export function verifyStepValid(d: OnboardDraft): boolean {
  return d.verify.authorityConfirmed;
}

/** ABN / tax id long enough to treat as a business proof (not a Google ownership check). */
export function abnProof(d: OnboardDraft): boolean {
  return d.owner.abnOrTaxId.replace(/\s/g, "").length >= 8;
}

/**
 * Signed-in email (preferred) sits on the same domain as the Google website.
 * A typed contact address or “I manage this listing” checkbox is not ownership.
 */
export function googleOwnerVerified(d: OnboardDraft, signedInEmail?: string): boolean {
  const email = (signedInEmail || d.owner.email).trim();
  return d.googlePlaceId.trim().length > 8 && emailMatchesWebsite(email, d.website);
}

/** Paid Featured needs domain proof or an ABN. A Google import checkbox is not enough. */
export function canPublishFeatured(d: OnboardDraft, signedInEmail?: string): boolean {
  return googleOwnerVerified(d, signedInEmail) || abnProof(d);
}

export function clampBusinessPlan(plan: string, proof: { domain: boolean; abn: boolean }): BusinessPlanId {
  const id: BusinessPlanId = plan === "featured" || plan === "partner" ? plan : "presence";
  if (id === "presence") return "presence";
  return proof.domain || proof.abn ? id : "presence";
}

export function resolvedPlan(d: OnboardDraft, signedInEmail?: string): BusinessPlanId {
  return clampBusinessPlan(d.plan, { domain: googleOwnerVerified(d, signedInEmail), abn: abnProof(d) });
}

export function reviewReady(d: OnboardDraft): boolean {
  return venueStepValid(d) && ownerStepValid(d) && verifyStepValid(d) && d.acceptedTerms;
}
