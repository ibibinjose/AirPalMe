/**
 * §9 shared booking engine, one shape for every vertical.
 * Money is Stripe-shaped but deferred: paymentStatus stays "deferred"
 * until Stripe lands; no amounts move until then.
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

export type BookingProviderKind = "mate" | "business";

export interface Booking {
  id: string;
  requestId: string;
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
  paymentStatus: "deferred";
  status: BookingStatus;
  cancelReason: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingInput {
  requestId: string;
  providerUid: string;
  providerKind: BookingProviderKind;
  providerName: string;
  title: string;
  suburb: string;
  date: string;
  time: string;
  priceCents: number;
}

export const PLATFORM_FEE_BPS = 1500; // 15% — must become admin-configurable with Stripe (§10/§28).

export function quoteFees(priceCents: number): { priceCents: number; feeCents: number; providerCents: number } {
  const safe = Math.max(0, Math.floor(priceCents));
  const feeCents = Math.floor((safe * PLATFORM_FEE_BPS) / 10000);
  return { priceCents: safe, feeCents, providerCents: safe - feeCents };
}

export function bookingValid(input: BookingInput): boolean {
  return (
    input.requestId.trim().length > 0 &&
    input.providerUid.trim().length > 0 &&
    (input.providerKind === "mate" || input.providerKind === "business") &&
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
