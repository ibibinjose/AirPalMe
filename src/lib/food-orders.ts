import { collection, doc, getDoc, onSnapshot, orderBy, query } from "firebase/firestore";
import type { FoodOrder, FoodOrderStatus } from "@shared/food";
import { getFirebaseDb } from "./firebase";

function orderFromDoc(id: string, data: Record<string, unknown>): FoodOrder | null {
  const items = Array.isArray(data.items) ? data.items : [];
  if (!data.propertyId || !items.length) return null;
  const status = String(data.status || "placed");
  const allowed: FoodOrderStatus[] = ["pending_payment", "placed", "preparing", "ready", "served", "completed", "cancelled"];
  return {
    id,
    propertyId: String(data.propertyId),
    guestUid: String(data.guestUid || ""),
    guestName: String(data.guestName || "Guest"),
    mode: data.mode === "room" || data.mode === "table" ? data.mode : "pickup",
    roomOrTable: String(data.roomOrTable || ""),
    items: items.map((l) => {
      const line = (l || {}) as Record<string, unknown>;
      return {
        menuItemId: String(line.menuItemId || ""),
        name: String(line.name || "Dish"),
        unitPrice: Number(line.unitPrice || 0),
        qty: Math.max(1, Math.floor(Number(line.qty || 1))),
      };
    }),
    subtotal: Number(data.subtotal || 0),
    currency: String(data.currency || "AUD"),
    paymentMethod: "stripe",
    paymentStatus: data.paymentStatus === "paid" ? "paid" : data.paymentStatus === "sandbox" ? "sandbox" : "unpaid",
    stripeSessionId: typeof data.stripeSessionId === "string" ? data.stripeSessionId : undefined,
    simulated: Boolean(data.simulated),
    status: (allowed as string[]).includes(status) ? (status as FoodOrderStatus) : "placed",
    createdAt: String(data.createdAt || ""),
    updatedAt: String(data.updatedAt || data.createdAt || ""),
  };
}

/** Host kitchen queue: newest first. */
export function subscribePropertyOrders(propertyId: string, onChange: (orders: FoodOrder[]) => void): () => void {
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
    query(collection(db, "properties", propertyId, "orders"), orderBy("createdAt", "desc")),
    (snap) => {
      const rows: FoodOrder[] = [];
      for (const d of snap.docs) {
        const row = orderFromDoc(d.id, d.data() as Record<string, unknown>);
        if (row) rows.push(row);
      }
      onChange(rows);
    },
    () => onChange([]),
  );
}

/** Guest live tracking for one order. */
export function subscribeFoodOrder(
  propertyId: string,
  orderId: string,
  onChange: (order: FoodOrder | null) => void,
): () => void {
  const db = getFirebaseDb();
  if (!db || !propertyId || !orderId) {
    onChange(null);
    return () => undefined;
  }
  return onSnapshot(
    doc(db, "properties", propertyId, "orders", orderId),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(orderFromDoc(snap.id, snap.data() as Record<string, unknown>));
    },
    () => onChange(null),
  );
}

export async function fetchFoodOrder(propertyId: string, orderId: string): Promise<FoodOrder | null> {
  const db = getFirebaseDb();
  if (!db || !propertyId || !orderId) return null;
  try {
    const snap = await getDoc(doc(db, "properties", propertyId, "orders", orderId));
    if (!snap.exists()) return null;
    return orderFromDoc(snap.id, snap.data() as Record<string, unknown>);
  } catch {
    return null;
  }
}

const LAST_KEY = "airpal.foodorder.last";

export function lastOrderId(propertyId: string): string | null {
  try {
    const raw = JSON.parse(localStorage.getItem(LAST_KEY) || "{}") as Record<string, string>;
    return raw[propertyId] || null;
  } catch {
    return null;
  }
}

export function rememberOrderId(propertyId: string, orderId: string): void {
  try {
    const raw = JSON.parse(localStorage.getItem(LAST_KEY) || "{}") as Record<string, string>;
    raw[propertyId] = orderId;
    localStorage.setItem(LAST_KEY, JSON.stringify(raw));
  } catch {
    /* tracking hint is best-effort */
  }
}
