import { describe, expect, it } from "vitest";
import {
  broadcastNeedsReview,
  CIRCLE_BROADCAST_CAP,
  EVERYONE_BROADCAST_CAP,
  isMarketingKind,
  isPriorityKind,
  notificationPresentation,
  validateBroadcast,
} from "./notifications";

describe("broadcast validation", () => {
  it("requires a short title and body", () => {
    expect(validateBroadcast({ title: "", body: "" })).toContain("Title is required.");
    expect(validateBroadcast({ title: "x".repeat(81), body: "ok" })).toContain("Title must be 80 characters or fewer.");
    expect(validateBroadcast({ title: "Hi", body: "y".repeat(281) })).toContain(
      "Message must be 280 characters or fewer.",
    );
    expect(
      validateBroadcast({ title: "Hi", body: "Hello", audience: "promotion_entrants", promotionId: "" }),
    ).toContain("Choose the campaign whose entrants should receive this.");
    expect(
      validateBroadcast({ title: "Hi", body: "Hello", audience: "promotion_entrants", promotionId: "p1" }),
    ).toEqual([]);
    expect(validateBroadcast({ title: "Tonight", body: "Doors at 7.", audience: "circle" })).toEqual([]);
  });

  it("labels catch-up and meeting notices for the activity list", () => {
    expect(notificationPresentation("announcement")).toEqual({ label: "Update", segment: "updates" });
    expect(notificationPresentation("catchup_proposed")).toEqual({ label: "Catch-up", segment: "activity" });
    expect(notificationPresentation("catchup_scheduled")).toEqual({ label: "Meeting", segment: "activity" });
    expect(notificationPresentation("giveaway_launched").label).toBe("Giveaway");
    expect(broadcastNeedsReview("circle")).toBe(false);
    expect(broadcastNeedsReview("everyone")).toBe(true);
  });
});

describe("notification routing", () => {
  it("classifies marketing and priority kinds", () => {
    expect(isMarketingKind("promotion_ending_soon")).toBe(true);
    expect(isMarketingKind("birthday_month")).toBe(true);
    expect(isMarketingKind("entry_confirmed")).toBe(false);
    expect(isPriorityKind("winner_selected")).toBe(true);
    expect(isPriorityKind("announcement")).toBe(false);
  });

  it("keeps broadcast audiences bounded", () => {
    expect(CIRCLE_BROADCAST_CAP).toBe(250);
    expect(EVERYONE_BROADCAST_CAP).toBe(1000);
  });
});
