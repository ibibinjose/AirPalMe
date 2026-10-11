/**
 * C4 — AirPal Partner: one Stripe Billing subscription per business account,
 * behind a live place on the same login. Base tools (place, offers,
 * bookings) stay free; campaigns are the Partner tool.
 */

export const SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface BusinessSubscription {
  uid: string;
  status: SubscriptionStatus | string;
  priceId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  /** Unix seconds. Absent while Stripe has not reported a period yet. */
  currentPeriodEnd?: number;
  updatedAt: string;
}

export function isSubscriptionStatus(s: string): s is SubscriptionStatus {
  return (SUBSCRIPTION_STATUSES as readonly string[]).includes(s);
}

/**
 * Partner gate: active or trialing, and not past its recorded period.
 * A row with no period end (just created) counts as active — Stripe is the
 * closer via subscription.updated/deleted events.
 */
export function isSubscriptionActive(
  sub: Pick<BusinessSubscription, "status" | "currentPeriodEnd"> | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!sub) return false;
  if (sub.status !== "active" && sub.status !== "trialing") return false;
  if (sub.currentPeriodEnd == null) return true;
  const end = Number(sub.currentPeriodEnd);
  if (!Number.isFinite(end)) return true;
  return end * 1000 > nowMs;
}
