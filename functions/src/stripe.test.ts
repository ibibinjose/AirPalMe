import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("firebase-functions/params", () => ({
  defineSecret: () => ({ value: () => "" }),
}));

vi.mock("stripe", () => ({
  default: class StripeMock {
    static webhooks = { constructEvent: vi.fn() };
  },
}));

vi.mock("firebase-admin/app", () => ({
  getApps: vi.fn().mockReturnValue([{}]),
  initializeApp: vi.fn(),
}));
vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn().mockReturnValue({}),
}));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: vi.fn().mockReturnValue({}),
}));
vi.mock("firebase-functions/v2", () => ({
  setGlobalOptions: vi.fn(),
}));
vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: class HttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
  onRequest: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

import {
  assertChargeableAmount,
  needsTransferReversal,
  payoutIdempotencyKey,
  refundIdempotencyKey,
  sandboxBookingsAllowed,
  stayCheckoutReturnUrls,
  stripeLiveConfigured,
} from "./stripe";

describe("sandboxBookingsAllowed", () => {
  afterEach(() => {
    delete process.env.ALLOW_SANDBOX_BOOKINGS;
    delete process.env.FUNCTIONS_EMULATOR;
  });

  it("is disabled by default so unpaid bookings never confirm in production", () => {
    expect(sandboxBookingsAllowed()).toBe(false);
  });

  it("enables only with explicit opt-in or the emulator", () => {
    process.env.ALLOW_SANDBOX_BOOKINGS = "true";
    expect(sandboxBookingsAllowed()).toBe(true);
    delete process.env.ALLOW_SANDBOX_BOOKINGS;
    process.env.FUNCTIONS_EMULATOR = "true";
    expect(sandboxBookingsAllowed()).toBe(true);
  });
});

describe("stayCheckoutReturnUrls", () => {
  it("lands on /concierge so booked/canceled survive (no /stay redirect)", () => {
    expect(stayCheckoutReturnUrls("https://airpal.me", "b1")).toEqual({
      success: "https://airpal.me/concierge?booked=b1",
      cancel: "https://airpal.me/concierge?canceled=true",
    });
  });
});

describe("stripeLiveConfigured", () => {
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_API_KEY;
  });

  it("is off when the key is missing or mock", () => {
    expect(stripeLiveConfigured()).toBe(false);
    process.env.STRIPE_SECRET_KEY = "mock_test";
    expect(stripeLiveConfigured()).toBe(false);
  });

  it("is on for a real-looking secret", () => {
    process.env.STRIPE_SECRET_KEY = "rk_test_not_a_real_key";
    expect(stripeLiveConfigured()).toBe(true);
  });
});

describe("assertChargeableAmount", () => {
  it("accepts finite positive totals", () => {
    expect(() => assertChargeableAmount(49.99)).not.toThrow();
  });

  it("rejects zero, negative, and non-finite totals", () => {
    for (const bad of [0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => assertChargeableAmount(bad)).toThrowError(expect.objectContaining({ code: "failed-precondition" }));
    }
  });
});

describe("money idempotency keys", () => {
  it("pins one stable key per booking so retries replay instead of duplicating", () => {
    expect(payoutIdempotencyKey("bk-1")).toBe(payoutIdempotencyKey("bk-1"));
    expect(refundIdempotencyKey("bk-1")).toBe(refundIdempotencyKey("bk-1"));
    expect(payoutIdempotencyKey("bk-1")).not.toBe(payoutIdempotencyKey("bk-2"));
    expect(payoutIdempotencyKey("bk-1")).not.toBe(refundIdempotencyKey("bk-1"));
  });
});

describe("needsTransferReversal", () => {
  it("reverses once, then stands down on webhook retries", () => {
    expect(needsTransferReversal({ status: "confirmed", payoutStatus: "transferred", stripeTransferId: "tr-1" })).toBe(
      true,
    );
    expect(needsTransferReversal({ status: "disputed", payoutStatus: "reversed", stripeTransferId: "tr-1" })).toBe(
      false,
    );
    expect(needsTransferReversal({ status: "confirmed", payoutStatus: "held" })).toBe(false);
  });
});
