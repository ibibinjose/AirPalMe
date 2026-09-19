/**
 * §9 shared booking engine, one shape for every vertical.
 * Fees come from admin-configurable config, never a new hard-coded percent.
 * paymentStatus is unpaid until Stripe confirms (or paid when the price is $0).
 */

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "in_progress",
  "completed",
  "disputed",
  "refunded",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type BookingProviderKind = "mate" | "business" | "host";

export const PAYMENT_STATUSES = ["unpaid", "paid", "deferred", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Provider payout after the guest has paid. Funds stay on the platform until the booking is completed. */
export const PAYOUT_STATUSES = ["unpaid", "held", "transferred", "reversed"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export interface FeeConfig {
  platformFeeBps: number;
  minimumPlatformFeeCents: number;
}

/** Defaults until `platform_settings/marketplace` is set by admin. */
export const DEFAULT_FEE_CONFIG: FeeConfig = {
  platformFeeBps: 1500,
  minimumPlatformFeeCents: 0,
};

export interface Booking {
  id: string;
  /** Mate request id, or campaign id when providerKind is business. */
  requestId: string;
  planId: string;
  customerUid: string;
  providerUid: string;
  providerKind: BookingProviderKind;
  providerName: string;
  title: string;
  suburb: string;
  date: string;
  time: string;
  priceCents: number;
  feeCents: number;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  cancelReason: string;
  createdAt: string;
  updatedAt: string;
  /** Optional listing this booking is for (business vertical). */
  listingId?: string;
  /** Optional Experience campaign this booking is for. */
  campaignId?: string;
  payoutStatus?: PayoutStatus;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeTransferId?: string;
  stripeAccountId?: string;
  /** Ticket quantity for events/experiences. Mate bookings are 1. */
  spots?: number;
}

export interface BookingInput {
  requestId?: string;
  planId?: string;
  providerUid: string;
  providerKind: BookingProviderKind;
  providerName: string;
  title: string;
  suburb: string;
  date: string;
  time: string;
  priceCents: number;
  listingId?: string;
  campaignId?: string;
}

/** @deprecated Use DEFAULT_FEE_CONFIG.platformFeeBps — kept so existing imports compile. */
export const PLATFORM_FEE_BPS = DEFAULT_FEE_CONFIG.platformFeeBps;

export function quoteFees(
  priceCents: number,
  config: FeeConfig = DEFAULT_FEE_CONFIG,
): { priceCents: number; feeCents: number; providerCents: number } {
  const safe = Math.max(0, Math.floor(priceCents));
  const bps = Number.isFinite(config.platformFeeBps)
    ? Math.max(0, Math.min(5000, Math.floor(config.platformFeeBps)))
    : DEFAULT_FEE_CONFIG.platformFeeBps;
  const minFee = Number.isFinite(config.minimumPlatformFeeCents)
    ? Math.max(0, Math.floor(config.minimumPlatformFeeCents))
    : 0;
  const feeCents = safe === 0 ? 0 : Math.max(minFee, Math.floor((safe * bps) / 10000));
  return { priceCents: safe, feeCents, providerCents: Math.max(0, safe - feeCents) };
}

export function paymentStatusForPrice(priceCents: number): PaymentStatus {
  return priceCents <= 0 ? "paid" : "unpaid";
}

export function payoutStatusForPrice(priceCents: number): PayoutStatus {
  return priceCents <= 0 ? "transferred" : "unpaid";
}

/** Guest paid on Checkout — fulfill only when Stripe says the session is collected. */
export function checkoutPaymentCollected(paymentStatus: string | null | undefined): boolean {
  return paymentStatus === "paid" || paymentStatus === "no_payment_required";
}

export function payoutStatusAfterGuestPaid(priceCents: number): PayoutStatus {
  return priceCents <= 0 ? "transferred" : "held";
}

export function canReleasePayout(input: {
  paymentStatus: PaymentStatus;
  payoutStatus?: PayoutStatus | string;
  stripeChargeId?: string;
  stripeAccountId?: string;
  transfersActive: boolean;
}): boolean {
  const held = input.payoutStatus === "held" || input.payoutStatus === undefined || input.payoutStatus === "";
  return (
    input.paymentStatus === "paid" &&
    held &&
    Boolean(input.stripeChargeId?.trim()) &&
    Boolean(input.stripeAccountId?.trim()) &&
    input.transfersActive
  );
}

export function isPayoutStatus(s: string): s is PayoutStatus {
  return (PAYOUT_STATUSES as readonly string[]).includes(s);
}

/** Completed, guest paid, share still sitting on the platform — vendor can pull it once payouts are on. */
export function canRetryPayout(b: Pick<Booking, "status" | "paymentStatus" | "payoutStatus" | "priceCents">): boolean {
  return (
    b.priceCents > 0 &&
    b.paymentStatus === "paid" &&
    (b.payoutStatus === "held" || b.payoutStatus === undefined) &&
    b.status === "completed"
  );
}

export function isPaymentStatus(s: string): s is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(s);
}

export function bookingValid(input: BookingInput): boolean {
  const hasTarget =
    Boolean(input.requestId?.trim()) ||
    Boolean(input.planId?.trim()) ||
    Boolean(input.campaignId?.trim()) ||
    Boolean(input.listingId?.trim());
  return (
    hasTarget &&
    input.providerUid.trim().length > 0 &&
    (input.providerKind === "mate" || input.providerKind === "business" || input.providerKind === "host") &&
    input.providerName.trim().length >= 2 &&
    input.title.trim().length >= 4 &&
    input.suburb.trim().length >= 2 &&
    /^\d{4}-\d{2}-\d{2}$/.test(input.date) &&
    Number.isInteger(input.priceCents) &&
    input.priceCents >= 0
  );
}

/** Customer may cancel while nothing has been delivered. */
export function canCustomerCancel(status: BookingStatus): boolean {
  return status === "pending" || status === "confirmed";
}

/** Provider confirms the booking, then completes it after delivery. */
export function canProviderConfirm(status: BookingStatus): boolean {
  return status === "pending";
}

export function canProviderComplete(status: BookingStatus): boolean {
  return status === "confirmed" || status === "in_progress";
}

export function isBookingStatus(s: string): s is BookingStatus {
  return (BOOKING_STATUSES as readonly string[]).includes(s);
}

/** Business-owner inbox rows: same bookings collection, providerKind business. */
export function isBusinessProviderBooking(b: Pick<Booking, "providerKind" | "providerUid">, ownerUid: string): boolean {
  return b.providerKind === "business" && b.providerUid === ownerUid;
}

/** Active (non-terminal) bookings the owner still needs to act on. */
export function isOpenProviderBooking(status: BookingStatus): boolean {
  return status === "pending" || status === "confirmed" || status === "in_progress";
}
