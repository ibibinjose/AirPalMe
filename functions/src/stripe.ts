import { randomBytes } from "node:crypto";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import Stripe from "stripe";
import type { HangoutPlan, PlanAttendee } from "../../shared/plan";
import { isSoldOut, spotsLeft } from "../../shared/plan";
import {
  DEFAULT_FEE_CONFIG,
  canProviderComplete,
  checkoutPaymentCollected,
  canReleasePayout,
  payoutStatusAfterGuestPaid,
  quoteFees,
  type Booking,
  type FeeConfig,
  type PayoutStatus,
} from "../../shared/booking";
import { CALLABLE, db, isPlatformAdmin, requireAuth } from "./admin";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import type { AccessClaims } from "../../shared/airpal-security";

export interface CreateCheckoutRequest {
  planId: string;
  tierId?: string;
  spots?: number;
  isDeposit?: boolean;
  guestName?: string;
  guestEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface ConfirmBookingRequest {
  planId: string;
  bookingId: string;
  paymentIntentId?: string;
}

const APP_ORIGIN = "https://airpal.me";
const STRIPE_API_VERSION = "2026-07-29.dahlia" as Stripe.LatestApiVersion;
const stripeSecret = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const STRIPE_CALLABLE = { ...CALLABLE, secrets: [stripeSecret] };

/** Sandbox (unpaid) bookings only with explicit opt-in or the local emulator. */
export function sandboxBookingsAllowed(): boolean {
  return process.env.ALLOW_SANDBOX_BOOKINGS === "true" || process.env.FUNCTIONS_EMULATOR === "true";
}

function readSecret(param: { value: () => string }, envName: string): string {
  try {
    const bound = param.value();
    if (bound && bound.trim()) return bound.trim();
  } catch {
    /* not bound in unit tests or emulator without Secret Manager */
  }
  return String(process.env[envName] || "").trim();
}

export function stripeSecretKey(): string {
  return readSecret(stripeSecret, "STRIPE_SECRET_KEY") || String(process.env.STRIPE_API_KEY || "").trim();
}

export function stripeWebhookSigningSecret(): string {
  return readSecret(stripeWebhookSecret, "STRIPE_WEBHOOK_SECRET");
}

export function stripeLiveConfigured(): boolean {
  const key = stripeSecretKey();
  return Boolean(key) && !key.startsWith("mock_");
}

export function makeStripe(secret = stripeSecretKey()): Stripe {
  return new Stripe(secret, { apiVersion: STRIPE_API_VERSION, typescript: true });
}

function integrationId(kind: string): string {
  return `airpal-${kind}-${randomBytes(4).toString("hex")}`;
}

function headerOrigin(request: { rawRequest?: { headers?: Record<string, unknown> } }): string {
  const headers = request.rawRequest?.headers || {};
  const origin = String(headers.origin || "").trim();
  if (/^https:\/\//i.test(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return origin.replace(/\/$/, "");
  }
  const referer = String(headers.referer || "").trim();
  try {
    const url = new URL(referer);
    if (url.protocol === "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return url.origin;
    }
  } catch {
    /* ignore */
  }
  return APP_ORIGIN;
}

async function loadFeeConfig(): Promise<FeeConfig> {
  const snap = await db.collection("platform_settings").doc("marketplace").get();
  if (!snap.exists) return DEFAULT_FEE_CONFIG;
  const row = snap.data() as Partial<FeeConfig>;
  return {
    platformFeeBps: Number(row.platformFeeBps) || DEFAULT_FEE_CONFIG.platformFeeBps,
    minimumPlatformFeeCents: Number(row.minimumPlatformFeeCents) || 0,
  };
}

type ConnectAccountRow = {
  uid: string;
  stripeAccountId: string;
  transfersActive: boolean;
  payoutsActive: boolean;
  updatedAt: string;
};

async function loadConnectAccount(uid: string): Promise<ConnectAccountRow | null> {
  const snap = await db.collection("connect_accounts").doc(uid).get();
  if (!snap.exists) return null;
  return snap.data() as ConnectAccountRow;
}

async function recipientTransfersActive(stripe: Stripe, accountId: string): Promise<boolean> {
  const account = (await stripe.v2.core.accounts.retrieve(accountId)) as {
    configuration?: {
      recipient?: {
        capabilities?: {
          stripe_balance?: { stripe_transfers?: { status?: string }; payouts?: { status?: string } };
        };
      };
    };
  };
  return account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === "active";
}

async function chargeIdFromSession(stripe: Stripe, session: Stripe.Checkout.Session): Promise<string> {
  const piRef = session.payment_intent;
  const piId = typeof piRef === "string" ? piRef : piRef?.id;
  if (!piId) return "";
  const intent = await stripe.paymentIntents.retrieve(piId);
  const charge = intent.latest_charge;
  return typeof charge === "string" ? charge : charge?.id || "";
}

export async function markBookingPaid(args: {
  bookingId: string;
  sessionId: string;
  paymentIntentId: string;
  chargeId: string;
}): Promise<boolean> {
  const ref = db.collection("bookings").doc(args.bookingId);
  let changed = false;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const row = snap.data() as Booking;
    if (row.paymentStatus === "paid") return;
    changed = true;
    const now = new Date().toISOString();
    tx.update(ref, {
      paymentStatus: "paid",
      payoutStatus: payoutStatusAfterGuestPaid(Number(row.priceCents || 0)),
      status: row.status === "pending" ? "confirmed" : row.status,
      stripeCheckoutSessionId: args.sessionId,
      stripePaymentIntentId: args.paymentIntentId,
      stripeChargeId: args.chargeId,
      updatedAt: now,
    });
  });
  return changed;
}

async function applyPaidTicketToPlan(booking: Booking, spots: number, guestName: string) {
  const planId = String(booking.planId || "").trim();
  if (!planId) return;
  const planRef = db.collection("plans").doc(planId);
  const now = new Date().toISOString();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(planRef);
    if (!snap.exists) return;
    const plan = snap.data() as HangoutPlan;
    const qty = Math.max(1, Math.floor(spots || booking.spots || 1));
    const nextBooked = Math.max(0, Number(plan.spotsBooked || 0)) + qty;
    const guestAttendee: PlanAttendee = {
      id: booking.customerUid,
      name: guestName || "Guest",
      status: "going",
      notes: `Ticket ×${qty}`,
      respondedAt: now,
    };
    const attendees = [...(plan.attendees || [])];
    const idx = attendees.findIndex((a) => a.id === booking.customerUid);
    if (idx >= 0) attendees[idx] = { ...attendees[idx]!, ...guestAttendee };
    else attendees.push(guestAttendee);
    tx.update(planRef, { spotsBooked: nextBooked, attendees, updatedAt: now });
  });
}

function safeReturnPath(raw: unknown): string {
  const s = String(raw || "").trim();
  if (!s.startsWith("/") || s.startsWith("//") || s.includes("://")) return "/me";
  return s.slice(0, 240);
}

async function transferProviderShare(booking: Booking): Promise<{
  payoutStatus: PayoutStatus;
  transferId: string;
  stripeAccountId: string;
  reason?: string;
}> {
  if (booking.priceCents <= 0) {
    return { payoutStatus: "transferred", transferId: "", stripeAccountId: booking.stripeAccountId || "" };
  }
  if (booking.paymentStatus !== "paid") {
    return {
      payoutStatus: (booking.payoutStatus as PayoutStatus) || "unpaid",
      transferId: booking.stripeTransferId || "",
      stripeAccountId: booking.stripeAccountId || "",
      reason: "unpaid",
    };
  }
  if (booking.payoutStatus === "transferred" && booking.stripeTransferId) {
    return {
      payoutStatus: "transferred",
      transferId: booking.stripeTransferId,
      stripeAccountId: booking.stripeAccountId || "",
    };
  }
  const connect = await loadConnectAccount(booking.providerUid);
  const accountId = connect?.stripeAccountId || booking.stripeAccountId || "";
  if (!accountId) {
    return { payoutStatus: "held", transferId: "", stripeAccountId: "", reason: "no_account" };
  }
  if (!booking.stripeChargeId || !stripeLiveConfigured()) {
    return { payoutStatus: "held", transferId: "", stripeAccountId: accountId, reason: "not_ready" };
  }
  const stripe = makeStripe();
  const transfersActive = await recipientTransfersActive(stripe, accountId);
  if (
    !canReleasePayout({
      paymentStatus: booking.paymentStatus,
      payoutStatus: "held",
      stripeChargeId: booking.stripeChargeId,
      stripeAccountId: accountId,
      transfersActive,
    })
  ) {
    return { payoutStatus: "held", transferId: "", stripeAccountId: accountId, reason: "onboarding" };
  }
  const fees = quoteFees(booking.priceCents, await loadFeeConfig());
  const transfer = await stripe.transfers.create({
    amount: fees.providerCents,
    currency: "aud",
    destination: accountId,
    source_transaction: booking.stripeChargeId,
    metadata: { bookingId: booking.id, providerUid: booking.providerUid },
  });
  const now = new Date().toISOString();
  await db.collection("payouts").doc(transfer.id).set({
    id: transfer.id,
    bookingId: booking.id,
    providerUid: booking.providerUid,
    amountCents: fees.providerCents,
    feeCents: fees.feeCents,
    currency: "aud",
    stripeAccountId: accountId,
    stripeChargeId: booking.stripeChargeId,
    createdAt: now,
  });
  return { payoutStatus: "transferred", transferId: transfer.id, stripeAccountId: accountId };
}

function checkoutReturnUrls(origin: string, booking: Booking, bookingId: string): { success: string; cancel: string } {
  if (booking.planId) {
    return {
      success: `${origin}/plan/${booking.planId}?booked=${bookingId}`,
      cancel: `${origin}/plan/${booking.planId}?canceled=1`,
    };
  }
  if (booking.campaignId) {
    return {
      success: `${origin}/experiences?booked=${bookingId}`,
      cancel: `${origin}/experiences?canceled=1`,
    };
  }
  return {
    success: `${origin}/mate?booked=${bookingId}`,
    cancel: `${origin}/mate?canceled=1`,
  };
}

export const createExperienceCheckoutSession = onCall(STRIPE_CALLABLE, async (request) => {
  await noteAppCheck(request, "createExperienceCheckoutSession");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "pay", isAnonymousAuth(request));

  const data = (request.data || {}) as CreateCheckoutRequest;
  const planId = String(data.planId || "").trim();
  const spots = Math.max(1, Math.min(20, Number(data.spots || 1)));
  const isDeposit = Boolean(data.isDeposit);

  if (!planId) throw new HttpsError("invalid-argument", "Plan ID is required.");

  const planRef = db.collection("plans").doc(planId);
  const planSnap = await planRef.get();
  if (!planSnap.exists) {
    throw new HttpsError("not-found", "Experience plan not found.");
  }

  const plan = planSnap.data() as HangoutPlan;
  if (!plan.isExperience) {
    throw new HttpsError("failed-precondition", "This plan is not a paid experience.");
  }

  let unitAmount = Number(plan.pricePerPerson || 0);
  let tierName = "Standard Booking";

  if (data.tierId && plan.pricingTiers && plan.pricingTiers.length > 0) {
    const matchedTier = plan.pricingTiers.find((t) => t.id === data.tierId);
    if (matchedTier) {
      unitAmount = Number(matchedTier.price || unitAmount);
      tierName = matchedTier.name;
    }
  }

  if (isDeposit && plan.depositConfig?.depositAmount) {
    unitAmount = Number(plan.depositConfig.depositAmount);
  }

  const totalAmount = unitAmount * spots;
  if (isSoldOut(plan) || (spotsLeft(plan) !== null && spots > (spotsLeft(plan) || 0))) {
    throw new HttpsError("failed-precondition", "Those tickets are sold out.");
  }
  const currency = String(plan.currency || "AUD").toLowerCase();
  const bookingId = `bk-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
  const now = new Date().toISOString();
  const origin = headerOrigin(request);
  const fees = quoteFees(Math.round(totalAmount * 100), await loadFeeConfig());

  if (stripeLiveConfigured()) {
    try {
      const stripe = makeStripe();
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        // Marketplace Connect is unsupported by Stripe Managed Payments.
        managed_payments: { enabled: false },
        client_reference_id: uid,
        customer_email: data.guestEmail || request.auth?.token?.email || undefined,
        submit_type: "book",
        integration_identifier: integrationId("experience"),
        line_items: [
          {
            quantity: spots,
            price_data: {
              currency,
              unit_amount: Math.round(unitAmount * 100),
              product_data: {
                name: `${plan.title} - ${tierName}${isDeposit ? " (Deposit)" : ""}`,
                images: plan.heroImage ? [plan.heroImage] : undefined,
              },
            },
          },
        ],
        success_url: data.successUrl || `${origin}/plan/${planId}?booked=${bookingId}`,
        cancel_url: data.cancelUrl || `${origin}/plan/${planId}?canceled=true`,
        metadata: {
          bookingId,
          planId,
          planBookingId: bookingId,
          spots: String(spots),
          isDeposit: String(isDeposit),
          providerUid: plan.creator.uid || "",
        },
        payment_intent_data: {
          metadata: {
            bookingId,
            planId,
            providerUid: plan.creator.uid || "",
          },
        },
      });

      await db
        .collection("plan_bookings")
        .doc(bookingId)
        .set({
          id: bookingId,
          planId,
          hostUid: plan.creator.uid || "",
          guestUid: uid,
          guestName: data.guestName || request.auth?.token?.name || "Guest",
          guestEmail: data.guestEmail || request.auth?.token?.email || "",
          spots,
          unitAmount,
          totalAmount,
          currency,
          tierName,
          isDeposit,
          status: "pending_payment",
          stripeSessionId: session.id,
          createdAt: now,
        });

      await db
        .collection("bookings")
        .doc(bookingId)
        .set({
          id: bookingId,
          requestId: "",
          planId,
          customerUid: uid,
          providerUid: plan.creator.uid || "",
          providerKind: "host",
          providerName: plan.creator.name || "Host",
          title: plan.title,
          suburb: plan.city || plan.destination || "Sydney",
          date: plan.date || now.slice(0, 10),
          time: plan.time || "",
          priceCents: fees.priceCents,
          feeCents: fees.feeCents,
          paymentStatus: "unpaid",
          payoutStatus: "unpaid",
          status: "pending",
          cancelReason: "",
          spots,
          stripeCheckoutSessionId: session.id,
          createdAt: now,
          updatedAt: now,
        });

      return {
        ok: true,
        mode: "live_stripe",
        bookingId,
        sessionId: session.id,
        checkoutUrl: session.url,
      };
    } catch (err) {
      if (!sandboxBookingsAllowed()) {
        const message = err instanceof Error ? err.message : "Stripe checkout failed.";
        throw new HttpsError("failed-precondition", message);
      }
    }
  }

  if (!sandboxBookingsAllowed()) {
    throw new HttpsError(
      "failed-precondition",
      "Card payments are not configured for this experience yet. Please contact the host.",
    );
  }
  await db
    .collection("plan_bookings")
    .doc(bookingId)
    .set({
      id: bookingId,
      planId,
      hostUid: plan.creator.uid || "",
      guestUid: uid,
      guestName: data.guestName || request.auth?.token?.name || "Guest",
      guestEmail: data.guestEmail || request.auth?.token?.email || "",
      spots,
      unitAmount,
      totalAmount,
      currency,
      tierName,
      isDeposit,
      status: "confirmed",
      simulated: true,
      createdAt: now,
    });

  const guestAttendee: PlanAttendee = {
    id: uid,
    name: data.guestName || request.auth?.token?.name || "You",
    status: "going",
    isAnonymous: Boolean(request.auth?.token?.firebase?.sign_in_provider === "anonymous"),
    notes: `Booked ${spots} spot${spots > 1 ? "s" : ""} (${isDeposit ? "Deposit Paid" : "Paid in Full"})`,
    respondedAt: now,
  };

  const currentAttendees = plan.attendees || [];
  const existingIdx = currentAttendees.findIndex((a) => a.id === uid);
  let updatedAttendees: PlanAttendee[];
  if (existingIdx >= 0) {
    updatedAttendees = currentAttendees.map((a, i) => (i === existingIdx ? guestAttendee : a));
  } else {
    updatedAttendees = [...currentAttendees, guestAttendee];
  }

  await planRef.update({
    attendees: updatedAttendees,
    updatedAt: now,
  });

  return {
    ok: true,
    mode: "sandbox_simulated",
    bookingId,
    totalAmount,
    currency,
    message: "Stripe booking confirmed (Sandbox / Instant Booking)",
  };
});

export const createBookingCheckoutSession = onCall(STRIPE_CALLABLE, async (request) => {
  await noteAppCheck(request, "createBookingCheckoutSession");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "pay", isAnonymousAuth(request));
  const bookingId = String((request.data as { bookingId?: string } | undefined)?.bookingId || "").trim();
  if (!bookingId) throw new HttpsError("invalid-argument", "bookingId is required.");

  const ref = db.collection("bookings").doc(bookingId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Booking not found.");
  const booking = { id: snap.id, ...(snap.data() as Omit<Booking, "id">) };
  if (booking.customerUid !== uid) {
    throw new HttpsError("permission-denied", "Only the guest who booked can pay.");
  }
  if (booking.paymentStatus === "paid") {
    return { ok: true, mode: "already_paid", bookingId };
  }
  if (booking.priceCents <= 0) {
    await ref.update({ paymentStatus: "paid", payoutStatus: "transferred", updatedAt: new Date().toISOString() });
    return { ok: true, mode: "free", bookingId };
  }

  if (!stripeLiveConfigured()) {
    throw new HttpsError(
      "failed-precondition",
      "Card payments are not configured yet. Ask AirPal to finish Stripe setup.",
    );
  }

  const stripe = makeStripe();
  if (booking.stripeCheckoutSessionId) {
    const existing = await stripe.checkout.sessions.retrieve(booking.stripeCheckoutSessionId);
    if (existing.status === "open" && existing.url) {
      return { ok: true, mode: "live_stripe", bookingId, sessionId: existing.id, checkoutUrl: existing.url };
    }
  }

  const origin = headerOrigin(request);
  const returns = checkoutReturnUrls(origin, booking, bookingId);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    // Marketplace Connect is unsupported by Stripe Managed Payments.
    managed_payments: { enabled: false },
    client_reference_id: uid,
    customer_email: request.auth?.token?.email || undefined,
    submit_type: "book",
    integration_identifier: integrationId("booking"),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "aud",
          unit_amount: booking.priceCents,
          product_data: { name: `Ticket · ${booking.title}` },
        },
      },
    ],
    success_url: returns.success,
    cancel_url: returns.cancel,
    metadata: {
      bookingId,
      providerUid: booking.providerUid,
      providerKind: booking.providerKind,
      spots: String(booking.spots || 1),
      planId: booking.planId || "",
      campaignId: booking.campaignId || "",
    },
    payment_intent_data: {
      metadata: {
        bookingId,
        providerUid: booking.providerUid,
      },
    },
  });

  await ref.update({
    stripeCheckoutSessionId: session.id,
    updatedAt: new Date().toISOString(),
  });

  return { ok: true, mode: "live_stripe", bookingId, sessionId: session.id, checkoutUrl: session.url };
});

export const confirmExperienceBookingRemote = onCall(STRIPE_CALLABLE, async (request) => {
  await noteAppCheck(request, "confirmExperienceBookingRemote");
  const uid = requireAuth(request.auth?.uid);
  const data = (request.data || {}) as ConfirmBookingRequest;
  const planId = String(data.planId || "").trim();
  const bookingId = String(data.bookingId || "").trim();

  if (!planId || !bookingId) {
    throw new HttpsError("invalid-argument", "planId and bookingId are required.");
  }

  const bookingRef = db.collection("plan_bookings").doc(bookingId);
  const bookingSnap = await bookingRef.get();
  if (!bookingSnap.exists) {
    throw new HttpsError("not-found", "Booking record not found.");
  }

  const booking = bookingSnap.data() as Record<string, unknown> | undefined;
  if (booking?.planId !== planId) {
    throw new HttpsError("invalid-argument", "Booking does not belong to this plan.");
  }

  const planSnap = await db.collection("plans").doc(planId).get();
  const hostUid = (planSnap.data() as HangoutPlan | undefined)?.creator?.uid;
  if (booking?.guestUid !== uid && hostUid !== uid) {
    throw new HttpsError("permission-denied", "Only the guest or host can confirm this booking.");
  }

  if (booking?.status === "confirmed") {
    return { ok: true, status: "confirmed", bookingId };
  }

  const isSandboxSimulated = booking?.simulated === true;
  const sandboxAllowed = sandboxBookingsAllowed();
  let paid = false;
  const sessionId = String(booking?.stripeSessionId || "");
  if (sessionId && stripeLiveConfigured()) {
    const session = await makeStripe().checkout.sessions.retrieve(sessionId);
    paid = checkoutPaymentCollected(session.payment_status);
  }
  if (!isSandboxSimulated && !paid) {
    throw new HttpsError("failed-precondition", "Payment has not been verified for this booking.");
  }
  if (isSandboxSimulated && !sandboxAllowed) {
    throw new HttpsError("failed-precondition", "Sandbox bookings are disabled.");
  }

  const now = new Date().toISOString();
  await bookingRef.update({
    status: "confirmed",
    confirmedAt: now,
    paymentIntentId: paid ? "stripe_verified" : "sandbox_simulated",
  });

  return { ok: true, status: "confirmed", bookingId };
});
export const confirmExperienceBooking = confirmExperienceBookingRemote;

export const createConnectAccountLink = onCall(STRIPE_CALLABLE, async (request) => {
  await noteAppCheck(request, "createConnectAccountLink");
  const uid = requireAuth(request.auth?.uid);
  if (isAnonymousAuth(request)) {
    throw new HttpsError("failed-precondition", "Create an account to receive payouts.");
  }
  await enforceRateLimit(uid, "pay", false);
  if (!stripeLiveConfigured()) {
    throw new HttpsError("failed-precondition", "Payouts are not configured yet.");
  }

  const stripe = makeStripe();
  const existing = await loadConnectAccount(uid);
  let accountId = existing?.stripeAccountId || "";
  const email = String(request.auth?.token?.email || "").trim();
  const name = String(request.auth?.token?.name || "AirPal provider").trim() || "AirPal provider";

  if (!accountId) {
    const created = await stripe.v2.core.accounts.create({
      contact_email: email || undefined,
      display_name: name,
      dashboard: "express",
      identity: { country: "AU" },
      defaults: {
        responsibilities: {
          fees_collector: "application",
          losses_collector: "application",
        },
      },
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: { requested: true },
            },
          },
        },
      },
    });
    accountId = created.id;
  }

  const origin = headerOrigin(request);
  const back = safeReturnPath((request.data as { returnPath?: string } | undefined)?.returnPath);
  const sep = back.includes("?") ? "&" : "?";
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}${back}${sep}payouts=refresh`,
    return_url: `${origin}${back}${sep}payouts=return`,
    type: "account_onboarding",
  });

  const transfersActive = await recipientTransfersActive(stripe, accountId).catch(() => false);
  const now = new Date().toISOString();
  await db.collection("connect_accounts").doc(uid).set(
    {
      uid,
      stripeAccountId: accountId,
      transfersActive,
      payoutsActive: transfersActive,
      updatedAt: now,
    },
    { merge: true },
  );

  return { ok: true, url: link.url, stripeAccountId: accountId, transfersActive };
});

export const refreshConnectAccount = onCall(STRIPE_CALLABLE, async (request) => {
  await noteAppCheck(request, "refreshConnectAccount");
  const uid = requireAuth(request.auth?.uid);
  if (isAnonymousAuth(request)) {
    throw new HttpsError("failed-precondition", "Create an account to receive payouts.");
  }
  if (!stripeLiveConfigured()) {
    throw new HttpsError("failed-precondition", "Payouts are not configured yet.");
  }
  const existing = await loadConnectAccount(uid);
  if (!existing?.stripeAccountId) {
    return { ok: true, transfersActive: false, stripeAccountId: "" };
  }
  const transfersActive = await recipientTransfersActive(makeStripe(), existing.stripeAccountId).catch(() => false);
  await db.collection("connect_accounts").doc(uid).set(
    {
      transfersActive,
      payoutsActive: transfersActive,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
  return { ok: true, transfersActive, stripeAccountId: existing.stripeAccountId };
});

export const createConnectLoginLink = onCall(STRIPE_CALLABLE, async (request) => {
  await noteAppCheck(request, "createConnectLoginLink");
  const uid = requireAuth(request.auth?.uid);
  if (isAnonymousAuth(request)) {
    throw new HttpsError("failed-precondition", "Create an account to receive payouts.");
  }
  const existing = await loadConnectAccount(uid);
  if (!existing?.stripeAccountId) {
    throw new HttpsError("failed-precondition", "Set up payouts first.");
  }
  const link = await makeStripe().accounts.createLoginLink(existing.stripeAccountId);
  return { ok: true, url: link.url };
});

export const releaseHeldPayouts = onCall(STRIPE_CALLABLE, async (request) => {
  await noteAppCheck(request, "releaseHeldPayouts");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "pay", isAnonymousAuth(request));
  const snap = await db.collection("bookings").where("providerUid", "==", uid).get();
  let released = 0;
  let held = 0;
  let cents = 0;
  for (const docSnap of snap.docs) {
    const booking = { id: docSnap.id, ...(docSnap.data() as Omit<Booking, "id">) };
    if (booking.paymentStatus !== "paid" || booking.payoutStatus === "transferred") continue;
    if (booking.status !== "completed") continue;
    if (booking.priceCents <= 0) continue;
    const result = await transferProviderShare(booking);
    if (result.payoutStatus === "transferred") {
      released += 1;
      cents += quoteFees(booking.priceCents, await loadFeeConfig()).providerCents;
      await docSnap.ref.update({
        payoutStatus: "transferred",
        stripeTransferId: result.transferId,
        stripeAccountId: result.stripeAccountId,
        updatedAt: new Date().toISOString(),
      });
    } else {
      held += 1;
    }
  }
  return { ok: true, released, held, amountCents: cents };
});

export const completePaidBooking = onCall(STRIPE_CALLABLE, async (request) => {
  await noteAppCheck(request, "completePaidBooking");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "pay", isAnonymousAuth(request));
  const bookingId = String((request.data as { bookingId?: string } | undefined)?.bookingId || "").trim();
  if (!bookingId) throw new HttpsError("invalid-argument", "bookingId is required.");

  const ref = db.collection("bookings").doc(bookingId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Booking not found.");
  const booking = { id: snap.id, ...(snap.data() as Omit<Booking, "id">) };
  const claims = request.auth?.token as AccessClaims | undefined;
  const admin = isPlatformAdmin(claims);
  if (booking.providerUid !== uid && !admin) {
    throw new HttpsError("permission-denied", "Only the provider can mark this delivered.");
  }
  if (!canProviderComplete(booking.status) && booking.status !== "completed") {
    throw new HttpsError("failed-precondition", "This booking cannot be completed yet.");
  }
  if (booking.priceCents > 0 && booking.paymentStatus !== "paid") {
    throw new HttpsError("failed-precondition", "The guest has not paid yet.");
  }

  const now = new Date().toISOString();
  const paidOut = await transferProviderShare({ ...booking, status: "completed" });

  await ref.update({
    status: "completed",
    payoutStatus: paidOut.payoutStatus,
    stripeTransferId: paidOut.transferId || booking.stripeTransferId || "",
    stripeAccountId: paidOut.stripeAccountId || booking.stripeAccountId || "",
    updatedAt: now,
  });

  if (booking.providerKind === "mate" && booking.requestId) {
    await db
      .collection("mate_requests")
      .doc(booking.requestId)
      .set({ status: "completed", completedAt: now, updatedAt: now }, { merge: true });
  }

  return {
    ok: true,
    status: "completed",
    payoutStatus: paidOut.payoutStatus,
    transferId: paidOut.transferId || null,
    payoutReason: paidOut.reason || null,
  };
});

async function reverseTransferForDispute(chargeId: string): Promise<void> {
  const bookings = await db.collection("bookings").where("stripeChargeId", "==", chargeId).limit(1).get();
  if (bookings.empty) return;
  const docSnap = bookings.docs[0]!;
  const booking = docSnap.data() as Booking;
  const transferId = booking.stripeTransferId;
  if (!transferId || !stripeLiveConfigured()) {
    await docSnap.ref.update({
      status: "disputed",
      updatedAt: new Date().toISOString(),
    });
    return;
  }
  const stripe = makeStripe();
  await stripe.transfers.createReversal(transferId);
  await docSnap.ref.update({
    status: "disputed",
    payoutStatus: "reversed",
    updatedAt: new Date().toISOString(),
  });
}

export const stripeWebhook = onRequest(
  { cors: false, invoker: "public", secrets: [stripeSecret, stripeWebhookSecret] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }
    const secret = stripeWebhookSigningSecret();
    if (!secret || !stripeLiveConfigured()) {
      res.status(503).send("Webhook is not configured");
      return;
    }
    const signature = String(req.headers["stripe-signature"] || "");
    const raw = req.rawBody;
    if (!raw || !signature) {
      res.status(400).send("Missing payload");
      return;
    }

    let event: Stripe.Event;
    try {
      event = makeStripe().webhooks.constructEvent(raw, signature, secret);
    } catch {
      res.status(400).send("Invalid signature");
      return;
    }

    try {
      if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
        const session = event.data.object as Stripe.Checkout.Session;
        if (!checkoutPaymentCollected(session.payment_status)) {
          res.json({ received: true, skipped: "unpaid" });
          return;
        }
        const bookingId = String(session.metadata?.bookingId || "").trim();
        if (bookingId) {
          const stripe = makeStripe();
          const paymentIntentId =
            typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || "";
          const chargeId = await chargeIdFromSession(stripe, session);
          const newlyPaid = await markBookingPaid({
            bookingId,
            sessionId: session.id,
            paymentIntentId,
            chargeId,
          });
          if (newlyPaid) {
            const bookingSnap = await db.collection("bookings").doc(bookingId).get();
            if (bookingSnap.exists) {
              const booking = { id: bookingSnap.id, ...(bookingSnap.data() as Omit<Booking, "id">) };
              const spots = Math.max(1, Number(session.metadata?.spots || booking.spots || 1));
              const guestName = String(session.customer_details?.name || session.metadata?.guestName || "Guest");
              await applyPaidTicketToPlan(booking, spots, guestName);
            }
          }
          const planBookingId = String(session.metadata?.planBookingId || bookingId);
          const planRef = db.collection("plan_bookings").doc(planBookingId);
          const planSnap = await planRef.get();
          if (planSnap.exists) {
            await planRef.update({
              status: "confirmed",
              paymentIntentId: paymentIntentId || "stripe_verified",
              confirmedAt: new Date().toISOString(),
            });
          }
          await db
            .collection("payments")
            .doc(session.id)
            .set({
              id: session.id,
              bookingId,
              amountTotal: session.amount_total || 0,
              currency: session.currency || "aud",
              paymentIntentId,
              chargeId,
              createdAt: new Date().toISOString(),
            });
        }
      } else if (event.type === "checkout.session.async_payment_failed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = String(session.metadata?.bookingId || "").trim();
        if (bookingId) {
          await db
            .collection("bookings")
            .doc(bookingId)
            .set(
              { paymentStatus: "unpaid", payoutStatus: "unpaid", updatedAt: new Date().toISOString() },
              { merge: true },
            );
        }
      } else if (event.type === "charge.dispute.created") {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id || "";
        if (chargeId) await reverseTransferForDispute(chargeId);
      } else if (event.type === "account.updated" || String(event.type) === "v2.core.account.updated") {
        const account = event.data.object as { id?: string };
        const accountId = String(account.id || "");
        if (accountId && stripeLiveConfigured()) {
          const active = await recipientTransfersActive(makeStripe(), accountId);
          const rows = await db.collection("connect_accounts").where("stripeAccountId", "==", accountId).limit(1).get();
          if (!rows.empty) {
            await rows.docs[0]!.ref.set(
              { transfersActive: active, payoutsActive: active, updatedAt: new Date().toISOString() },
              { merge: true },
            );
          }
        }
      }
    } catch (err) {
      console.error("stripeWebhook handler failed", err);
      res.status(500).send("Handler failed");
      return;
    }

    res.json({ received: true });
  },
);
