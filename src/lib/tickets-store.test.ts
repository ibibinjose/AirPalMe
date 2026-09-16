import { describe, expect, it } from "vitest";
import { categoryFromGuestText, ticketFromDoc } from "./tickets-store";

describe("categoryFromGuestText", () => {
  it("maps guest phrasing to desk categories", () => {
    expect(categoryFromGuestText("Towels")).toBe("housekeeping");
    expect(categoryFromGuestText("Late out")).toBe("late_checkout");
    expect(categoryFromGuestText("AC is broken")).toBe("maintenance");
    expect(categoryFromGuestText("Need extra key")).toBe("reception");
  });
});

describe("ticketFromDoc", () => {
  it("normalizes a Firestore ticket and ignores empty details", () => {
    const row = ticketFromDoc("tick_1", {
      propertyId: "prop_a",
      details: "Extra pillows",
      roomNumber: "12",
      guestName: "Room 12",
      category: "housekeeping",
      status: "pending",
      urgency: "normal",
      createdAt: "2026-09-15T10:00:00.000Z",
    });
    expect(row?.id).toBe("tick_1");
    expect(row?.category).toBe("housekeeping");
    expect(row?.priority).toBe("low");
    expect(ticketFromDoc("x", { details: "  " })).toBeNull();
  });
});
