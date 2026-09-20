import { collection, onSnapshot } from "firebase/firestore";
import type { DiningOrder, DiningOrderStatus } from "@shared/airpal-data";
import { getFirebaseDb } from "./firebase";

const ACTIVE: DiningOrderStatus[] = ["pending", "paid", "preparing", "ready"];

export function orderFromDoc(id: string, data: Record<string, unknown>): DiningOrder | null {
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) return null;
  const status = String(data.status || "pending");
  const allowed: DiningOrderStatus[] = ["pending", "paid", "preparing", "ready", "delivered", "cancelled"];
  return {
    id,
    propertyId: String(data.propertyId || ""),
    roomNumber: String(data.roomNumber || "Guest"),
    guestUid: typeof data.guestUid === "string" ? data.guestUid : undefined,
    items: items
      .filter((row) => row && typeof row === "object")
      .map((row) => {
        const item = row as Record<string, unknown>;
        return {
          menuItemId: String(item.menuItemId || ""),
          name: String(item.name || "Dish"),
          unitCents: Math.max(0, Math.floor(Number(item.unitCents || 0))),
          qty: Math.max(1, Math.floor(Number(item.qty || 1))),
        };
      }),
    totalCents: Math.max(0, Math.floor(Number(data.totalCents || 0))),
    currency: String(data.currency || "aud"),
    status: allowed.includes(status as DiningOrderStatus) ? (status as DiningOrderStatus) : "pending",
    paymentMode: data.paymentMode === "desk" ? "desk" : "checkout",
    stripeCheckoutSessionId:
      typeof data.stripeCheckoutSessionId === "string" ? data.stripeCheckoutSessionId : undefined,
    createdAt: String(data.createdAt || new Date().toISOString()),
    paidAt: typeof data.paidAt === "string" ? data.paidAt : undefined,
    updatedAt: String(data.updatedAt || new Date().toISOString()),
  };
}

/** Orders still needing desk action (unpaid desk orders count — the kitchen fires on place). */
export function activeOrderCount(orders: DiningOrder[]) {
  return orders.filter((o) => ACTIVE.includes(o.status)).length;
}

/** Live desk feed for one property. Host-only read (see firestore.rules). */
export function subscribePropertyDiningOrders(
  propertyId: string,
  onChange: (orders: DiningOrder[]) => void,
): () => void {
  if (!propertyId || propertyId === "unknown") {
    onChange([]);
    return () => undefined;
  }
  const db = getFirebaseDb();
  if (!db) {
    onChange([]);
    return () => undefined;
  }
  return onSnapshot(
    collection(db, "properties", propertyId, "dining_orders"),
    (snap) => {
      const rows: DiningOrder[] = [];
      for (const row of snap.docs) {
        const order = orderFromDoc(row.id, row.data() as Record<string, unknown>);
        if (order) rows.push(order);
      }
      rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onChange(rows);
    },
    () => onChange([]),
  );
}
