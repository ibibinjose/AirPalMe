/**
 * Unified notifications & creator messaging.
 *
 * Transactional notifications (entries, winners, reviews) send immediately.
 * Circle announcements go to people who follow you — your audience, not the
 * whole platform. Campaign / everyone blasts still need admin approval.
 */

export const BROADCAST_STATUSES = ["draft", "submitted", "approved", "rejected", "sent"] as const;
export type BroadcastStatus = (typeof BROADCAST_STATUSES)[number];

export const BROADCAST_AUDIENCES = ["circle", "promotion_entrants", "everyone"] as const;
export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number];

export const CIRCLE_BROADCAST_CAP = 250;

export function broadcastNeedsReview(audience: string): boolean {
  return audience === "everyone" || audience === "promotion_entrants";
}

export interface Broadcast {
  id: string;
  ownerUid: string;
  title: string;
  body: string;
  href: string;
  audience: BroadcastAudience;
  promotionId: string;
  status: BroadcastStatus;
  reviewReason: string;
  sentCount: number;
  createdAt: string;
  updatedAt: string;
  sentAt: string;
}

/** Popup-worthy: shown in-app on top of everything, once each. */
export const PRIORITY_KINDS = ["winner_selected", "prize_available", "winner_verification"] as const;

/** Marketing mail: only pushed/sent when the user kept marketing notifications on. */
export const MARKETING_KINDS = ["giveaway_launched", "promotion_ending_soon"] as const;

export function isMarketingKind(kind: string): boolean {
  return (MARKETING_KINDS as readonly string[]).includes(kind);
}

export function isPriorityKind(kind: string): boolean {
  return (PRIORITY_KINDS as readonly string[]).includes(kind);
}

export function validateBroadcast(input: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!String(input.title || "").trim()) errors.push("Title is required.");
  if (String(input.title || "").length > 80) errors.push("Title must be 80 characters or fewer.");
  if (!String(input.body || "").trim()) errors.push("Message is required.");
  if (String(input.body || "").length > 280) errors.push("Message must be 280 characters or fewer.");
  if (input.audience === "promotion_entrants" && !String(input.promotionId || "")) {
    errors.push("Choose the campaign whose entrants should receive this.");
  }
  if (input.audience && !BROADCAST_AUDIENCES.includes(input.audience as BroadcastAudience)) {
    errors.push("Choose who should receive this.");
  }
  return errors;
}

export type CreateBroadcastRequest = {
  title: string;
  body: string;
  href?: string;
  audience: BroadcastAudience;
  promotionId?: string;
};

export type ReviewBroadcastRequest = {
  broadcastId: string;
  decision: "approve" | "reject";
  reason?: string;
};
