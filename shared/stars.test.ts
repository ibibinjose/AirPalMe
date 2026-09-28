import { describe, expect, it } from "vitest";
import {
  REFERRAL_INVITEE_STARS,
  REFERRAL_INVITER_STARS,
  STAR_TIERS,
  computeReferralReward,
  nextTier,
  tierForBalance,
} from "./stars";

describe("star tiers", () => {
  it("climbs with lifetime balance", () => {
    expect(tierForBalance(0).name).toBe("New Mate");
    expect(tierForBalance(49).name).toBe("New Mate");
    expect(tierForBalance(50).name).toBe("Rising Mate");
    expect(tierForBalance(150).name).toBe("Superconnector");
    expect(tierForBalance(9999).name).toBe("City Legend");
    expect(STAR_TIERS.length).toBeGreaterThan(0);
  });

  it("points at the next rung, null at the top", () => {
    expect(nextTier(0)?.stars).toBe(50);
    expect(nextTier(299)?.stars).toBe(300);
    expect(nextTier(300)).toBeNull();
  });
});

describe("referral vesting", () => {
  const referral = { inviterUid: "host", inviteeUid: "guest" };

  it("pays both sides on the invitee's first completion", () => {
    expect(computeReferralReward(referral, "guest")).toEqual({ inviterUid: "host", inviteeUid: "guest" });
    expect(REFERRAL_INVITER_STARS).toBeGreaterThan(0);
    expect(REFERRAL_INVITEE_STARS).toBeGreaterThan(0);
  });

  it("pays nothing without a referral, for outsiders, or twice", () => {
    expect(computeReferralReward(null, "guest")).toBeNull();
    expect(computeReferralReward(referral, "host")).toBeNull();
    expect(computeReferralReward(referral, "stranger")).toBeNull();
    expect(computeReferralReward({ ...referral, rewardedAt: "2026-09-01T00:00:00Z" }, "guest")).toBeNull();
    expect(computeReferralReward({ inviterUid: "x", inviteeUid: "x" }, "x")).toBeNull();
  });
});
