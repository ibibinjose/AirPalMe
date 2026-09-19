import { describe, expect, it } from "vitest";
import { summarizeOpenTickets } from "./ticket-alert";
import type { StaffTicket } from "@shared/airpal-data";

function ticket(
  id: string,
  propertyId: string,
  status: StaffTicket["status"],
  extra: Partial<StaffTicket> = {},
): StaffTicket {
  return {
    id,
    propertyId,
    roomNumber: "101",
    guestName: "Room 101",
    category: "reception",
    details: `Request ${id}`,
    status,
    createdAt: "2026-09-19T10:00:00.000Z",
    urgency: "normal",
    ...extra,
  };
}

describe("summarizeOpenTickets", () => {
  it("counts only unresolved tickets and clears when all resolve", () => {
    const full = summarizeOpenTickets({
      hotel_a: [ticket("t1", "hotel_a", "pending"), ticket("t2", "hotel_a", "resolved")],
    });
    expect(full.openCount).toBe(1);
    expect(full.propertyCount).toBe(1);

    const cleared = summarizeOpenTickets({ hotel_a: [ticket("t1", "hotel_a", "resolved")] });
    expect(cleared.openCount).toBe(0);
    expect(cleared.latest).toBeNull();
  });

  it("scopes counts per property and flags urgent", () => {
    const summary = summarizeOpenTickets({
      hotel_a: [ticket("t1", "hotel_a", "pending")],
      hotel_b: [ticket("t2", "hotel_b", "in_progress", { urgency: "urgent" })],
    });
    expect(summary.openCount).toBe(2);
    expect(summary.propertyCount).toBe(2);
    expect(summary.urgentCount).toBe(1);
    expect(summary.perProperty.map((p) => p.propertyId).sort()).toEqual(["hotel_a", "hotel_b"]);
  });

  it("ignores other hotels entirely", () => {
    const summary = summarizeOpenTickets({ hotel_a: [ticket("t1", "hotel_a", "pending")] });
    expect(summary.perProperty.some((p) => p.propertyId === "hotel_b")).toBe(false);
  });
});
