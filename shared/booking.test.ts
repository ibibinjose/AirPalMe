import { describe, expect, it } from "vitest";
import {
  balanceDueCents,
  bookingDisplayPaid,
  bookingFeesMatch,
  bookingValid,
  canRefundPaid,
  experienceReviewValid,
  canCustomerCancel,
  canProviderComplete,
  canProviderConfirm,
  canReleasePayout,
  canRetryPayout,
  checkoutPaymentCollected,
  DEFAULT_FEE_CONFIG,
  hasCanceledParam,
  isBookingStatus,
  paymentStatusForPrice,
  payoutStatusAfterGuestPaid,
  payoutStatusForPrice,
  isBusinessProviderBooking,
  isOpenProviderBooking,
  isTicketId,
  providerShareCents,
  quoteFees,
  repriceSourcedBooking,
  ticketAdmitCheck,
  ticketAdmitReasonLabel,
  ticketIdFromSearch,
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
    expect(
      bookingValid({
        ...good,
        requestId: "",
        planId: "",
        providerKind: "business",
        providerName: "Spark Foundation",
        eventId: "spark26-001",
      }),
    ).toBe(true);
    expect(bookingValid({ ...good, requestId: "", planId: "" })).toBe(false);
  });

  it("re-prices sourced bookings from the source row", () => {
    // Forged client price is discarded; the source always wins.
    expect(repriceSourcedBooking({ exists: true, priceCents: 5000 })).toEqual({ priceCents: 5000 });
    expect(repriceSourcedBooking({ exists: true, priceCents: 0 })).toEqual({ priceCents: 0 });
    expect(repriceSourcedBooking({ exists: true, priceCents: -50 })).toEqual({ priceCents: 0 });
    expect(repriceSourcedBooking({ exists: true, priceCents: "junk" })).toEqual({ priceCents: 0 });
    expect(repriceSourcedBooking({ exists: false, priceCents: 5000 })).toEqual({ error: "no-longer-on-sale" });
    expect(repriceSourcedBooking(null)).toEqual({ error: "no-longer-on-sale" });
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
    expect(payoutStatusForPrice(0)).toBe("transferred");
    expect(payoutStatusForPrice(8000)).toBe("unpaid");
    expect(payoutStatusAfterGuestPaid(8000)).toBe("held");
    expect(checkoutPaymentCollected("paid")).toBe(true);
    expect(checkoutPaymentCollected("unpaid")).toBe(false);
    expect(
      canReleasePayout({
        paymentStatus: "paid",
        payoutStatus: "held",
        stripeChargeId: "ch_1",
        stripeAccountId: "acct_1",
        transfersActive: true,
      }),
    ).toBe(true);
    expect(
      canReleasePayout({
        paymentStatus: "paid",
        payoutStatus: "held",
        stripeChargeId: "ch_1",
        stripeAccountId: "acct_1",
        transfersActive: false,
      }),
    ).toBe(false);
    expect(
      canRetryPayout({
        status: "completed",
        paymentStatus: "paid",
        payoutStatus: "held",
        priceCents: 8000,
      }),
    ).toBe(true);
    expect(
      canRetryPayout({
        status: "confirmed",
        paymentStatus: "paid",
        payoutStatus: "held",
        priceCents: 8000,
      }),
    ).toBe(false);
  });

  it("matches stored fees against the admin config quote", () => {
    const admin = { platformFeeBps: 2000, minimumPlatformFeeCents: 100 };
    const quoted = quoteFees(8000, admin);
    expect(bookingFeesMatch({ priceCents: 8000, feeCents: quoted.feeCents }, admin)).toBe(true);
    // Stale client fee from an older config no longer matches.
    const stale = quoteFees(8000, DEFAULT_FEE_CONFIG);
    expect(stale.feeCents).not.toBe(quoted.feeCents);
    expect(bookingFeesMatch({ priceCents: 8000, feeCents: stale.feeCents }, admin)).toBe(false);
  });

  it("computes the remaining balance without going negative", () => {
    expect(balanceDueCents(8000, 2000)).toBe(6000);
    expect(balanceDueCents(8000, 8000)).toBe(0);
    expect(balanceDueCents(8000, 9000)).toBe(0);
    expect(balanceDueCents(NaN, 100)).toBe(0);
    expect(balanceDueCents(8000, NaN)).toBe(8000);
  });

  it("validates experience reviews", () => {
    expect(experienceReviewValid(5, "Sold out show, great host.")).toBe(true);
    expect(experienceReviewValid(4, "")).toBe(true);
    expect(experienceReviewValid(0, "No show.")).toBe(false);
    expect(experienceReviewValid(6, "ok")).toBe(false);
    expect(experienceReviewValid(4.5, "ok")).toBe(false);
    expect(experienceReviewValid(3, "x".repeat(501))).toBe(false);
  });

  it("guards paid refunds before any money moves", () => {
    const held = { paymentStatus: "paid" as const, payoutStatus: "held" as const, providerUid: "host-1", status: "confirmed" as const };
    expect(canRefundPaid(held, "host-1", false)).toBe(null);
    expect(canRefundPaid(held, "admin-1", true)).toBe(null);
    expect(canRefundPaid(held, "stranger", false)).toBe("Only the provider can refund this booking.");
    expect(
      canRefundPaid({ ...held, paymentStatus: "unpaid" }, "host-1", false),
    ).toBe("There is no completed payment to refund.");
    expect(
      canRefundPaid({ ...held, payoutStatus: "transferred" }, "host-1", false),
    ).toBe("Already paid out — contact support.");
    expect(canRefundPaid({ ...held, status: "refunded" }, "host-1", false)).toBe("Already refunded.");
  });

  it("pays the provider from the server-stamped fee", () => {
    expect(providerShareCents({ priceCents: 8000, feeCents: 1200 })).toBe(6800);
    // Legacy rows without a stamped fee fall back to the config quote.
    expect(providerShareCents({ priceCents: 8000, feeCents: NaN })).toBe(
      quoteFees(8000).providerCents,
    );
  });

  it("detects Stripe cancel returns in both param spellings", () => {
    expect(hasCanceledParam("?canceled=1")).toBe(true);
    expect(hasCanceledParam("?canceled=true")).toBe(true);
    expect(hasCanceledParam("?booked=b1&canceled=1")).toBe(true);
    expect(hasCanceledParam("")).toBe(false);
    expect(hasCanceledParam("?canceled=0")).toBe(false);
    expect(hasCanceledParam("?canceled=")).toBe(false);
    expect(hasCanceledParam("?booked=b1")).toBe(false);
  });

  it("treats Stripe-paid and free bookings as display-paid", () => {
    expect(bookingDisplayPaid({ paymentStatus: "paid", priceCents: 8000 })).toBe(true);
    expect(bookingDisplayPaid({ paymentStatus: "unpaid", priceCents: 0 })).toBe(true);
    expect(bookingDisplayPaid({ paymentStatus: "unpaid", priceCents: 8000 })).toBe(false);
    expect(bookingDisplayPaid({ paymentStatus: "deferred", priceCents: 8000 })).toBe(false);
  });

  it("validates ticket id segments", () => {
    expect(isTicketId("bk_abc123")).toBe(true);
    expect(isTicketId("bk-1")).toBe(true);
    expect(isTicketId("")).toBe(false);
    expect(isTicketId("a/b")).toBe(false);
    expect(isTicketId("a b")).toBe(false);
    expect(isTicketId("a".repeat(129))).toBe(false);
    expect(isTicketId(undefined)).toBe(false);
    expect(isTicketId(42)).toBe(false);
  });

  it("parses gate-scan ticket ids strictly", () => {
    expect(ticketIdFromSearch("?ticket=bk_abc123")).toBe("bk_abc123");
    expect(ticketIdFromSearch("?booked=x&ticket=bk-1")).toBe("bk-1");
    expect(ticketIdFromSearch("")).toBeNull();
    expect(ticketIdFromSearch("?booked=b1")).toBeNull();
    expect(ticketIdFromSearch("?ticket=")).toBeNull();
    expect(ticketIdFromSearch("?ticket=a/b")).toBeNull();
    expect(ticketIdFromSearch("?ticket=a b")).toBeNull();
    expect(ticketIdFromSearch(`?ticket=${"a".repeat(129)}`)).toBeNull();
  });

  it("admits paid-and-open bookings, refuses everything else with a reason", () => {
    expect(
      ticketAdmitCheck({ paymentStatus: "paid", priceCents: 8000, status: "confirmed" }),
    ).toEqual({ valid: true });
    expect(ticketAdmitCheck({ paymentStatus: "unpaid", priceCents: 0, status: "pending" })).toEqual({
      valid: true,
    });
    expect(
      ticketAdmitCheck({ paymentStatus: "unpaid", priceCents: 8000, status: "confirmed" }),
    ).toEqual({ valid: false, reason: "unpaid" });
    expect(ticketAdmitCheck({ paymentStatus: "paid", priceCents: 8000, status: "cancelled" })).toEqual(
      { valid: false, reason: "cancelled" },
    );
    expect(ticketAdmitCheck({ paymentStatus: "paid", priceCents: 8000, status: "refunded" })).toEqual({
      valid: false,
      reason: "refunded",
    });
    expect(ticketAdmitCheck({ paymentStatus: "paid", priceCents: 8000, status: "disputed" })).toEqual({
      valid: false,
      reason: "disputed",
    });
    expect(ticketAdmitCheck({ paymentStatus: "paid", priceCents: 8000, status: "completed" })).toEqual(
      { valid: false, reason: "completed" },
    );
  });

  it("words every refusal for gate staff", () => {
    for (const reason of ["unpaid", "cancelled", "refunded", "disputed", "completed"] as const) {
      expect(ticketAdmitReasonLabel(reason).length).toBeGreaterThan(10);
    }
  });

  it("scopes business inbox to the owning provider", () => {
    expect(isBusinessProviderBooking({ providerKind: "business", providerUid: "biz1" }, "biz1")).toBe(true);
    expect(isBusinessProviderBooking({ providerKind: "business", providerUid: "biz1" }, "other")).toBe(false);
    expect(isBusinessProviderBooking({ providerKind: "mate", providerUid: "biz1" }, "biz1")).toBe(false);
    expect(isOpenProviderBooking("pending")).toBe(true);
    expect(isOpenProviderBooking("completed")).toBe(false);
    expect(isOpenProviderBooking("cancelled")).toBe(false);
  });
});
