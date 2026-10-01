import { describe, expect, it } from "vitest";
import {
  adminCanTransition,
  canPublish,
  currentWeekId,
  foundingPoolState,
  isUpdateNoteKind,
  legalGateSatisfied,
  offerTargetValid,
  ownerCanTransition,
  targetHref,
  validatePromotionDraft,
  winnerCanTransition,
} from "./promotions";

describe("promotion transitions", () => {
  it("lets owners submit drafts but never publish directly", () => {
    expect(ownerCanTransition("draft", "submitted")).toBe(true);
    expect(ownerCanTransition("draft", "live")).toBe(false);
    expect(ownerCanTransition("submitted", "live")).toBe(false);
    expect(ownerCanTransition("live", "paused")).toBe(true);
    expect(ownerCanTransition("paused", "closed")).toBe(false);
  });

  it("lets admins move campaigns except out of archived", () => {
    expect(adminCanTransition("submitted", "approved")).toBe(true);
    expect(adminCanTransition("approved", "live")).toBe(true);
    expect(adminCanTransition("live", "live")).toBe(false);
    expect(adminCanTransition("archived", "live")).toBe(false);
    expect(adminCanTransition("archived", "draft")).toBe(true);
  });
});

describe("update-note kinds", () => {
  it("routes announcements to Updates, promos to Activity", () => {
    expect(isUpdateNoteKind("announcement")).toBe(true);
    expect(isUpdateNoteKind("giveaway_launched")).toBe(false);
    expect(isUpdateNoteKind("winner_selected")).toBe(false);
    expect(isUpdateNoteKind("here")).toBe(false);
    expect(isUpdateNoteKind("")).toBe(false);
  });
});

describe("publishing gate", () => {
  it("blocks publishing while legal review is pending or rejected", () => {
    expect(legalGateSatisfied({ mechanicType: "giveaway", legalReviewStatus: "pending" })).toBe(false);
    expect(legalGateSatisfied({ mechanicType: "giveaway", legalReviewStatus: "rejected" })).toBe(false);
    expect(legalGateSatisfied({ mechanicType: "giveaway", legalReviewStatus: "approved" })).toBe(true);
    expect(legalGateSatisfied({ mechanicType: "discount", legalReviewStatus: "not_required" })).toBe(true);
  });

  it("requires approved/scheduled status plus a satisfied legal gate", () => {
    expect(canPublish({ mechanicType: "giveaway", legalReviewStatus: "approved", status: "approved" })).toBe(true);
    expect(canPublish({ mechanicType: "giveaway", legalReviewStatus: "pending", status: "approved" })).toBe(false);
    expect(canPublish({ mechanicType: "giveaway", legalReviewStatus: "approved", status: "draft" })).toBe(false);
  });
});

describe("winner lifecycle", () => {
  it("walks selected to completed and allows disqualification", () => {
    expect(winnerCanTransition("selected", "pending_verification")).toBe(true);
    expect(winnerCanTransition("pending_verification", "verified")).toBe(true);
    expect(winnerCanTransition("verified", "contacted")).toBe(true);
    expect(winnerCanTransition("contacted", "accepted")).toBe(true);
    expect(winnerCanTransition("accepted", "prize_sent")).toBe(true);
    expect(winnerCanTransition("prize_sent", "completed")).toBe(true);
    expect(winnerCanTransition("contacted", "disqualified")).toBe(true);
    expect(winnerCanTransition("selected", "completed")).toBe(false);
    expect(winnerCanTransition("completed", "selected")).toBe(false);
  });
});

describe("marketplace targets and weekly", () => {
  it("maps target types to app routes", () => {
    expect(targetHref("stay", "abc")).toBe("/g/abc");
    expect(targetHref("event", "abc")).toBe("/e/abc");
    expect(targetHref("place", "abc")).toBe("/p/abc");
    expect(targetHref("mate", "abc")).toBe("/mate");
    expect(targetHref("mate", "")).toBe("/mate");
    expect(targetHref("experience", "")).toBe("/experiences");
    expect(targetHref("fashion", "")).toBe("/fashion");
    expect(targetHref("", "")).toBe("");
  });

  it("rejects unknown kinds and venue targets without a venue", () => {
    expect(offerTargetValid("banner-ad", "abc")).toBe(false);
    expect(offerTargetValid("place", "")).toBe(false);
    expect(offerTargetValid("stay", "  ")).toBe(false);
    expect(offerTargetValid("mate", "")).toBe(true);
    expect(targetHref("banner-ad", "abc")).toBe("");
    expect(targetHref("place", "")).toBe("");
  });

  it("builds a stable week id", () => {
    expect(currentWeekId(new Date(Date.UTC(2026, 8, 16)))).toBe("2026-W38");
  });
});

describe("draft validation", () => {
  it("requires title, terms, and a sane date window", () => {
    const errors = validatePromotionDraft({
      title: "",
      description: "x",
      sponsorName: "s",
      termsText: "",
      startAt: "2026-10-01",
      endAt: "2026-09-01",
      entryLimit: 0,
    });
    expect(errors).toContain("Title is required.");
    expect(errors).toContain("Terms and conditions are required.");
    expect(errors).toContain("End date must be after the start date.");
    expect(errors).toContain("Entry limit must be at least 1.");
  });
});

describe("foundingPoolState", () => {
  it("reports uncapped when no cap is set", () => {
    expect(foundingPoolState(500, undefined)).toMatchObject({ capped: false, full: false });
    expect(foundingPoolState(500, 0)).toMatchObject({ capped: false });
  });

  it("tracks the first-100k pool honestly", () => {
    const open = foundingPoolState(12408, 100000);
    expect(open).toMatchObject({ capped: true, cap: 100000, used: 12408, left: 87592, full: false });
    expect(open.percent).toBe(12);
  });

  it("clamps over-counts and marks a full pool", () => {
    expect(foundingPoolState(100000, 100000)).toMatchObject({ full: true, left: 0, percent: 100 });
    expect(foundingPoolState(120000, 100000)).toMatchObject({ full: true, used: 100000, left: 0 });
  });
});
