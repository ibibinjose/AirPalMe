import { describe, expect, it } from "vitest";
import {
  canTransitionOrder,
  orderSubtotal,
  orderTotalLabel,
  validatePlaceFoodOrder,
  validateVenues,
} from "./food";

const MENU = [
  { id: "m-1", name: "Butter Chicken", price: 24, available: true },
  { id: "m-2", name: "Masala Chai", price: 5, available: true },
  { id: "m-3", name: "Sold Out Curry", price: 20, available: false },
];

describe("food orders", () => {
  it("accepts a well-formed order", () => {
    expect(
      validatePlaceFoodOrder(
        { propertyId: "p1", mode: "room", roomOrTable: "204", items: [{ menuItemId: "m-1", qty: 2 }] },
        MENU,
      ),
    ).toEqual([]);
  });

  it("requires a property, items, and a valid mode", () => {
    expect(validatePlaceFoodOrder({ propertyId: "", items: [], mode: "room" }, MENU)).toContain(
      "Choose the stay you're ordering from.",
    );
    expect(
      validatePlaceFoodOrder({ propertyId: "p1", mode: "pickup", items: [] }, MENU),
    ).toContain("Add at least one dish.");
    expect(
      validatePlaceFoodOrder({ propertyId: "p1", mode: "drone", items: [{ menuItemId: "m-1", qty: 1 }] }, MENU),
    ).toContain("Choose room service, dine-in, or pickup.");
  });

  it("requires room/table numbers only for those modes", () => {
    expect(
      validatePlaceFoodOrder({ propertyId: "p1", mode: "room", items: [{ menuItemId: "m-1", qty: 1 }] }, MENU),
    ).toContain("Add your room number.");
    expect(
      validatePlaceFoodOrder({ propertyId: "p1", mode: "table", items: [{ menuItemId: "m-1", qty: 1 }] }, MENU),
    ).toContain("Add your table number.");
    expect(
      validatePlaceFoodOrder({ propertyId: "p1", mode: "pickup", items: [{ menuItemId: "m-1", qty: 1 }] }, MENU),
    ).toEqual([]);
  });

  it("rejects unknown, unavailable, and over-quantity lines", () => {
    expect(
      validatePlaceFoodOrder({ propertyId: "p1", mode: "pickup", items: [{ menuItemId: "nope", qty: 1 }] }, MENU),
    ).toContain("One of those dishes is no longer on the menu.");
    expect(
      validatePlaceFoodOrder({ propertyId: "p1", mode: "pickup", items: [{ menuItemId: "m-3", qty: 1 }] }, MENU),
    ).toContain("Sold Out Curry is unavailable right now.");
    expect(
      validatePlaceFoodOrder({ propertyId: "p1", mode: "pickup", items: [{ menuItemId: "m-1", qty: 0 }] }, MENU),
    ).toContain("Quantity for Butter Chicken must be 1–20.");
    expect(
      validatePlaceFoodOrder({ propertyId: "p1", mode: "pickup", items: [{ menuItemId: "m-1", qty: 21 }] }, MENU),
    ).toContain("Quantity for Butter Chicken must be 1–20.");
  });

  it("totals in dollars to the cent", () => {
    expect(orderSubtotal([{ unitPrice: 24, qty: 2 }, { unitPrice: 5, qty: 1 }])).toBe(53);
    expect(orderSubtotal([{ unitPrice: 4.995, qty: 3 }])).toBe(14.99);
    expect(orderTotalLabel(53, "AUD")).toBe("$53.00");
  });

  it("walks the kitchen lifecycle forward only", () => {
    expect(canTransitionOrder("placed", "preparing")).toBe(true);
    expect(canTransitionOrder("preparing", "ready")).toBe(true);
    expect(canTransitionOrder("ready", "served")).toBe(true);
    expect(canTransitionOrder("served", "completed")).toBe(true);
    expect(canTransitionOrder("placed", "served")).toBe(false);
    expect(canTransitionOrder("completed", "preparing")).toBe(false);
    expect(canTransitionOrder("placed", "cancelled")).toBe(true);
    expect(canTransitionOrder("pending_payment", "placed")).toBe(true);
  });

  it("requires named venues within the cap", () => {
    expect(validateVenues([{ kind: "bar", name: "Rooftop Bar" }])).toEqual([]);
    expect(validateVenues([{ kind: "bar", name: "  " }])).toContain("Every venue needs a name.");
    expect(validateVenues(Array.from({ length: 21 }, (_, i) => ({ name: `V${i}` })))).toContain(
      "At most 20 venues per stay.",
    );
  });
});
