/**
 * AirPal B2B engine: a business funds an Experience, AirPal recruits guests,
 * tracks bookings and reports back. Money movement is Stripe-shaped but deferred —
 * `paymentStatus` stays "deferred" until Stripe lands.
 */

export const CAMPAIGN_STATUSES = ["draft", "pending", "live", "completed", "cancelled"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_CATEGORIES = [
  "Cooking",
  "Fitness",
  "Culture",
  "Travel",
  "Art",
  "Music",
  "Fashion",
  "Food",
  "Food & Drink",
  "Community",
  "Adventure",
] as const;

export interface Campaign {
  id: string;
  ownerUid: string;
  businessName: string;
  venueId: string;
  title: string;
  brief: string;
  category: string;
  suburb: string;
  date: string;
  time: string;
  capacity: number;
  recruitTarget: number;
  budgetCents: number;
  priceCents: number;
  paymentStatus: "deferred";
  status: CampaignStatus;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignInput {
  businessName: string;
  venueId: string;
  title: string;
  brief: string;
  category: string;
  suburb: string;
  date: string;
  time: string;
  capacity: number;
  recruitTarget: number;
  budgetCents: number;
  priceCents: number;
}

export function emptyCampaign(): CampaignInput {
  return {
    businessName: "",
    venueId: "",
    title: "",
    brief: "",
    category: CAMPAIGN_CATEGORIES[0],
    suburb: "",
    date: "",
    time: "",
    capacity: 20,
    recruitTarget: 20,
    budgetCents: 100000,
    priceCents: 0,
  };
}

export function isCampaignStatus(s: string): s is CampaignStatus {
  return (CAMPAIGN_STATUSES as readonly string[]).includes(s);
}

export function campaignValid(input: CampaignInput): boolean {
  return (
    input.businessName.trim().length >= 2 &&
    input.title.trim().length >= 4 &&
    input.brief.trim().length >= 20 &&
    (CAMPAIGN_CATEGORIES as readonly string[]).includes(input.category) &&
    input.suburb.trim().length >= 2 &&
    /^\d{4}-\d{2}-\d{2}$/.test(input.date) &&
    Number.isInteger(input.capacity) && input.capacity >= 2 && input.capacity <= 500 &&
    Number.isInteger(input.recruitTarget) && input.recruitTarget >= 1 && input.recruitTarget <= input.capacity &&
    Number.isInteger(input.budgetCents) && input.budgetCents >= 0 &&
    Number.isInteger(input.priceCents) && input.priceCents >= 0
  );
}

export function aud(cents: number): string {
  return cents === 0 ? "Free" : `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/** Projected guest revenue at current bookings. Pre-Stripe: indicative only. */
export function projectedRevenue(priceCents: number, bookings: number): number {
  return priceCents * Math.max(0, bookings);
}

export function fillRate(bookings: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(1, Math.max(0, bookings / capacity));
}
