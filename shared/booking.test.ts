import { describe, expect, it } from "vitest";
import {
  bookingValid,
  canCustomerCancel,
  canProviderComplete,
  canProviderConfirm,
  isBookingStatus,
  quoteFees,
} from "./booking";

describe("booking engine", () => {
  const good = {
    requestId: "r1",
    providerUid: "u9",
    providerKind: "mate" as const,
    providerName: "Ava",
    title: "Enmore show",
    suburb: "Newtown",
    date: "2026-10-03",
    time: "19:30",
    priceCents: 8000,
  };

  it("quotes the 15% platform fee", () => {
    expect(quoteFees(10000)).toEqual({ priceCents: 10000, feeCents: 1500, providerCents: 8500 });
    expect(quoteFees(-5)).toEqual({ priceCents: 0, feeCents: 0, providerCents: 0 });
  });

  it("validates booking input", () => {
    expect(bookingValid(good)).toBe(true);
    expect(bookingValid({ ...good, date: "tomorrow" })).toBe(false);
    expect(bookingValid({ ...good, priceCents: -1 })).toBe(false);
  });

  it("gates the lifecycle", () => {
    expect(canCustomerCancel("pending")).toBe(true);
    expect(canCustomerCancel("completed")).toBe(false);
    expect(canProviderConfirm("pending")).toBe(true);
    expect(canProviderConfirm("confirmed")).toBe(false);
    expect(canProviderComplete("confirmed")).toBe(true);
    expect(canProviderComplete("cancelled")).toBe(false);
    expect(isBookingStatus("disputed")).toBe(true);
    expect(isBookingStatus("shipped")).toBe(false);
  });
});
