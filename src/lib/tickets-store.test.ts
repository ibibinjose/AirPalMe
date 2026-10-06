import { describe, expect, it } from "vitest";
import { resolveTicketPriority as resolveShared } from "@shared/airpal-data";
import { categoryFromGuestText, resolveTicketPriority, ticketFromDoc } from "./tickets-store";

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

describe("resolveTicketPriority", () => {
  const matrix = [
    [{ priority: "high" as const, urgency: "normal" as const }, "high"],
    [{ urgency: "urgent" as const }, "urgent"],
    [{ category: "maintenance" }, "high"],
    [{ category: "late_checkout" }, "medium"],
    [{ category: "dining" }, "medium"],
    [{ category: "reception" }, "medium"],
    [{ category: "housekeeping" }, "low"],
    [{}, "low"],
  ] as const;
  it("matches the documented rule table", () => {
    for (const [input, expected] of matrix) {
      expect(resolveTicketPriority({ ...input })).toBe(expected);
    }
  });
  it("stays in sync with the shared copy used by Cloud Functions", () => {
    for (const [input] of matrix) {
      expect(resolveTicketPriority({ ...input })).toBe(resolveShared({ ...input }));
    }
  });
});
