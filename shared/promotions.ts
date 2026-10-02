/**
 * AirPal Giveaways & Promotions (Phase 1).
 *
 * Engagement and discovery layer over the marketplace — NOT a gambling product.
 * No paid random-entry mechanics: entry is free, activity-based, or code-based,
 * and every campaign carries a configurable mechanicType + legalReviewStatus.
 * Publishing is blocked unless legal review is satisfied.
 */

export const PROMOTION_KINDS = ["giveaway", "promotion"] as const;
export type PromotionKind = (typeof PROMOTION_KINDS)[number];

export const MECHANIC_TYPES = [
  "giveaway",
  "free_entry",
  "discount",
  "offer",
  "reward",
  "challenge",
  "referral",
  "business_campaign",
  "member",
] as const;
export type MechanicType = (typeof MECHANIC_TYPES)[number];

export const PROMOTION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "scheduled",
  "live",
  "paused",
  "closed",
  "rejected",
  "archived",
] as const;
export type PromotionStatus = (typeof PROMOTION_STATUSES)[number];

export const LEGAL_REVIEW_STATUSES = ["not_required", "pending", "approved", "rejected"] as const;
export type LegalReviewStatus = (typeof LEGAL_REVIEW_STATUSES)[number];

export const PROMOTION_CATEGORIES = [
  "Experiences",
  "Stays",
  "Food",
  "Fashion",
  "Travel",
  "Events",
  "AirPal",
  "Local",
  "Family",
  "Lifestyle",
] as const;
export type PromotionCategory = (typeof PROMOTION_CATEGORIES)[number];

export const ENTRY_METHODS = ["free_online", "activity", "promo_code", "referral", "other"] as const;
export type EntryMethod = (typeof ENTRY_METHODS)[number];

export const WINNER_STATUSES = [
  "selected",
  "pending_verification",
  "verified",
  "contacted",
  "accepted",
  "declined",
  "disqualified",
  "prize_sent",
  "completed",
] as const;
export type WinnerStatus = (typeof WINNER_STATUSES)[number];

export interface PromotionPrize {
  title: string;
  description: string;
  valueText: string;
  imageUrl?: string;
  included?: string[];
}

export interface Promotion {
  id: string;
  kind: PromotionKind;
  type: string;
  title: string;
  slug: string;
  description: string;
  status: PromotionStatus;
  mechanicType: MechanicType;
  legalReviewStatus: LegalReviewStatus;
  sponsorId: string;
  sponsorName: string;
  category: string;
  heroImage: string;
  gallery: string[];
  prize: PromotionPrize;
  prizeValue: string;
  eligibility: string;
  entryRules: string;
  entryMethod: EntryMethod;
  entryLimit: number;
  startAt: string;
  endAt: string;
  winnerAnnouncementAt: string;
  winnerSelectionMethod: string;
  termsText: string;
  privacyNote: string;
  jurisdiction: string;
  contactEmail: string;
  targetType: string;
  targetId: string;
  locationText: string;
  featured: boolean;
  /** Optional promo code required at entry time (entryMethod promo_code). */
  promoCode?: string;
  /** Points cost to redeem this member offer (mechanicType member). */
  pointsCost?: number;
  /**
   * Global entry cap (e.g. a founding pool of the first 100,000 entries).
   * Enforced server-side inside a transaction. Absent = uncapped.
   */
  entriesCap?: number;
  /** Privacy-conscious counters, maintained server-side. */
  viewsCount?: number;
  clicksCount?: number;
  entriesCount?: number;
  entriesFrozenAt?: string;
  entriesFrozenCount?: number;
  /** Public, masked winner line, e.g. "Won by entry ENT-AIRP-••42". */
  winnerNote?: string;
  /** Last ending-soon reminder sweep, to avoid repeat nudges. */
  remindedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  ownerUid: string;
}

export interface PromotionEntry {
  id: string;
  promotionId: string;
  uid: string;
  reference: string;
  /** Referrer uid, when the entrant arrived via a mate's share link. */
  referrerUid?: string;
  /** Sequential founding-pool number, assigned server-side on capped campaigns. */
  founderNumber?: number;
  status: string;
  createdAt: string;
}

export interface EnterPromotionResponse {
  ok: boolean;
  duplicate: boolean;
  reference: string;
  /** Sequential founding-pool number for this entry, on capped campaigns. */
  founderNumber?: number;
  /** Remaining founding-pool spots after this entry, on capped campaigns. */
  spotsLeft?: number;
}

export interface PromotionAuditLog {
  id: string;
  promotionId: string;
  actorUid: string;
  action: string;
  from: string;
  to: string;
  reason: string;
  at: string;
}

/** Transitions a business owner may request on their own campaign. */
const OWNER_TRANSITIONS: Record<PromotionStatus, PromotionStatus[]> = {
  draft: ["submitted", "archived"],
  submitted: ["draft", "archived"],
  under_review: ["draft"],
  approved: [],
  scheduled: [],
  live: ["paused"],
  paused: ["live"],
  closed: ["archived"],
  rejected: ["draft"],
  archived: ["draft"],
};

export function ownerCanTransition(from: PromotionStatus, to: PromotionStatus): boolean {
  return (OWNER_TRANSITIONS[from] || []).includes(to);
}

/** Admins may move between any two distinct non-identical states except out of archived (must duplicate). */
export function adminCanTransition(from: PromotionStatus, to: PromotionStatus): boolean {
  if (from === to) return false;
  if (from === "archived" && to !== "draft") return false;
  return (PROMOTION_STATUSES as readonly string[]).includes(to);
}

/**
 * Publishing gate: a campaign may go live only when legal review is satisfied.
 * "not_required" covers plain discounts/offers; anything chance-based needs "approved".
 */
export function legalGateSatisfied(p: Pick<Promotion, "mechanicType" | "legalReviewStatus">): boolean {
  if (p.legalReviewStatus === "rejected") return false;
  if (p.legalReviewStatus === "approved" || p.legalReviewStatus === "not_required") return true;
  return false;
}

export function canPublish(p: Pick<Promotion, "mechanicType" | "legalReviewStatus" | "status">): boolean {
  if (p.status !== "approved" && p.status !== "scheduled") return false;
  return legalGateSatisfied(p);
}

export function entryReferenceFor(promotionId: string): string {
  const prefix = promotionId
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 4)
    .toUpperCase();
  const suffix = String(10000 + Math.floor(Math.random() * 90000));
  return `ENT-${prefix || "AP"}-${suffix}`;
}

export function validatePromotionDraft(input: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!String(input.title || "").trim()) errors.push("Title is required.");
  if (!String(input.description || "").trim()) errors.push("Description is required.");
  if (!String(input.sponsorName || "").trim()) errors.push("Sponsor name is required.");
  if (!String(input.termsText || "").trim()) errors.push("Terms and conditions are required.");
  if (!String(input.startAt || "").trim()) errors.push("Start date is required.");
  if (!String(input.endAt || "").trim()) errors.push("End date is required.");
  const start = Date.parse(String(input.startAt || ""));
  const end = Date.parse(String(input.endAt || ""));
  if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
    errors.push("End date must be after the start date.");
  }
  const limit = Number(input.entryLimit ?? 1);
  if (!Number.isFinite(limit) || limit < 1) errors.push("Entry limit must be at least 1.");
  return errors;
}

export type CreatePromotionRequest = {
  kind: PromotionKind;
  mechanicType: MechanicType;
  title: string;
  description: string;
  sponsorName: string;
  category: string;
  heroImage?: string;
  prizeTitle?: string;
  prizeDescription?: string;
  prizeValue?: string;
  eligibility?: string;
  entryRules?: string;
  entryMethod?: EntryMethod;
  entryLimit?: number;
  startAt: string;
  endAt: string;
  winnerAnnouncementAt?: string;
  winnerSelectionMethod?: string;
  termsText: string;
  privacyNote?: string;
  jurisdiction?: string;
  contactEmail?: string;
  targetType?: string;
  targetId?: string;
  locationText?: string;
};

export type ReviewPromotionRequest = {
  promotionId: string;
  decision:
    | "approve"
    | "reject"
    | "request_changes"
    | "publish"
    | "pause"
    | "resume"
    | "close"
    | "archive"
    | "feature"
    | "unfeature";
  reason?: string;
};

export type EnterPromotionRequest = {
  promotionId: string;
  /** Promotional code, when the campaign requires one. */
  code?: string;
  /** Referrer uid, when the entrant arrived via a mate's share link. */
  ref?: string;
};

export interface FoundingPoolState {
  capped: boolean;
  cap: number;
  used: number;
  left: number;
  full: boolean;
  /** 0–100, rounded, for progress display. */
  percent: number;
}

/** Pure pool math for founding-pool campaigns (first-N entries win a place). */
export function foundingPoolState(entriesCount: unknown, entriesCap: unknown): FoundingPoolState {
  const cap = Math.floor(Number(entriesCap || 0));
  if (!(cap > 0)) return { capped: false, cap: 0, used: 0, left: 0, full: false, percent: 0 };
  const used = Math.max(0, Math.min(cap, Math.floor(Number(entriesCount || 0))));
  const left = cap - used;
  return { capped: true, cap, used, left, full: left <= 0, percent: Math.round((used / cap) * 100) };
}

export const WINNER_TRANSITIONS: Record<WinnerStatus, WinnerStatus[]> = {
  selected: ["pending_verification", "disqualified"],
  pending_verification: ["verified", "disqualified"],
  verified: ["contacted", "disqualified"],
  contacted: ["accepted", "declined", "disqualified"],
  accepted: ["prize_sent"],
  declined: [],
  disqualified: [],
  prize_sent: ["completed"],
  completed: [],
};

export function winnerCanTransition(from: WinnerStatus, to: WinnerStatus): boolean {
  return (WINNER_TRANSITIONS[from] || []).includes(to);
}

export const NOTIFICATION_KINDS = [
  "giveaway_launched",
  "entry_confirmed",
  "promotion_ending_soon",
  "promotion_closed",
  "winner_selected",
  "winner_verification",
  "prize_available",
  "promotion_approved",
  "promotion_rejected",
  "campaign_submitted",
  "campaign_changes_requested",
  "referral_bonus",
  "points_redeemed",
  "winner_update",
  "announcement",
  "here",
  "wave",
  "catchup_proposed",
  "catchup_scheduled",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** Kinds routed to the Inbox Updates segment (AirPal + circle announcements). */
export const UPDATE_NOTE_KINDS = ["announcement"] as const;

export function isUpdateNoteKind(kind: string): boolean {
  return (UPDATE_NOTE_KINDS as readonly string[]).includes(kind);
}

export interface PromotionNotification {
  id: string;
  uid: string;
  kind: NotificationKind;
  title: string;
  body: string;
  promotionId: string;
  href?: string;
  read: boolean;
  at: string;
}

export interface PromotionWinner {
  id: string;
  promotionId: string;
  uid: string;
  reference: string;
  status: WinnerStatus;
  drawIndex: number;
  drawnAt: string;
  note: string;
  updatedAt: string;
}

export interface RewardState {
  uid: string;
  points: number;
  updatedAt: string;
}

export interface RewardTransaction {
  id: string;
  uid: string;
  delta: number;
  reason: string;
  refId: string;
  at: string;
}

/** Points earned for legitimate activity. Never purchasable, never random entries. */
export const ENTRY_POINTS = 10;
export const REFERRAL_POINTS = 5;

export interface WeekCampaign {
  weekId: string;
  giveawayId: string;
  promotionId: string;
  experienceId: string;
  businessId: string;
  destination: string;
  note: string;
  updatedAt: string;
  updatedBy: string;
}

export function currentWeekId(now = new Date()): string {
  const year = now.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const week = Math.ceil(((now.getTime() - jan1) / 86400000 + new Date(jan1).getUTCDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Offer target kinds. Every offer lands on a transaction surface — never an ad link. */
export const OFFER_TARGET_TYPES = ["stay", "event", "place", "mate", "experience", "fashion"] as const;
export type OfferTargetType = (typeof OFFER_TARGET_TYPES)[number];

/** Target kinds that name a specific venue/doc and need a targetId. */
const VENUE_TARGET_TYPES: ReadonlySet<string> = new Set(["stay", "event", "place"]);

export function isOfferTargetType(t: string): t is OfferTargetType {
  return (OFFER_TARGET_TYPES as readonly string[]).includes(t);
}

/** Target is well-formed: known kind, and venue kinds name their venue. */
export function offerTargetValid(targetType: string, targetId: string): boolean {
  if (!isOfferTargetType(targetType.trim())) return false;
  if (VENUE_TARGET_TYPES.has(targetType.trim())) return targetId.trim().length > 0;
  return true;
}

/** Deep link for a campaign's marketplace target. Empty when unmapped. */
export function targetHref(targetType: string, targetId: string): string {
  if (!offerTargetValid(targetType, targetId)) return "";
  switch (targetType.trim()) {
    case "stay":
      return `/g/${targetId.trim()}`;
    case "event":
      return `/e/${targetId.trim()}`;
    case "place":
      return `/p/${targetId.trim()}`;
    case "mate":
      return "/mate";
    case "experience":
      return "/experiences";
    case "fashion":
      return "/fashion";
    default:
      return "";
  }
}

export type DrawWinnersRequest = {
  promotionId: string;
  winnerCount: number;
};

export type SetWinnerStatusRequest = {
  winnerId: string;
  to: WinnerStatus;
  note?: string;
};

export type RedeemPointsRequest = {
  promotionId: string;
};

export type SetWeeklyCampaignRequest = {
  weekId: string;
  giveawayId?: string;
  promotionId?: string;
  experienceId?: string;
  businessId?: string;
  destination?: string;
  note?: string;
};
