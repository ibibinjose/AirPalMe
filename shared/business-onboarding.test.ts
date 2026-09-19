import { describe, expect, it } from "vitest";
import {
  BUSINESS_PLANS,
  ONBOARD_STEPS,
  applyGooglePlace,
  canPublishFeatured,
  clampBusinessPlan,
  emptyDraft,
  googleOwnerVerified,
  isEmail,
  isPhone,
  nameStepValid,
  ownerStepValid,
  resolvedPlan,
  reviewReady,
  venueStepValid,
  verifyStepValid,
} from "./business-onboarding";
import type { GooglePlaceImport } from "./google-place";

describe("business onboarding", () => {
  it("offers three plans starting with free presence", () => {
    expect(BUSINESS_PLANS.map((p) => p.id)).toEqual(["presence", "featured", "partner"]);
    expect(BUSINESS_PLANS[0]!.price).toBe("Free");
  });

  it("orders Register, You, Verify, Go live", () => {
    expect(ONBOARD_STEPS.map((s) => s.id)).toEqual(["venue", "owner", "verify", "review"]);
    expect(ONBOARD_STEPS.map((s) => s.label)).toEqual(["Register", "You", "Verify", "Go live"]);
  });

  it("validates contact details", () => {
    expect(isEmail("owner@harbourhotel.com.au")).toBe(true);
    expect(isEmail("not-an-email")).toBe(false);
    expect(isPhone("+61 2 9247 1234")).toBe(true);
    expect(isPhone("12")).toBe(false);
  });

  it("lets them register with a name and category before address", () => {
    const d = emptyDraft();
    expect(nameStepValid(d)).toBe(false);
    expect(venueStepValid(d)).toBe(false);
    d.venue.venueName = "The Glenmore";
    d.category = "bar";
    expect(nameStepValid(d)).toBe(true);
    expect(venueStepValid(d)).toBe(false);
    d.address = "96 Cumberland St, The Rocks";
    expect(venueStepValid(d)).toBe(true);
  });

  it("requires owner details plus one verification signal and sign-off", () => {
    const d = emptyDraft();
    d.venue = { mode: "listed", venueId: "partner-harbour-hotel", venueName: "Harbour Hotel" };
    d.owner = {
      name: "Sam",
      email: "sam@venue.com",
      phone: "0412 345 678",
      role: "Owner",
      abnOrTaxId: "",
      customPerk: "",
    };
    expect(ownerStepValid(d)).toBe(true);
    expect(verifyStepValid(d)).toBe(false);
    d.verify.authorityConfirmed = true;
    expect(verifyStepValid(d)).toBe(true);
    expect(reviewReady(d)).toBe(false);
    d.acceptedTerms = true;
    expect(reviewReady(d)).toBe(true);
  });

  it("accepts a Google listing as the place plus a confirm signal", () => {
    const place: GooglePlaceImport = {
      placeId: "ChIJ-glenmore",
      name: "The Glenmore Hotel",
      address: "96 Cumberland St, The Rocks NSW 2000",
      city: "Sydney",
      phone: "+61 2 9247 1234",
      website: "https://glenmorehotel.com.au",
      googleMapsUri: "https://maps.google.com/?cid=1",
      hours: "Monday: 11:00 AM - 12:00 AM",
      shortWhy: "Rooftop over the harbour.",
      category: "bar",
      photoNames: ["https://lh3.googleusercontent.com/photo"],
      menuUrl: "",
      socials: [],
    };
    const d = applyGooglePlace(emptyDraft(), place);
    expect(nameStepValid(d)).toBe(true);
    expect(d.venue.venueName).toBe("The Glenmore Hotel");
    expect(d.category).toBe("bar");
    expect(venueStepValid(d)).toBe(true);
    expect(d.googlePlaceId).toBe("ChIJ-glenmore");
    expect(d.owner.phone).toBe("+61 2 9247 1234");
    d.owner = { ...d.owner, name: "Sam", email: "sam@glenmorehotel.com.au", phone: d.owner.phone, role: "Owner" };
    d.verify.googleListingConfirmed = true;
    d.verify.authorityConfirmed = true;
    expect(verifyStepValid(d)).toBe(true);
    expect(googleOwnerVerified(d)).toBe(true);
    expect(canPublishFeatured(d)).toBe(true);
  });

  it("does not treat a Google import checkbox as Featured proof", () => {
    const d = emptyDraft();
    d.googlePlaceId = "ChIJ-glenmore";
    d.website = "https://glenmorehotel.com.au";
    d.owner.email = "sam@gmail.com";
    d.verify.googleListingConfirmed = true;
    d.verify.authorityConfirmed = true;
    expect(googleOwnerVerified(d)).toBe(false);
    expect(canPublishFeatured(d)).toBe(false);
    expect(resolvedPlan({ ...d, plan: "featured" })).toBe("presence");
  });

  it("uses the signed-in email for Google ownership, not a typed contact address", () => {
    const d = emptyDraft();
    d.googlePlaceId = "ChIJ-glenmore";
    d.website = "https://glenmorehotel.com.au";
    d.owner.email = "sam@glenmorehotel.com.au";
    expect(googleOwnerVerified(d, "sam@gmail.com")).toBe(false);
    expect(googleOwnerVerified(d, "sam@glenmorehotel.com.au")).toBe(true);
  });

  it("lets Featured through with an ABN even on a personal email", () => {
    const d = emptyDraft();
    d.googlePlaceId = "ChIJ-glenmore";
    d.website = "https://glenmorehotel.com.au";
    d.owner.email = "sam@gmail.com";
    d.owner.abnOrTaxId = "51 824 753 556";
    d.plan = "featured";
    expect(googleOwnerVerified(d)).toBe(false);
    expect(canPublishFeatured(d)).toBe(true);
    expect(resolvedPlan(d)).toBe("featured");
  });

  it("clamps paid plans without domain or ABN proof", () => {
    expect(clampBusinessPlan("featured", { domain: false, abn: false })).toBe("presence");
    expect(clampBusinessPlan("partner", { domain: true, abn: false })).toBe("partner");
    expect(clampBusinessPlan("featured", { domain: false, abn: true })).toBe("featured");
    expect(clampBusinessPlan("presence", { domain: true, abn: true })).toBe("presence");
  });
});
