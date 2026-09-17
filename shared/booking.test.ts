import { describe, expect, it } from "vitest";
import {
  bookingValid,
  canCustomerCancel,
  canProviderComplete,
  canProviderConfirm,
  isBookingStatus,
  paymentStatusForPrice,
  isBusinessProviderBooking,
  isOpenProviderBooking,
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

  it("quotes the default 15% platform fee", () => {
    expect(quoteFees(10000)).toEqual({ priceCents: 10000, feeCents: 1500, providerCents: 8500 });
    expect(quoteFees(-5)).toEqual({ priceCents: 0, feeCents: 0, providerCents: 0 });
  });

  it("applies admin fee config instead of a hard-coded percent", () => {
    expect(quoteFees(10000, { platformFeeBps: 1000, minimumPlatformFeeCents: 0 })).toEqual({
      priceCents: 10000,
      feeCents: 1000,
      providerCents: 9000,
    });
    expect(quoteFees(1000, { platformFeeBps: 1500, minimumPlatformFeeCents: 250 })).toEqual({
      priceCents: 1000,
      feeCents: 250,
      providerCents: 750,
    });
    expect(quoteFees(0, { platformFeeBps: 1500, minimumPlatformFeeCents: 250 })).toEqual({
      priceCents: 0,
      feeCents: 0,
      providerCents: 0,
    });
  });

  it("validates booking input", () => {
    expect(bookingValid(good)).toBe(true);
    expect(bookingValid({ ...good, date: "tomorrow" })).toBe(false);
    expect(bookingValid({ ...good, priceCents: -1 })).toBe(false);
    expect(
      bookingValid({
        ...good,
        providerKind: "business",
        providerName: "Harbour Hotel",
        campaignId: "camp1",
        listingId: "list1",
      }),
    ).toBe(true);
  });

  it("accepts host plan bookings without a mate request", () => {
    expect(
      bookingValid({
        ...good,
        requestId: "",
        planId: "plan-42",
        providerKind: "host",
        providerName: "Harbour Hotel",
      }),
    ).toBe(true);
    expect(bookingValid({ ...good, requestId: "", planId: "" })).toBe(false);
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
    expect(paymentStatusForPrice(0)).toBe("paid");
    expect(paymentStatusForPrice(8000)).toBe("unpaid");
  });

  it("scopes business inbox to the owning provider", () => {
    expect(
      isBusinessProviderBooking({ providerKind: "business", providerUid: "biz1" }, "biz1"),
    ).toBe(true);
    expect(
      isBusinessProviderBooking({ providerKind: "business", providerUid: "biz1" }, "other"),
    ).toBe(false);
    expect(isBusinessProviderBooking({ providerKind: "mate", providerUid: "biz1" }, "biz1")).toBe(false);
    expect(isOpenProviderBooking("pending")).toBe(true);
    expect(isOpenProviderBooking("completed")).toBe(false);
    expect(isOpenProviderBooking("cancelled")).toBe(false);
  });
});
