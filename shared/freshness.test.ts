import { describe, expect, it } from "vitest";
import { FRESHNESS_HIDE_OPEN_MS, FRESHNESS_SLA_MS, freshnessOf } from "./freshness";

describe("freshnessOf", () => {
  const now = Date.parse("2026-09-15T10:00:00.000Z");

  it("treats missing timestamps as stale and hides Open now", () => {
    const f = freshnessOf(undefined, "hours", now);
    expect(f.stale).toBe(true);
    expect(f.hideOpenNow).toBe(true);
    expect(f.confirmedLabel).toBe("Never confirmed");
  });

  it("is fresh within the hours SLA and stale after 14 days", () => {
    const fresh = freshnessOf(new Date(now - 3 * 86400000).toISOString(), "hours", now);
    expect(fresh.stale).toBe(false);
    expect(fresh.hideOpenNow).toBe(false);
    const stale = freshnessOf(new Date(now - FRESHNESS_SLA_MS.hours - 1000).toISOString(), "hours", now);
    expect(stale.stale).toBe(true);
    expect(stale.hideOpenNow).toBe(false);
  });

  it("hides Open now after 45 days", () => {
    const f = freshnessOf(new Date(now - FRESHNESS_HIDE_OPEN_MS - 1000).toISOString(), "hours", now);
    expect(f.hideOpenNow).toBe(true);
  });

  it("uses a 7-day SLA for event schedules", () => {
    const fresh = freshnessOf(new Date(now - 2 * 86400000).toISOString(), "events", now);
    expect(fresh.stale).toBe(false);
    const stale = freshnessOf(new Date(now - 8 * 86400000).toISOString(), "events", now);
    expect(stale.stale).toBe(true);
  });
});
