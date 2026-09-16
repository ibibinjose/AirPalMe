import { describe, expect, it } from "vitest";
import {
  BUSINESS_PLANS,
  emptyDraft,
  isEmail,
  isPhone,
  ownerStepValid,
  reviewReady,
  venueStepValid,
  verifyStepValid,
} from "./business-onboarding";

describe("business onboarding", () => {
  it("offers three plans starting with free presence", () => {
    expect(BUSINESS_PLANS.map((p) => p.id)).toEqual(["presence", "featured", "partner"]);
    expect(BUSINESS_PLANS[0]!.price).toBe("Free");
  });

  it("validates contact details", () => {
    expect(isEmail("owner@harbourhotel.com.au")).toBe(true);
    expect(isEmail("not-an-email")).toBe(false);
    expect(isPhone("+61 2 9247 1234")).toBe(true);
    expect(isPhone("12")).toBe(false);
  });

  it("requires a venue or full unlisted details", () => {
    const d = emptyDraft();
    expect(venueStepValid(d)).toBe(false);
    d.venue.venueId = "partner-harbour-hotel";
    expect(venueStepValid(d)).toBe(true);
  });

  it("requires owner details plus one verification signal and sign-off", () => {
    const d = emptyDraft();
    d.venue.venueId = "partner-harbour-hotel";
    d.owner = { name: "Sam", email: "sam@venue.com", phone: "0412 345 678", role: "Owner", abnOrTaxId: "", customPerk: "" };
    expect(ownerStepValid(d)).toBe(true);
    expect(verifyStepValid(d)).toBe(false);
    d.verify.workEmailMatches = true;
    d.verify.authorityConfirmed = true;
    expect(verifyStepValid(d)).toBe(true);
    expect(reviewReady(d)).toBe(false);
    d.acceptedTerms = true;
    expect(reviewReady(d)).toBe(true);
  });
});
