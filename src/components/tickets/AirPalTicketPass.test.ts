import { describe, expect, it } from "vitest";
import { ticketQrHref } from "./AirPalTicketPass";
import type { Booking } from "@shared/booking";

const base = {
  requestId: "r1",
  customerUid: "u1",
  providerUid: "u9",
  providerKind: "business",
  providerName: "Spark",
  title: "Closing",
  suburb: "Sydney",
  date: "2026-09-25",
  time: "16:00",
  priceCents: 0,
  feeCents: 0,
  paymentStatus: "unpaid",
  payoutStatus: "unpaid",
  status: "pending",
  cancelReason: "",
  spots: 1,
  createdAt: "",
  updatedAt: "",
} as unknown as Booking & { id: string };

describe("ticketQrHref", () => {
  it("points event tickets at the session page", () => {
    expect(ticketQrHref({ ...base, id: "b1", eventId: "spark26-001" })).toContain("/e/spark26-001?ticket=b1");
  });

  it("falls back to plan then experiences", () => {
    expect(ticketQrHref({ ...base, id: "b2", planId: "p1" })).toContain("/plan/p1?ticket=b2");
    expect(ticketQrHref({ ...base, id: "b3" })).toContain("/experiences?ticket=b3");
  });
});
