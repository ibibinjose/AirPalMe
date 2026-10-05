import { describe, expect, it } from "vitest";
import {
  activeDiningOrders,
  activeTickets,
  formatTimeAgo,
  nextOrderStatus,
  pastDiningOrders,
  resolvedTickets,
} from "./host-boards";

const TICKETS = [
  { id: "a", status: "open" },
  { id: "b", status: "resolved" },
  { id: "c", status: "open" },
] as Array<{ id: string; status: string }>;

const ORDERS = [
  { id: "a", status: "new" },
  { id: "b", status: "preparing" },
  { id: "c", status: "delivered" },
  { id: "d", status: "cancelled" },
] as Array<{ id: string; status: string }>;

describe("host board filters", () => {
  it("splits tickets into active and resolved", () => {
    expect(activeTickets(TICKETS).map((t) => t.id)).toEqual(["a", "c"]);
    expect(resolvedTickets(TICKETS).map((t) => t.id)).toEqual(["b"]);
  });

  it("splits dining orders into active and past", () => {
    expect(activeDiningOrders(ORDERS).map((o) => o.id)).toEqual(["a", "b"]);
    expect(pastDiningOrders(ORDERS).map((o) => o.id)).toEqual(["c", "d"]);
  });
});

describe("nextOrderStatus", () => {
  it("advances the kitchen flow with plain labels", () => {
    expect(nextOrderStatus("new")).toEqual({ next: "preparing", label: "Start Preparing" });
    expect(nextOrderStatus("preparing")).toEqual({ next: "ready", label: "Mark Ready" });
    expect(nextOrderStatus("ready")).toEqual({ next: "delivered", label: "Complete Delivery" });
  });
});

describe("formatTimeAgo", () => {
  const NOW = Date.parse("2026-09-21T12:00:00.000Z");

  it("renders compact relative ages and stays silent on bad input", () => {
    expect(formatTimeAgo(new Date(NOW - 30_000).toISOString(), NOW)).toBe("Just now");
    expect(formatTimeAgo(new Date(NOW - 12 * 60_000).toISOString(), NOW)).toBe("12m ago");
    expect(formatTimeAgo(new Date(NOW - 3 * 3600_000).toISOString(), NOW)).toBe("3h ago");
    expect(formatTimeAgo(new Date(NOW - 2 * 86400_000).toISOString(), NOW)).toBe("2d ago");
    expect(formatTimeAgo(undefined, NOW)).toBe("");
    expect(formatTimeAgo("junk", NOW)).toBe("");
  });
});
