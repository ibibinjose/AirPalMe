import type { DiningOrder, StaffTicket } from "@shared/airpal-data";

export function activeTickets(tickets: StaffTicket[]): StaffTicket[] {
  return tickets.filter((t) => t.status !== "resolved");
}

export function resolvedTickets(tickets: StaffTicket[]): StaffTicket[] {
  return tickets.filter((t) => t.status === "resolved");
}

export function activeDiningOrders(orders: DiningOrder[]): DiningOrder[] {
  return orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled");
}

export function pastDiningOrders(orders: DiningOrder[]): DiningOrder[] {
  return orders.filter((o) => o.status === "delivered" || o.status === "cancelled");
}

export type OrderAdvance = { next: "preparing" | "ready" | "delivered"; label: string };

/** Next kitchen step with its plain-language button label. */
export function nextOrderStatus(status: string): OrderAdvance {
  if (status === "ready") return { next: "delivered", label: "Complete Delivery" };
  if (status === "preparing") return { next: "ready", label: "Mark Ready" };
  return { next: "preparing", label: "Start Preparing" };
}

/** Compact relative age for host boards. Silent on missing or bad input. */
export function formatTimeAgo(isoString?: string, nowMs = Date.now()): string {
  if (!isoString) return "";
  try {
    const diff = Math.floor((nowMs - new Date(isoString).getTime()) / 1000);
    if (!Number.isFinite(diff)) return "";
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return "";
  }
}
