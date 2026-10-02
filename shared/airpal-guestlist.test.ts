import { describe, expect, it } from "vitest";
import {
  guestlistSignupId,
  isGuestlistInterest,
  normalizeSignupEmail,
  validateGuestlistSignup,
} from "./airpal-guestlist";

const GOOD = { name: "Ava", city: "Sydney", email: "ava@example.com", interests: ["events", "nightlife"] as never[] };

describe("airpal guestlist signup", () => {
  it("accepts a well-formed signup", () => {
    expect(validateGuestlistSignup(GOOD)).toEqual([]);
    expect(validateGuestlistSignup({ ...GOOD, interests: [] })).toEqual([]);
    expect(validateGuestlistSignup({ ...GOOD, source: "harbourbar" })).toEqual([]);
  });

  it("rejects bad names, cities, emails, and interests", () => {
    expect(validateGuestlistSignup({ ...GOOD, name: "  " })).toContain("Add your name.");
    expect(validateGuestlistSignup({ ...GOOD, city: "" })).toContain("Choose your city.");
    expect(validateGuestlistSignup({ ...GOOD, email: "not-an-email" })).toContain("Add a valid email address.");
    expect(validateGuestlistSignup({ ...GOOD, email: "a@b.c" })).toContain("Add a valid email address.");
    expect(validateGuestlistSignup({ ...GOOD, interests: ["raves"] as never[] })).toContain(
      "Unknown interest selected.",
    );
    expect(validateGuestlistSignup({ ...GOOD, interests: "events" as never })).toContain(
      "Invalid interests selection.",
    );
  });

  it("normalizes email ids for deterministic dedupe", () => {
    expect(normalizeSignupEmail("  Ava@Example.COM ")).toBe("ava@example.com");
    expect(guestlistSignupId("AVA@EXAMPLE.COM")).toBe("ava@example.com");
    expect(isGuestlistInterest("nightlife")).toBe(true);
    expect(isGuestlistInterest("sports")).toBe(false);
  });
});
