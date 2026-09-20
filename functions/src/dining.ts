import { randomBytes } from "node:crypto";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import type { DiningOrder, DiningOrderItem, DiningOrderStatus, MenuItem } from "../../shared/airpal-data";
import { CALLABLE, db, isPlatformAdmin, requireAuth } from "./admin";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import { headerOrigin, makeStripe, safeReturnPath, stripeLiveConfigured } from "./stripe";
import type { AccessClaims } from "../../shared/airpal-security";

/**
 * QR order-and-pay for in-stay dining. Guests order from the live menu in
 * the companion; prices resolve server-side from `properties/{id}/menu`
 * (never trusted from the client). Payment rides Stripe Managed Payments
 * when configured, otherwise the order fires to the desk for pay-at-desk /
 * room charge. Hosts advance orders in /host; new orders join the red
 * front-desk alert alongside guest tickets.
 */

const APP_ORIGIN = "https://airpal.me";
const MAX_LINES = 12;
const MAX_QTY = 20;

export interface PlaceDiningOrderRequest {
  propertyId: string;
  roomNumber?: string;
  items: Array<{ menuItemId: string; qty: number }>;
  successUrl?: string;
  cancelUrl?: string;
}

const NEXT_STATUS: Record<string, DiningOrderStatus[]> = {
  pending: ["cancelled"],
  paid: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function validateOrderLines(
  requested: PlaceDiningOrderRequest["items"],
  menu: MenuItem[],
): { lines: DiningOrderItem[]; totalCents: number } {
  if (!Array.isArray(requested) || requested.length < 1 || requested.length > MAX_LINES) {
    throw new HttpsError("invalid-argument", "Add between 1 and 12 dishes.");
  }
  const live = new Map(menu.filter((m) => m.available !== false).map((m) => [m.id, m]));
  const lines: DiningOrderItem[] = [];
  for (const row of requested) {
    const qty = Math.floor(Number(row?.qty));
    if (!row?.menuItemId || !Number.isFinite(qty) || qty < 1 || qty > MAX_QTY) {
      throw new HttpsError("invalid-argument", "Fix the quantities and try again.");
    }
    const dish = live.get(String(row.menuItemId));
    if (!dish) throw new HttpsError("not-found", "A dish is no longer on the menu.");
    const unitCents = Math.round(Number(dish.price) * 100);
    if (!Number.isFinite(unitCents) || unitCents <= 0) {
      throw new HttpsError("failed-precondition", "A dish has no price yet. Ask the desk.");
    }
    lines.push({ menuItemId: dish.id, name: dish.name, unitCents, qty });
  }
  const totalCents = lines.reduce((n, l) => n + l.unitCents * l.qty, 0);
  if (totalCents <= 0) throw new HttpsError("invalid-argument", "The order total must be above zero.");
  return { lines, totalCents };
}

async function requirePropertyRole(uid: string, claims: AccessClaims, propertyId: string): Promise<void> {
  if (isPlatformAdmin(claims)) return;
  const propSnap = await db.collection("properties").doc(propertyId).get();
  const prop = (propSnap.data() || {}) as { ownerId?: string };
  const role = claims.properties?.[propertyId];
  if (propSnap.exists && (prop.ownerId === uid || role === "host_admin" || role === "staff")) return;
  throw new HttpsError("permission-denied", "Only the host team can update orders.");
}

export const placeDiningOrder = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "placeDiningOrder");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "ticket", isAnonymousAuth(request));

  const data = (request.data || {}) as PlaceDiningOrderRequest;
  const propertyId = String(data.propertyId || "").trim();
  if (!propertyId || propertyId === "unknown") throw new HttpsError("invalid-argument", "This stay isn't listed yet.");
  const propSnap = await db.collection("properties").doc(propertyId).get();
  if (!propSnap.exists) throw new HttpsError("not-found", "This stay isn't listed yet.");
  const roomNumber = String(data.roomNumber || "Guest").trim() || "Guest";

  const menuSnap = await db.collection("properties").doc(propertyId).collection("menu").get();
  const menu = menuSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MenuItem, "id">) }));
  const { lines, totalCents } = validateOrderLines(data.items, menu);

  const orderId = `dor_${propertyId}_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
  const now = new Date().toISOString();
  const liveCheckout = stripeLiveConfigured();

  const order: DiningOrder = {
    id: orderId,
    propertyId,
    roomNumber,
    guestUid: isAnonymousAuth(request) ? undefined : uid,
    items: lines,
    totalCents,
    currency: "aud",
    status: "pending",
    paymentMode: liveCheckout ? "checkout" : "desk",
    createdAt: now,
    updatedAt: now,
  };
  const orderRef = db.collection("properties").doc(propertyId).collection("dining_orders").doc(orderId);
  await orderRef.set(order);

  if (!liveCheckout) {
    return { ok: true as const, orderId, totalCents, currency: "aud", payAtDesk: true as const, checkoutUrl: null };
  }

  const origin = headerOrigin(request) || APP_ORIGIN;
  const session = await makeStripe().checkout.sessions.create({
    mode: "payment",
    managed_payments: { enabled: true },
    client_reference_id: uid,
    customer_email: request.auth?.token?.email || undefined,
    submit_type: "pay",
    line_items: lines.map((l) => ({
      quantity: l.qty,
      price_data: {
        currency: "aud",
        unit_amount: l.unitCents,
        product_data: { name: l.name },
      },
    })),
    success_url: data.successUrl
      ? origin + safeReturnPath(data.successUrl)
      : `${origin}/g/${propertyId}?order=${orderId}&paid=1`,
    cancel_url: data.cancelUrl
      ? origin + safeReturnPath(data.cancelUrl)
      : `${origin}/g/${propertyId}?order=${orderId}&canceled=1`,
    metadata: { diningOrderId: orderId, propertyId, roomNumber, buyerUid: uid },
    payment_intent_data: { metadata: { diningOrderId: orderId, propertyId } },
  });
  await orderRef.set({ stripeCheckoutSessionId: session.id, updatedAt: new Date().toISOString() }, { merge: true });
  return { ok: true as const, orderId, totalCents, currency: "aud", checkoutUrl: session.url, sessionId: session.id };
});

export const updateDiningOrderStatus = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "updateDiningOrderStatus");
  const uid = requireAuth(request.auth?.uid);
  const data = (request.data || {}) as { propertyId?: string; orderId?: string; status?: string };
  const propertyId = String(data.propertyId || "").trim();
  const orderId = String(data.orderId || "").trim();
  const status = String(data.status || "").trim() as DiningOrderStatus;
  if (!propertyId || !orderId) throw new HttpsError("invalid-argument", "propertyId and orderId are required.");
  await requirePropertyRole(uid, (request.auth?.token || {}) as AccessClaims, propertyId);

  const ref = db.collection("properties").doc(propertyId).collection("dining_orders").doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
  const current = String((snap.data() as { status?: string } | undefined)?.status || "pending");
  if (!NEXT_STATUS[current]?.includes(status)) {
    throw new HttpsError("failed-precondition", `Cannot move an order from ${current} to ${status || "?"}.`);
  }
  await ref.set({ status, updatedAt: new Date().toISOString() }, { merge: true });
  return { ok: true as const, orderId, status };
});
