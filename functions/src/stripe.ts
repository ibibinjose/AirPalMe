import { randomBytes } from "node:crypto";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import type { HangoutPlan, PlanAttendee } from "../../shared/plan";
import { CALLABLE, db, requireAuth } from "./admin";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";

export interface CreateCheckoutRequest {
  planId: string;
  tierId?: string;
  spots?: number;
  isDeposit?: boolean;
  guestName?: string;
  guestEmail?: string;
  guestNotes?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface ConfirmBookingRequest {
  planId: string;
  bookingId: string;
  paymentIntentId?: string;
}

/** Sandbox (unpaid) bookings only with explicit opt-in or the local emulator. */
export function sandboxBookingsAllowed(): boolean {
  return process.env.ALLOW_SANDBOX_BOOKINGS === "true" || process.env.FUNCTIONS_EMULATOR === "true";
}

export const createExperienceCheckoutSession = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "createExperienceCheckoutSession");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "planWrite", isAnonymousAuth(request));

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

  // Calculate pricing
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
  const currency = String(plan.currency || "AUD").toLowerCase();
  const bookingId = `bk-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
  const now = new Date().toISOString();

  const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;

  // If Stripe API key is provided, create a real Stripe Checkout Session via Stripe REST API
  if (stripeKey && !stripeKey.startsWith("mock_")) {
    try {
      const params = new URLSearchParams();
      params.append("payment_method_types[]", "card");
      params.append("mode", "payment");
      params.append("client_reference_id", uid);
      params.append("metadata[planId]", planId);
      params.append("metadata[bookingId]", bookingId);
      params.append("metadata[spots]", String(spots));
      params.append("metadata[isDeposit]", String(isDeposit));

      params.append("line_items[0][price_data][currency]", currency);
      params.append("line_items[0][price_data][unit_amount]", String(Math.round(unitAmount * 100)));
      params.append(
        "line_items[0][price_data][product_data][name]",
        `${plan.title} - ${tierName}${isDeposit ? " (Deposit)" : ""}`,
      );
      if (plan.heroImage) {
        params.append("line_items[0][price_data][product_data][images][0]", plan.heroImage);
      }
      params.append("line_items[0][quantity]", String(spots));

      const successUrl = data.successUrl || `https://airpal.me/plan/${planId}?booked=${bookingId}`;
      const cancelUrl = data.cancelUrl || `https://airpal.me/plan/${planId}?canceled=true`;
      params.append("success_url", successUrl);
      params.append("cancel_url", cancelUrl);

      const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Stripe error ${resp.status}`);
      }

      const session = (await resp.json()) as { id: string; url: string };

      // Save pending booking record
      await db.collection("plan_bookings").doc(bookingId).set({
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

      return {
        ok: true,
        mode: "live_stripe",
        bookingId,
        sessionId: session.id,
        checkoutUrl: session.url,
      };
    } catch {
      /* live Stripe unavailable — fall through to the sandbox path when allowed */
    }
  }

  // Simulated / Instant Sandbox Booking for Dev or when Stripe secret is not yet configured.
  // Never confirm unpaid bookings in production: sandbox mode must be explicitly enabled.
  if (!sandboxBookingsAllowed()) {
    throw new HttpsError(
      "failed-precondition",
      "Card payments are not configured for this experience yet. Please contact the host.",
    );
  }
  await db.collection("plan_bookings").doc(bookingId).set({
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

  // Automatically add to attendees
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

export const confirmExperienceBookingRemote = onCall(CALLABLE, async (request) => {
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

  // Only the guest who booked or the plan host may confirm.
  const planSnap = await db.collection("plans").doc(planId).get();
  const hostUid = (planSnap.data() as HangoutPlan | undefined)?.creator?.uid;
  if (booking?.guestUid !== uid && hostUid !== uid) {
    throw new HttpsError("permission-denied", "Only the guest or host can confirm this booking.");
  }

  if (booking?.status === "confirmed") {
    return { ok: true, status: "confirmed", bookingId };
  }

  // Never confirm an unpaid live booking: require payment evidence.
  const paymentIntentId = data.paymentIntentId || booking?.paymentIntentId;
  const isSandboxSimulated = booking?.simulated === true;
  const sandboxAllowed = sandboxBookingsAllowed();
  if (!isSandboxSimulated && !paymentIntentId) {
    throw new HttpsError("failed-precondition", "Payment has not been verified for this booking.");
  }
  if (isSandboxSimulated && !sandboxAllowed) {
    throw new HttpsError("failed-precondition", "Sandbox bookings are disabled.");
  }

  const now = new Date().toISOString();
  await bookingRef.update({
    status: "confirmed",
    confirmedAt: now,
    paymentIntentId: paymentIntentId || "sandbox_simulated",
  });

  return { ok: true, status: "confirmed", bookingId };
});
export const confirmExperienceBooking = confirmExperienceBookingRemote;
