import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  canTransitionOrder,
  orderSubtotal,
  validatePlaceFoodOrder,
  type ConfirmFoodOrderRequest,
  type FoodOrder,
  type FoodOrderItem,
  type FoodOrderStatus,
  type PlaceFoodOrderRequest,
  type PlaceFoodOrderResponse,
  type UpdateFoodOrderStatusRequest,
} from "../../shared/food";
import type { AccessClaims } from "../../shared/airpal-security";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import { CALLABLE, db, isPlatformAdmin, requireAuth } from "./admin";
import { sandboxBookingsAllowed } from "./stripe";

const ORDERS = "orders";
const CURRENCY = "AUD";

function stripeKey(): string {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || "";
  return key && !key.startsWith("mock_") ? key : "";
}

function orderRef(propertyId: string, orderId: string) {
  return db.collection("properties").doc(propertyId).collection(ORDERS).doc(orderId);
}

function hostUids(prop: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  const owner = String(prop.ownerId || "");
  if (owner) ids.add(owner);
  const members = prop.members && typeof prop.members === "object" ? (prop.members as Record<string, unknown>) : {};
  for (const uid of Object.keys(members)) {
    if (uid) ids.add(uid);
  }
  return Array.from(ids);
}

async function hostAllowed(propertyId: string, uid: string, caller: AccessClaims): Promise<Record<string, unknown>> {
  const propSnap = await db.collection("properties").doc(propertyId).get();
  if (!propSnap.exists) throw new HttpsError("not-found", "Property not found.");
  const prop = (propSnap.data() || {}) as Record<string, unknown>;
  const role = caller.properties?.[propertyId];
  const allowed = isPlatformAdmin(caller) || prop.ownerId === uid || role === "host_admin" || role === "staff";
  if (!allowed) throw new HttpsError("permission-denied", "Only the host team can do that.");
  return prop;
}

function orderSummary(order: FoodOrder): string {
  const lines = order.items.map((l) => `${l.qty}× ${l.name}`).join(", ");
  const where = order.mode === "room" ? `Room ${order.roomOrTable}` : order.mode === "table" ? `Table ${order.roomOrTable}` : "Pickup";
  return `${lines} · ${where}`;
}

async function notifyHosts(propertyId: string, order: FoodOrder): Promise<void> {
  try {
    const propSnap = await db.collection("properties").doc(propertyId).get();
    const prop = (propSnap.data() || {}) as Record<string, unknown>;
    const place = String(prop.name || "AirPal stay");
    const title = `New food order · ${place}`;
    const body = `${order.guestName} · ${orderSummary(order)} · $${order.subtotal.toFixed(2)}`;
    const tokens: string[] = [];
    for (const hostUid of hostUids(prop)) {
      await db.collection("users").doc(hostUid).collection("hostAlerts").doc(order.id).set({
        type: "food_order",
        propertyId,
        orderId: order.id,
        title,
        body,
        createdAt: FieldValue.serverTimestamp(),
        read: false,
      });
      const tokSnap = await db.collection("users").doc(hostUid).collection("fcmTokens").get();
      for (const row of tokSnap.docs) {
        const token = String(row.data()?.token || "");
        if (token) tokens.push(token);
      }
    }
    if (!tokens.length) return;
    await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: { type: "food_order", propertyId, orderId: order.id },
      webpush: { fcmOptions: { link: "https://airpal.me/host" } },
    });
  } catch {
    /* alerts must not fail the order */
  }
}

async function notifyGuest(order: FoodOrder, title: string, body: string): Promise<void> {
  try {
    if (!order.guestUid) return;
    const tokSnap = await db.collection("users").doc(order.guestUid).collection("fcmTokens").get();
    const tokens = tokSnap.docs.map((d) => String(d.data()?.token || "")).filter(Boolean);
    if (!tokens.length) return;
    await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: { type: "food_order", propertyId: order.propertyId, orderId: order.id },
      webpush: { fcmOptions: { link: `https://airpal.me/g/${order.propertyId}?order=${order.id}` } },
    });
  } catch {
    /* push is best-effort; the order doc is the source of truth */
  }
}

async function createStripeSession(input: {
  uid: string;
  propertyId: string;
  propertyName: string;
  orderId: string;
  lines: FoodOrderItem[];
  currency: string;
}): Promise<{ sessionId: string; url: string } | null> {
  const key = stripeKey();
  if (!key) return null;
  try {
    const params = new URLSearchParams();
    params.append("payment_method_types[]", "card");
    params.append("mode", "payment");
    params.append("client_reference_id", input.uid);
    params.append("metadata[orderId]", input.orderId);
    params.append("metadata[propertyId]", input.propertyId);
    params.append("metadata[kind]", "food_order");
    input.lines.forEach((line, i) => {
      params.append(`line_items[${i}][price_data][currency]`, input.currency.toLowerCase());
      params.append(`line_items[${i}][price_data][unit_amount]`, String(Math.round(line.unitPrice * 100)));
      params.append(`line_items[${i}][price_data][product_data][name]`, `${line.name} × ${line.qty}`);
      params.append(`line_items[${i}][quantity]`, "1");
    });
    params.append("success_url", `https://airpal.me/g/${input.propertyId}?order=${input.orderId}`);
    params.append("cancel_url", `https://airpal.me/g/${input.propertyId}?order=${input.orderId}&cancelled=1`);
    const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!resp.ok) return null;
    const session = (await resp.json()) as { id?: string; url?: string };
    if (!session.id || !session.url) return null;
    return { sessionId: session.id, url: session.url };
  } catch {
    return null;
  }
}

async function stripeSessionPaid(sessionId: string): Promise<{ paid: boolean; paymentIntentId: string }> {
  const key = stripeKey();
  if (!key) return { paid: false, paymentIntentId: "" };
  try {
    const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!resp.ok) return { paid: false, paymentIntentId: "" };
    const session = (await resp.json()) as { payment_status?: string; payment_intent?: string };
    return {
      paid: session.payment_status === "paid",
      paymentIntentId: String(session.payment_intent || ""),
    };
  } catch {
    return { paid: false, paymentIntentId: "" };
  }
}

/** Guest places a food order. Prices come from the live menu, never the client. */
export const placeFoodOrder = onCall(CALLABLE, async (request): Promise<PlaceFoodOrderResponse> => {
  await noteAppCheck(request, "placeFoodOrder");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "foodOrder", isAnonymousAuth(request));
  const data = (request.data || {}) as PlaceFoodOrderRequest;
  const propertyId = String(data.propertyId || "").trim();
  const mode = data.mode === "room" || data.mode === "table" || data.mode === "pickup" ? data.mode : "pickup";
  const roomOrTable = String(data.roomOrTable || "").trim();

  const propSnap = await db.collection("properties").doc(propertyId).get();
  if (!propSnap.exists) throw new HttpsError("not-found", "This stay isn't listed yet. Ask the desk.");
  const propertyName = String((propSnap.data() || {}).name || "AirPal stay");

  const menuSnap = await db.collection("properties").doc(propertyId).collection("menu").get();
  const menu = menuSnap.docs.map((d) => {
    const m = d.data() as { id?: string; name?: string; price?: number; available?: boolean };
    return { id: String(m.id || d.id), name: String(m.name || ""), price: Number(m.price || 0), available: m.available };
  });
  const errors = validatePlaceFoodOrder({ propertyId, items: data.items, mode, roomOrTable }, menu);
  if (errors.length) throw new HttpsError("invalid-argument", errors.join(" "));

  const byId = new Map(menu.map((m) => [m.id, m]));
  const lines: FoodOrderItem[] = (data.items || []).map((l) => {
    const row = byId.get(String(l.menuItemId))!;
    return { menuItemId: row.id, name: row.name, unitPrice: row.price, qty: Math.floor(Number(l.qty)) };
  });
  const subtotal = orderSubtotal(lines);
  const orderId = `ord_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
  const now = new Date().toISOString();
  const guestName =
    String(data.guestName || "").trim() ||
    (mode === "room" && roomOrTable ? `Room ${roomOrTable}` : "Guest");

  const base: FoodOrder = {
    id: orderId,
    propertyId,
    guestUid: uid,
    guestName,
    mode,
    roomOrTable,
    items: lines,
    subtotal,
    currency: CURRENCY,
    paymentMethod: "stripe",
    paymentStatus: "unpaid",
    status: "pending_payment",
    createdAt: now,
    updatedAt: now,
  };

  const stripe = await createStripeSession({ uid, propertyId, propertyName, orderId, lines, currency: CURRENCY });
  if (stripe) {
    await orderRef(propertyId, orderId).set({ ...base, stripeSessionId: stripe.sessionId });
    return { ok: true, orderId, mode: "live_stripe", checkoutUrl: stripe.url, subtotal, currency: CURRENCY, status: "pending_payment" };
  }

  if (!sandboxBookingsAllowed()) {
    throw new HttpsError("failed-precondition", "Card payments are not configured for this kitchen yet. Please ask the desk.");
  }
  const placed: FoodOrder = { ...base, status: "placed", paymentStatus: "sandbox", simulated: true };
  await orderRef(propertyId, orderId).set(placed);
  await notifyHosts(propertyId, placed);
  return { ok: true, orderId, mode: "sandbox", subtotal, currency: CURRENCY, status: "placed" };
});

/** Guest returns from Stripe (or sandbox confirms inline): verify payment, fire the kitchen. */
export const confirmFoodOrder = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "confirmFoodOrder");
  const uid = requireAuth(request.auth?.uid);
  const data = (request.data || {}) as ConfirmFoodOrderRequest;
  const propertyId = String(data.propertyId || "").trim();
  const orderId = String(data.orderId || "").trim();
  if (!propertyId || !orderId) throw new HttpsError("invalid-argument", "propertyId and orderId are required.");

  const ref = orderRef(propertyId, orderId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
  const order = snap.data() as FoodOrder;
  const caller = (request.auth?.token || {}) as AccessClaims;
  const role = caller.properties?.[propertyId];
  const propOwner = String((await db.collection("properties").doc(propertyId).get()).data()?.ownerId || "");
  const allowed = order.guestUid === uid || isPlatformAdmin(caller) || propOwner === uid || role === "host_admin" || role === "staff";
  if (!allowed) throw new HttpsError("permission-denied", "Only the guest or host team can confirm this order.");
  if (order.status !== "pending_payment") return { ok: true as const, status: order.status, orderId };

  if (order.simulated && sandboxBookingsAllowed()) {
    await ref.set({ status: "placed", updatedAt: new Date().toISOString() }, { merge: true });
    await notifyHosts(propertyId, { ...order, status: "placed" });
    return { ok: true as const, status: "placed" as FoodOrderStatus, orderId };
  }
  if (!order.stripeSessionId) throw new HttpsError("failed-precondition", "Payment has not been verified for this order.");
  const { paid, paymentIntentId } = await stripeSessionPaid(order.stripeSessionId);
  if (!paid) throw new HttpsError("failed-precondition", "Payment hasn't cleared yet — complete checkout first.");
  const placed = { ...order, status: "placed" as FoodOrderStatus, paymentStatus: "paid" as const };
  await ref.set(
    { status: "placed", paymentStatus: "paid", paymentIntentId, updatedAt: new Date().toISOString() },
    { merge: true },
  );
  await notifyHosts(propertyId, placed);
  return { ok: true as const, status: "placed" as FoodOrderStatus, orderId };
});

/** Host team advances an order through the kitchen lifecycle. */
export const updateFoodOrderStatus = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "updateFoodOrderStatus");
  const uid = requireAuth(request.auth?.uid);
  const data = (request.data || {}) as UpdateFoodOrderStatusRequest;
  const propertyId = String(data.propertyId || "").trim();
  const orderId = String(data.orderId || "").trim();
  const next = data.status;
  if (!propertyId || !orderId) throw new HttpsError("invalid-argument", "propertyId and orderId are required.");

  const caller = (request.auth?.token || {}) as AccessClaims;
  await hostAllowed(propertyId, uid, caller);

  const ref = orderRef(propertyId, orderId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
  const order = snap.data() as FoodOrder;
  if (!canTransitionOrder(order.status, next)) {
    throw new HttpsError("failed-precondition", `Can't move an order from ${order.status} to ${next}.`);
  }
  await ref.set({ status: next, updatedAt: new Date().toISOString(), updatedBy: uid }, { merge: true });
  if (next === "ready") {
    await notifyGuest({ ...order, status: next }, "Your order is ready", `${order.items.map((l) => `${l.qty}× ${l.name}`).join(", ")} · ${order.mode === "pickup" ? "come collect it" : "it's on its way"}`);
  } else if (next === "served" || next === "completed") {
    await notifyGuest({ ...order, status: next }, "Enjoy", "Thanks for ordering with us.");
  }
  return { ok: true as const, status: next, orderId };
});
