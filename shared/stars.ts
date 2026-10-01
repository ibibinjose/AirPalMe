/**
 * AirPal Stars: earn, never buy. Stars vest when someone you invited
 * completes their first real experience — signups alone earn nothing
 * (downloads are not the North Star). Stars unlock status tiers, not money.
 */

export const REFERRAL_INVITER_STARS = 100;
export const REFERRAL_INVITEE_STARS = 50;

export interface StarTier {
  /** Minimum lifetime stars to hold the tier. */
  stars: number;
  name: string;
  blurb: string;
}

export const STAR_TIERS: StarTier[] = [
  { stars: 0, name: "New Mate", blurb: "Welcome in — invite mates to earn." },
  { stars: 50, name: "Rising Mate", blurb: "Your crew is showing up." },
  { stars: 150, name: "Superconnector", blurb: "Three tables would fight over you." },
  { stars: 300, name: "City Legend", blurb: "Sydney runs on your group chats." },
];

/** Highest tier the balance earns. */
export function tierForBalance(balance: number): StarTier {
  let tier = STAR_TIERS[0]!;
  for (const t of STAR_TIERS) {
    if (balance >= t.stars) tier = t;
  }
  return tier;
}

/** Next tier above the balance, or null at the top. */
export function nextTier(balance: number): StarTier | null {
  for (const t of STAR_TIERS) {
    if (t.stars > balance) return t;
  }
  return null;
}

export type StarLedgerReason = "referral_inviter" | "referral_invitee";

export interface StarLedgerEntry {
  uid: string;
  stars: number;
  reason: StarLedgerReason;
  /** Referral doc id (invitee uid) that vested these stars. */
  refId: string;
  createdAt: string;
}

export interface ReferralRewardInput {
  inviterUid?: unknown;
  inviteeUid?: unknown;
  rewardedAt?: unknown;
}

/**
 * Stars for a first completed experience: both sides earn, once. Null when
 * there is no referral, the completer isn't the invitee, or it already paid.
 */
export function computeReferralReward(
  referral: ReferralRewardInput | null | undefined,
  completerUid: string,
): { inviterUid: string; inviteeUid: string } | null {
  const inviterUid = String(referral?.inviterUid || "").trim();
  const inviteeUid = String(referral?.inviteeUid || "").trim();
  if (!inviterUid || !inviteeUid) return null;
  if (inviterUid === inviteeUid) return null;
  if (completerUid !== inviteeUid) return null;
  if (referral?.rewardedAt) return null;
  return { inviterUid, inviteeUid };
}
