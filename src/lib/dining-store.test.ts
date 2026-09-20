import { describe, expect, it } from "vitest";
import { activeOrderCount, orderFromDoc } from "./dining-store";

describe("orderFromDoc", () => {
  it("normalizes a dining order and drops empty carts", () => {
    const order = orderFromDoc("dor_1", {
      propertyId: "harbour-hotel",
      roomNumber: "101",
      items: [{ menuItemId: "m-1", name: "Butter Chicken", unitCents: 2600, qty: 2 }],
      totalCents: 5200,
      status: "paid",
      paymentMode: "checkout",
      createdAt: "2026-09-20T10:00:00.000Z",
    });
    expect(order?.id).toBe("dor_1");
    expect(order?.status).toBe("paid");
    expect(order?.items[0]?.unitCents).toBe(2600);
    expect(orderFromDoc("dor_empty", { items: [] })).toBeNull();
    expect(orderFromDoc("dor_weird", { items: [{ name: "x" }], status: "flying" })?.status).toBe("pending");
  });
});

describe("activeOrderCount", () => {
  it("counts orders needing desk action only", () => {
    const rows = (["pending", "paid", "preparing", "ready", "delivered", "cancelled"] as const).map((status, i) => ({
      id: `dor_${i}`,
      propertyId: "p",
      roomNumber: "1",
      items: [{ menuItemId: "m", name: "x", unitCents: 100, qty: 1 }],
      totalCents: 100,
      currency: "aud",
      status,
      paymentMode: "checkout" as const,
      createdAt: "",
      updatedAt: "",
    }));
    expect(activeOrderCount(rows)).toBe(4);
  });
});
