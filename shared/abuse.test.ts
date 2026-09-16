import { describe, expect, it } from "vitest";
import {
  automatedActivityScore,
  isDuplicateSubmission,
  rateLimitAllows,
  ratingDocId,
  ratingTargetKey,
  submissionFingerprint,
} from "./abuse";

describe("rate limits", () => {
  it("caps anonymous guests tighter than signed-in operators", () => {
    const first = rateLimitAllows({ action: "claim", anonymous: true, count: 0, windowStart: 0, now: 1_000 });
    expect(first.ok).toBe(true);
    const blocked = rateLimitAllows({
      action: "claim",
      anonymous: true,
      count: 3,
      windowStart: 1_000,
      now: 2_000,
    });
    expect(blocked.ok).toBe(false);
    const host = rateLimitAllows({
      action: "claim",
      anonymous: false,
      count: 3,
      windowStart: 1_000,
      now: 2_000,
    });
    expect(host.ok).toBe(true);
  });

  it("resets after the window", () => {
    const next = rateLimitAllows({
      action: "ask",
      anonymous: true,
      count: 5,
      windowStart: 1_000,
      now: 1_000 + 61_000,
    });
    expect(next.ok).toBe(true);
    if (next.ok) expect(next.nextCount).toBe(1);
  });

  it("blocks anonymous listing writes", () => {
    const denied = rateLimitAllows({ action: "listingWrite", anonymous: true, count: 0, windowStart: 0, now: 1 });
    expect(denied.ok).toBe(false);
  });
});

describe("duplicates and ratings", () => {
  it("fingerprints and detects rapid resubmits", () => {
    expect(submissionFingerprint([" Towels ", "101"])).toBe("towels|101");
    expect(isDuplicateSubmission(Date.now() - 10_000, Date.now(), 120_000)).toBe(true);
    expect(isDuplicateSubmission(Date.now() - 200_000, Date.now(), 120_000)).toBe(false);
  });

  it("keys one rating per guest target", () => {
    expect(ratingTargetKey({ target: "stay", propertyId: "harbour-hotel" })).toBe("stay:harbour-hotel");
    expect(ratingDocId("uid1", "stay:harbour-hotel")).toBe("uid1_stay_harbour-hotel");
  });
});

describe("automated activity", () => {
  it("flags high-velocity identical payloads without App Check", () => {
    const hot = automatedActivityScore({
      eventsInWindow: 50,
      windowMs: 60_000,
      uniqueActions: 1,
      identicalPayloads: 8,
      missingAppCheck: true,
    });
    expect(hot.automated).toBe(true);
    expect(hot.flags).toContain("high_velocity");
    expect(hot.flags).toContain("missing_app_check");

    const ok = automatedActivityScore({
      eventsInWindow: 3,
      windowMs: 60_000,
      uniqueActions: 3,
      identicalPayloads: 0,
    });
    expect(ok.automated).toBe(false);
  });
});
