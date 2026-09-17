import { describe, expect, it } from "vitest";
import {
  isMarketingKind,
  isPriorityKind,
  validateBroadcast,
} from "./notifications";

describe("broadcast validation", () => {
  it("requires a short title and body", () => {
    expect(validateBroadcast({ title: "", body: "" })).toContain("Title is required.");
    expect(validateBroadcast({ title: "x".repeat(81), body: "ok" })).toContain(
      "Title must be 80 characters or fewer.",
    );
    expect(validateBroadcast({ title: "Hi", body: "y".repeat(281) })).toContain(
      "Message must be 280 characters or fewer.",
    );
    expect(
      validateBroadcast({ title: "Hi", body: "Hello", audience: "promotion_entrants", promotionId: "" }),
    ).toContain("Choose the campaign whose entrants should receive this.");
    expect(
      validateBroadcast({ title: "Hi", body: "Hello", audience: "promotion_entrants", promotionId: "p1" }),
    ).toEqual([]);
  });
});

describe("notification routing", () => {
  it("classifies marketing and priority kinds", () => {
    expect(isMarketingKind("promotion_ending_soon")).toBe(true);
    expect(isMarketingKind("entry_confirmed")).toBe(false);
    expect(isPriorityKind("winner_selected")).toBe(true);
    expect(isPriorityKind("announcement")).toBe(false);
  });
});
