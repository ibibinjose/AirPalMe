/**
 * Food ordering: guests order from the stay menu (room service, dine-in, or
 * pickup), pay by card via Stripe, and the host kitchen works an order queue.
 * Prices are always re-resolved server-side from the live menu — the client
 * only sends item ids and quantities.
 */
import type { MenuItem } from "./airpal-data";

export const FOOD_ORDER_MODES = ["room", "table", "pickup"] as const;
export type FoodOrderMode = (typeof FOOD_ORDER_MODES)[number];

export const FOOD_ORDER_MODE_LABELS: Record<FoodOrderMode, string> = {
  room: "Room service",
  table: "Dine-in",
  pickup: "Pickup",
};

export const FOOD_ORDER_STATUSES = [
  "pending_payment",
  "placed",
  "preparing",
  "ready",
  "served",
  "completed",
  "cancelled",
] as const;
export type FoodOrderStatus = (typeof FOOD_ORDER_STATUSES)[number];

export const FOOD_ORDER_STATUS_LABELS: Record<FoodOrderStatus, string> = {
  pending_payment: "Awaiting payment",
  placed: "Received",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  completed: "Completed",
  cancelled: "Cancelled",
};

const ORDER_TRANSITIONS: Record<FoodOrderStatus, FoodOrderStatus[]> = {
  pending_payment: ["placed", "cancelled"],
  placed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "completed"],
  served: ["completed"],
  completed: [],
  cancelled: [],
};

export function canTransitionOrder(from: FoodOrderStatus, to: FoodOrderStatus): boolean {
  return (ORDER_TRANSITIONS[from] || []).includes(to);
}

export interface FoodOrderItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  qty: number;
}

export interface FoodOrder {
  id: string;
  propertyId: string;
  guestUid: string;
  guestName: string;
  mode: FoodOrderMode;
  /** Room number for room service, table number for dine-in, "" for pickup. */
  roomOrTable: string;
  items: FoodOrderItem[];
  subtotal: number;
  currency: string;
  paymentMethod: "stripe";
  paymentStatus: "unpaid" | "paid" | "sandbox";
  stripeSessionId?: string;
  simulated?: boolean;
  status: FoodOrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceFoodOrderItemInput {
  menuItemId: string;
  qty: number;
}

export interface PlaceFoodOrderRequest {
  propertyId: string;
  items: PlaceFoodOrderItemInput[];
  mode: FoodOrderMode;
  roomOrTable?: string;
  guestName?: string;
}

export interface PlaceFoodOrderResponse {
  ok: boolean;
  orderId: string;
  mode: "live_stripe" | "sandbox";
  checkoutUrl?: string;
  subtotal: number;
  currency: string;
  status: FoodOrderStatus;
}

export interface ConfirmFoodOrderRequest {
  propertyId: string;
  orderId: string;
}

export interface UpdateFoodOrderStatusRequest {
  propertyId: string;
  orderId: string;
  status: FoodOrderStatus;
}

export const MAX_ORDER_LINES = 20;
export const MAX_QTY_PER_LINE = 20;

type MenuLookup = Pick<MenuItem, "id" | "name" | "price" | "available">;

export function validatePlaceFoodOrder(
  input: { propertyId?: string; items?: PlaceFoodOrderItemInput[]; mode?: string; roomOrTable?: string },
  menu: MenuLookup[],
): string[] {
  const errors: string[] = [];
  if (!String(input.propertyId || "").trim()) {
    errors.push("Choose the stay you're ordering from.");
    return errors;
  }
  const mode = String(input.mode || "") as FoodOrderMode;
  if (!(FOOD_ORDER_MODES as readonly string[]).includes(mode)) {
    errors.push("Choose room service, dine-in, or pickup.");
  }
  if ((mode === "room" || mode === "table") && !String(input.roomOrTable || "").trim()) {
    errors.push(mode === "room" ? "Add your room number." : "Add your table number.");
  }
  const items = Array.isArray(input.items) ? input.items : [];
  if (!items.length) errors.push("Add at least one dish.");
  if (items.length > MAX_ORDER_LINES) errors.push(`At most ${MAX_ORDER_LINES} lines per order.`);
  const byId = new Map(menu.map((m) => [m.id, m]));
  for (const line of items) {
    const row = byId.get(String(line.menuItemId || ""));
    if (!row) {
      errors.push("One of those dishes is no longer on the menu.");
      break;
    }
    if (row.available === false) {
      errors.push(`${row.name} is unavailable right now.`);
      break;
    }
    const qty = Math.floor(Number(line.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
      errors.push(`Quantity for ${row.name} must be 1–${MAX_QTY_PER_LINE}.`);
      break;
    }
  }
  return errors;
}

/** Dollar total, rounded to cents. */
export function orderSubtotal(items: Array<{ unitPrice: number; qty: number }>): number {
  const total = items.reduce((sum, line) => sum + Number(line.unitPrice || 0) * Math.floor(Number(line.qty || 0)), 0);
  return Math.round(total * 100) / 100;
}

export function orderTotalLabel(subtotal: number, currency = "AUD"): string {
  const code = String(currency || "AUD").toUpperCase();
  const symbol = code === "AUD" || code === "USD" ? "$" : `${code} `;
  return `${symbol}${subtotal.toFixed(2)}`;
}

export function validateVenues(rows: Array<{ kind?: string; name?: string }>): string[] {
  const errors: string[] = [];
  if (rows.length > 20) errors.push("At most 20 venues per stay.");
  for (const row of rows) {
    if (!String(row.name || "").trim()) {
      errors.push("Every venue needs a name.");
      break;
    }
  }
  return errors;
}
