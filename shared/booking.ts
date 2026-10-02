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
  /** Optional ticketed event this booking is for. */
  eventId?: string;
  payoutStatus?: PayoutStatus;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeTransferId?: string;
  stripeAccountId?: string;
  /** Ticket quantity for events/experiences. Mate bookings are 1. */
  spots?: number;
  /** Balance payment: points at the original deposit booking on the same plan. */
  parentBookingId?: string;
  /** D3 stay nights: property + range on the same bookings engine. */
  propertyId?: string;
  stayCheckIn?: string;
  stayCheckOut?: string;
  stayGuests?: number;
  stayRoomTypeId?: string;
  /** Gate admission: ISO time + staffer who scanned. Set by admitTicket only. */
  admittedAt?: string;
  admittedByUid?: string;
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
  eventId?: string;
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

/** Display-paid: Stripe-confirmed, or free (nothing to collect). */
export function bookingDisplayPaid(b: Pick<Booking, "paymentStatus" | "priceCents">): boolean {
  return b.paymentStatus === "paid" || b.priceCents <= 0;
}

/**
 * Stripe cancel-return detection. cancel_url spellings vary by checkout
 * (`?canceled=1` vs `?canceled=true`); both mean "no charge made".
 */
export function hasCanceledParam(search: string): boolean {
  return /(^|[?&])canceled=(1|true)(&|$)/.test(search);
}

/** One path-safe ticket segment — the single shape QR landings accept. */
export function isTicketId(value: unknown): value is string {
  return typeof value === "string" && /^[\w-]{1,128}$/.test(value);
}

/**
 * Gate-scan ticket id from a QR landing (`/e/:id?ticket=:bookingId`).
 * Strict: one path-safe segment, nothing else — the server re-checks.
 */
export function ticketIdFromSearch(search: string): string | null {
  const m = /(^|[?&])ticket=([^&]*)(&|$)/.exec(search);
  if (!m) return null;
  const id = decodeURIComponent(m[2] || "").trim();
  return isTicketId(id) ? id : null;
}

/** Gate path the on-screen ticket and both wallet QRs share. */
export function ticketGatePath(booking: { id: string; eventId?: string; planId?: string }): string {
  const id = encodeURIComponent(booking.id);
  if (booking.eventId) return `/e/${encodeURIComponent(booking.eventId)}?ticket=${id}`;
  if (booking.planId) return `/plan/${encodeURIComponent(booking.planId)}?ticket=${id}`;
  return `/ticket/${id}`;
}

/** Absolute gate URL. Wallet barcodes use this so a camera opens the same gate as the ticket. */
export function ticketGateUrl(
  booking: { id: string; eventId?: string; planId?: string },
  origin = "https://airpal.me",
): string {
  return origin.replace(/\/$/, "") + ticketGatePath(booking);
}

export const TICKET_ADMIT_REASONS = ["unpaid", "cancelled", "refunded", "disputed", "completed"] as const;
export type TicketAdmitReason = (typeof TICKET_ADMIT_REASONS)[number];

export type TicketAdmitCheck = { valid: true } | { valid: false; reason: TicketAdmitReason };

/**
 * Gate rule, shared by client copy and server enforcement: paid (or free)
 * and still open. Cancelled/refunded/disputed/completed bookings never
 * admit — the gate shows the reason instead of a button.
 */
export function ticketAdmitCheck(
  b: Pick<Booking, "paymentStatus" | "priceCents" | "status">,
): TicketAdmitCheck {
  if (b.status === "cancelled") return { valid: false, reason: "cancelled" };
  if (b.status === "refunded") return { valid: false, reason: "refunded" };
  if (b.status === "disputed") return { valid: false, reason: "disputed" };
  if (b.status === "completed") return { valid: false, reason: "completed" };
  if (!bookingDisplayPaid(b)) return { valid: false, reason: "unpaid" };
  return { valid: true };
}

/** Gate-staff wording for each refusal. */
export function ticketAdmitReasonLabel(reason: TicketAdmitReason): string {
  switch (reason) {
    case "unpaid":
      return "Not paid — collect payment before entry.";
    case "cancelled":
      return "Booking was cancelled — no entry.";
    case "refunded":
      return "Booking was refunded — no entry.";
    case "disputed":
      return "Booking is under dispute — check with the organiser.";
    case "completed":
      return "Already fulfilled — no re-entry on this ticket.";
  }
}

/**
 * C1 — the stored fee must equal the admin config quote. The server stamps
 * `feeCents` at checkout; this guard lets tests and the client verify the
 * ledger matches the live config instead of trusting either side blindly.
 */
export function bookingFeesMatch(
  booking: Pick<Booking, "priceCents" | "feeCents">,
  config: FeeConfig = DEFAULT_FEE_CONFIG,
): boolean {
  return booking.feeCents === quoteFees(booking.priceCents, config).feeCents;
}

/**
 * C5 — guest review of a completed experience. Stars required, words
 * optional (mirrors mate reviewValid). Tied to one paid + completed
 * booking; the doc id IS the booking id so double reviews cannot exist.
 */
export function experienceReviewValid(rating: number, text: string): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 && text.trim().length <= 500;
}

/**
 * C2 — remaining balance on a deposit ledger. Both args are cents; anything
 * already paid (or overpaid) yields zero, never a negative charge.
 */
export function balanceDueCents(totalCents: number, paidCents: number): number {
  const total = Number.isFinite(totalCents) ? Math.max(0, Math.floor(totalCents)) : 0;
  const paid = Number.isFinite(paidCents) ? Math.max(0, Math.floor(paidCents)) : 0;
  return Math.max(0, total - paid);
}

/** Provider share prefers the server-stamped fee; defaults only fill legacy rows. */
export function providerShareCents(
  booking: Pick<Booking, "priceCents" | "feeCents">,
  config: FeeConfig = DEFAULT_FEE_CONFIG,
): number {
  if (!Number.isFinite(booking.feeCents)) return quoteFees(booking.priceCents, config).providerCents;
  const fee = Math.max(0, Math.floor(booking.feeCents));
  return Math.max(0, Math.floor(booking.priceCents) - fee);
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
    Boolean(input.eventId?.trim()) ||
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

/**
 * C2 — checkout price authority. Sourced bookings (event/campaign) re-price
 * from the source row so a forged client priceCents can never reach Stripe.
 * Fail closed when the source is gone. Pure for testing; the server applies it.
 */
export function repriceSourcedBooking(
  source: { exists: boolean; priceCents: unknown } | null,
): { priceCents: number } | { error: "no-longer-on-sale" } {
  if (!source || !source.exists) return { error: "no-longer-on-sale" };
  const n = typeof source.priceCents === "number" ? source.priceCents : Number(source.priceCents);
  const cents = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  return { priceCents: cents };
}

/**
 * C3 — refund guard: paid, share still held on the platform, provider/admin
 * only. Transferred payouts never auto-refund; those need human review.
 * Returns null when the refund may proceed, otherwise the reason it cannot.
 */
export function canRefundPaid(
  booking: Pick<Booking, "paymentStatus" | "payoutStatus" | "providerUid" | "status">,
  callerUid: string,
  isAdmin: boolean,
): string | null {
  if (booking.providerUid !== callerUid && !isAdmin) return "Only the provider can refund this booking.";
  if (booking.paymentStatus !== "paid") return "There is no completed payment to refund.";
  if (booking.payoutStatus === "transferred") return "Already paid out — contact support.";
  if (booking.status === "refunded") return "Already refunded.";
  return null;
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
