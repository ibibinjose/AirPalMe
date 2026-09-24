import { describe, expect, it } from "vitest";
import { isSubscriptionActive, isSubscriptionStatus } from "./subscription";

describe("partner subscriptions", () => {
  it("gates campaigns on an active subscription", () => {
    expect(isSubscriptionActive({ status: "active" }, 1_700_000_000_000)).toBe(true);
    expect(isSubscriptionActive({ status: "trialing" }, 1_700_000_000_000)).toBe(true);
    expect(isSubscriptionActive(null)).toBe(false);
    expect(isSubscriptionActive(undefined)).toBe(false);
    expect(isSubscriptionActive({ status: "past_due" })).toBe(false);
    expect(isSubscriptionActive({ status: "canceled" })).toBe(false);
    expect(isSubscriptionActive({ status: "unpaid" })).toBe(false);
  });

  it("respects the recorded period end", () => {
    const now = 1_700_000_000_000;
    expect(isSubscriptionActive({ status: "active", currentPeriodEnd: now / 1000 + 60 }, now)).toBe(true);
    expect(isSubscriptionActive({ status: "active", currentPeriodEnd: now / 1000 - 60 }, now)).toBe(false);
    expect(isSubscriptionActive({ status: "trialing", currentPeriodEnd: now / 1000 - 1 }, now)).toBe(false);
  });

  it("validates statuses", () => {
    expect(isSubscriptionStatus("active")).toBe(true);
    expect(isSubscriptionStatus("lifetime")).toBe(false);
  });
});
