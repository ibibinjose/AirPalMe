import { randomBytes } from "node:crypto";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import type Stripe from "stripe";
import { CALLABLE, db, isPlatformAdmin, requireAuth } from "./admin";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import { headerOrigin, makeStripe, safeReturnPath, stripeLiveConfigured } from "./stripe";
import type { AccessClaims } from "../../shared/airpal-security";

/**
 * Stripe Managed Payments for platform-sold goods (digital products, fees,
 * passes) — the direct-charge counterpart to the Connect marketplace flow in
 * ./stripe.ts, which must keep `managed_payments.enabled = false`.
 *
 * Flow: createManagedProduct (admin, once per offering — persists the Stripe
 * product/price ids) → createManagedCheckoutSession (guest, per purchase —
 * reuses the stored price id) → stripeWebhook checkout.session.completed →
 * recordManagedCheckoutCompleted (marks the ledger paid, persists ids).
 *
 * The Stripe client pins an API version above the Managed Payments floor
 * (2026-02-25.preview), so every request below carries a compliant
 * Stripe-Version header without per-request overrides.
 */

const APP_ORIGIN = "https://airpal.me";
/** Eligible tax code for digital goods (blueprint default). */
export const DIGITAL_GOODS_TAX_CODE = "txcd_10103100";
const DEFAULT_CURRENCY = "aud";
const MIN_AMOUNT_CENTS = 50;
const MAX_AMOUNT_CENTS = 99_999_999;

export interface CreateManagedProductRequest {
  name: string;
  description?: string;
  amountCents: number;
  currency?: string;
  taxCode?: string;
  planId?: string;
}

export interface CreateManagedCheckoutSessionRequest {
  productId: string;
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface ManagedProductDoc {
  id: string;
  name: string;
  description: string;
  amountCents: number;
  currency: string;
  taxCode: string;
  planId: string;
  stripeProductId: string;
  stripePriceId: string;
  createdBy: string;
  createdAt: string;
}

export interface ManagedPaymentDoc {
  id: string;
  productId: string;
  buyerUid: string;
  amountCents: number;
  currency: string;
  status: "pending" | "paid";
  stripeSessionId: string;
  stripeCustomerId: string;
  stripePaymentIntentId: string;
  createdAt: string;
  paidAt?: string;
  updatedAt: string;
}

export function normalizeCurrency(raw: unknown): string {
  const code = String(raw || DEFAULT_CURRENCY)
    .trim()
    .toLowerCase();
  if (!/^[a-z]{3}$/.test(code)) throw new HttpsError("invalid-argument", "Currency must be a 3-letter code.");
  return code;
}

export function normalizeTaxCode(raw: unknown): string {
  const code = String(raw || DIGITAL_GOODS_TAX_CODE).trim();
  if (!/^txcd_[0-9]{8}$/.test(code)) throw new HttpsError("invalid-argument", "Unknown tax code.");
  return code;
}

function validatedProductInput(data: CreateManagedProductRequest): {
  name: string;
  description: string;
  amountCents: number;
  currency: string;
  taxCode: string;
  planId: string;
} {
  const name = String(data.name || "").trim();
  if (name.length < 1 || name.length > 120) throw new HttpsError("invalid-argument", "Product name is required.");
  const description = String(data.description || "")
    .trim()
    .slice(0, 500);
  const amountCents = Math.floor(Number(data.amountCents));
  if (!Number.isFinite(amountCents) || amountCents < MIN_AMOUNT_CENTS || amountCents > MAX_AMOUNT_CENTS) {
    throw new HttpsError("invalid-argument", "Amount must be a whole-cent value within range.");
  }
  return {
    name,
    description,
    amountCents,
    currency: normalizeCurrency(data.currency),
    taxCode: normalizeTaxCode(data.taxCode),
    planId: String(data.planId || "").trim(),
  };
}

export function buildProductCreateParams(input: {
  name: string;
  description: string;
  amountCents: number;
  currency: string;
  taxCode: string;
}): Stripe.ProductCreateParams {
  return {
    name: input.name,
    description: input.description || undefined,
    tax_code: input.taxCode,
    default_price_data: {
      unit_amount: input.amountCents,
      currency: input.currency,
    },
  };
}

function managedReturnUrls(origin: string, paymentId: string): { success: string; cancel: string } {
  return {
    success: `${origin}/me?managedPayment=${paymentId}&paid=1`,
    cancel: `${origin}/me?managedPayment=${paymentId}&canceled=1`,
  };
}

export function buildCheckoutSessionParams(args: {
  priceId: string;
  buyerUid: string;
  paymentId: string;
  productId: string;
  customerId?: string;
  customerEmail?: string;
  origin: string;
  successOverride?: string;
  cancelOverride?: string;
}): Stripe.Checkout.SessionCreateParams {
  const returns = managedReturnUrls(args.origin, args.paymentId);
  return {
    mode: "payment",
    managed_payments: { enabled: true },
    client_reference_id: args.buyerUid,
    customer: args.customerId || undefined,
    customer_email: !args.customerId && args.customerEmail ? args.customerEmail : undefined,
    submit_type: "pay",
    line_items: [{ price: args.priceId, quantity: 1 }],
    success_url: args.successOverride || returns.success,
    cancel_url: args.cancelOverride || returns.cancel,
    metadata: {
      managedPaymentId: args.paymentId,
      productId: args.productId,
      buyerUid: args.buyerUid,
    },
    payment_intent_data: {
      metadata: {
        managedPaymentId: args.paymentId,
        productId: args.productId,
      },
    },
  };
}

/** Blueprint "create a product". Admin-only; ids persist to Firestore. */
export const createManagedProduct = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "createManagedProduct");
  const uid = requireAuth(request.auth?.uid);
  const claims = (request.auth?.token || {}) as AccessClaims;
  if (!isPlatformAdmin(claims)) throw new HttpsError("permission-denied", "Only platform admins can add products.");
  await enforceRateLimit(uid, "pay", isAnonymousAuth(request));
  if (!stripeLiveConfigured()) throw new HttpsError("failed-precondition", "Stripe is not configured yet.");

  const input = validatedProductInput((request.data || {}) as CreateManagedProductRequest);
  if (input.planId) {
    const planSnap = await db.collection("plans").doc(input.planId).get();
    if (!planSnap.exists) throw new HttpsError("not-found", "Experience plan not found.");
  }

  const stripe = makeStripe();
  const product = await stripe.products.create(buildProductCreateParams(input));
  const priceId = String(typeof product.default_price === "string" ? product.default_price : "");
  if (!priceId) throw new HttpsError("internal", "Stripe did not return a default price.");

  const productId = `mp_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
  const now = new Date().toISOString();
  const doc: ManagedProductDoc = {
    id: productId,
    name: input.name,
    description: input.description,
    amountCents: input.amountCents,
    currency: input.currency,
    taxCode: input.taxCode,
    planId: input.planId,
    stripeProductId: product.id,
    stripePriceId: priceId,
    createdBy: uid,
    createdAt: now,
  };
  await db.collection("managed_products").doc(productId).set(doc);
  if (input.planId) {
    await db
      .collection("plans")
      .doc(input.planId)
      .set({ stripeProductId: product.id, stripePriceId: priceId, updatedAt: now }, { merge: true });
  }
  return { ok: true as const, productId, stripeProductId: product.id, stripePriceId: priceId };
});

/** Blueprint "checkout session" with managed payments enabled. */
export const createManagedCheckoutSession = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "createManagedCheckoutSession");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "pay", isAnonymousAuth(request));
  if (!stripeLiveConfigured()) throw new HttpsError("failed-precondition", "Card payments are not configured yet.");

  const data = (request.data || {}) as CreateManagedCheckoutSessionRequest;
  const productId = String(data.productId || "").trim();
  if (!productId) throw new HttpsError("invalid-argument", "productId is required.");
  const productSnap = await db.collection("managed_products").doc(productId).get();
  if (!productSnap.exists) throw new HttpsError("not-found", "Product not found.");
  const product = productSnap.data() as ManagedProductDoc;
  if (!product.stripePriceId) throw new HttpsError("failed-precondition", "Product has no Stripe price yet.");

  // Reuse the buyer's stored Stripe customer id when we have one.
  const userSnap = await db.collection("users").doc(uid).get();
  const storedCustomerId = String(
    (userSnap.data() as { stripeCustomerId?: string } | undefined)?.stripeCustomerId || "",
  );
  const customerEmail = String(data.customerEmail || request.auth?.token?.email || "").trim();

  const paymentId = `mpay_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
  const now = new Date().toISOString();
  const origin = headerOrigin(request) || APP_ORIGIN;
  const stripe = makeStripe();
  const session = await stripe.checkout.sessions.create(
    buildCheckoutSessionParams({
      priceId: product.stripePriceId,
      buyerUid: uid,
      paymentId,
      productId,
      customerId: storedCustomerId || undefined,
      customerEmail: customerEmail || undefined,
      origin,
      successOverride: data.successUrl ? origin + safeReturnPath(data.successUrl) : undefined,
      cancelOverride: data.cancelUrl ? origin + safeReturnPath(data.cancelUrl) : undefined,
    }),
  );

  const ledger: ManagedPaymentDoc = {
    id: paymentId,
    productId,
    buyerUid: uid,
    amountCents: product.amountCents,
    currency: product.currency,
    status: "pending",
    stripeSessionId: session.id,
    stripeCustomerId: "",
    stripePaymentIntentId: "",
    createdAt: now,
    updatedAt: now,
  };
  await db.collection("managed_payments").doc(paymentId).set(ledger);
  return { ok: true as const, paymentId, sessionId: session.id, checkoutUrl: session.url };
});
