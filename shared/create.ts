/**
 * Unified creation catalog (AirPal.me/create). One AirPal account, two
 * hats: every signed-in user is an individual; partner tools unlock once
 * the account holds a partner profile (business bio or stay property).
 * The hub routes — it never duplicates the builders.
 */

export type CreateAudience = "individual" | "partner";

export interface CreateItem {
  id: string;
  label: string;
  hint: string;
  href: string;
  audience: CreateAudience;
}

export const CREATE_ITEMS: CreateItem[] = [
  { id: "plan", label: "Plan", hint: "Make a plan with mates", href: "/plan/new", audience: "individual" },
  { id: "mate-request", label: "Mate request", hint: "Find someone to go with", href: "/mate/request", audience: "individual" },
  { id: "mate-apply", label: "Become a Mate", hint: "Get paid to go with people", href: "/companion", audience: "individual" },
  { id: "pulse", label: "Pulse", hint: "A live moment from where you are", href: "/pulse", audience: "individual" },
  { id: "event", label: "Event", hint: "Expo, market, or ticketed night", href: "/event", audience: "individual" },
  { id: "festival", label: "Festival week", hint: "A multi-day program of sessions", href: "/f/new", audience: "individual" },
  { id: "business", label: "Business", hint: "List by category — eat, shop, services", href: "/business/onboard", audience: "partner" },
  { id: "stay", label: "Stay property", hint: "Rooms, rates, availability", href: "/host", audience: "partner" },
  { id: "promotion", label: "Promotion", hint: "Discounts, perks, coupons", href: "/business/promotions/new", audience: "partner" },
  { id: "campaigns", label: "Campaigns", hint: "Funded experiences and offers", href: "/business/campaigns", audience: "partner" },
];

/** Partner tools need a partner profile on the account. Individuals get the personal set. */
export function createItemsFor(context: {
  signedIn: boolean;
  hasPartnerProfile: boolean;
}): { individual: CreateItem[]; partner: CreateItem[]; gated: CreateItem[] } {
  const individual = CREATE_ITEMS.filter((i) => i.audience === "individual");
  const partner = CREATE_ITEMS.filter((i) => i.audience === "partner");
  if (!context.signedIn || !context.hasPartnerProfile) {
    return { individual, partner: [], gated: partner };
  }
  return { individual, partner, gated: [] };
}

export function hasPartnerProfile(context: { businessHandle?: string | null; propertyCount?: number }): boolean {
  return Boolean(context.businessHandle) || (context.propertyCount || 0) > 0;
}
