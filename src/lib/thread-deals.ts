import type { PlaceDeal } from "@shared/nearby";
import { claimCode, loadClaim, saveClaim, type BioClaim } from "./bio-claims";

export type ThreadDeal = {
  handle: string;
  dealId: string;
  badge: string;
  detail: string;
  expiry?: string;
  claimHint?: string;
};

/** Stable claim key per venue: listing deals live apart from bio catalog deals. */
export function threadDealId(placeId: string): string {
  return `listing:${placeId}`;
}

export function threadDealForStop(
  stop: { placeId?: string },
  lookup: (placeId: string) => { handle?: string; deal?: PlaceDeal } | undefined,
): ThreadDeal | null {
  if (!stop.placeId) return null;
  const place = lookup(stop.placeId);
  if (!place?.handle || !place.deal) return null;
  return {
    handle: place.handle,
    dealId: threadDealId(stop.placeId),
    badge: place.deal.badge,
    detail: place.deal.detail,
    expiry: place.deal.expiry,
    claimHint: place.deal.claimHint,
  };
}

export function loadThreadDealClaim(deal: Pick<ThreadDeal, "handle" | "dealId">): BioClaim | undefined {
  return loadClaim(deal.handle, deal.dealId);
}

/** Claim the venue deal for the thread: local 24h code, honoring an earlier deal expiry. */
export function claimThreadDeal(deal: ThreadDeal, nowMs = Date.now()): BioClaim {
  const dayMs = 24 * 60 * 60 * 1000;
  let expiresAt = new Date(nowMs + dayMs).toISOString();
  if (deal.expiry) {
    const dealEnd = new Date(deal.expiry).getTime();
    if (Number.isFinite(dealEnd) && dealEnd > nowMs && dealEnd < nowMs + dayMs) {
      expiresAt = new Date(dealEnd).toISOString();
    }
  }
  return saveClaim({
    handle: deal.handle,
    dealId: deal.dealId,
    code: claimCode(),
    badge: deal.badge,
    detail: deal.detail,
    expiresAt,
  });
}
