import { describe, expect, it } from "vitest";
import {
  allowedAdminTransitions,
  companionStatusCopy,
  flagsRegulatedClaims,
  publicCompanionApplication,
  validateCompanionApplication,
  type CompanionApplication,
  type CompanionApplicationInput,
} from "./companion";

function validInput(): CompanionApplicationInput {
  return {
    roles: ["friend"],
    fullName: "Alex Mate",
    photo: undefined,
    email: "alex@mates.io",
    phone: "+61400123123",
    city: "Sydney",
    suburb: "Surry Hills",
    ageRange: "25–34",
    introduction: "Love coffee, coastal walks and good conversation.",
    languages: ["English"],
    interests: ["Coffee", "Hiking"],
    hobbies: ["Photography"],
    enjoysWithOthers: "Exploring new neighbourhoods together.",
    activities: ["Coffee & conversation", "Walking"],
    availability: ["Weekends", "Flexible"],
    serviceArea: "Inner Sydney",
    pricingPreference: "free",
    preferredRate: undefined,
    motivation: "I want to help newcomers feel welcome in Sydney.",
    policeClearanceNumber: "NSW-123456",
    policeClearanceDoc: "https://cdn.example/clearance.jpg",
    applicantAgreementAccepted: true,
    communityGuidelinesAccepted: true,
    adultConfirmed: true,
  };
}

describe("validateCompanionApplication", () => {
  it("accepts a complete application", () => {
    expect(validateCompanionApplication(validInput())).toEqual([]);
  });

  it("requires name, email, city, role, intro, motivation, and both agreements", () => {
    const errors = validateCompanionApplication({});
    const fields = errors.map((e) => e.field);
    for (const f of [
      "fullName",
      "email",
      "city",
      "roles",
      "introduction",
      "motivation",
      "applicantAgreementAccepted",
      "communityGuidelinesAccepted",
    ]) {
      expect(fields).toContain(f);
    }
  });

  it("requires police clearance number and document", () => {
    const missing = validateCompanionApplication({
      ...validInput(),
      policeClearanceNumber: "",
      policeClearanceDoc: undefined,
    });
    expect(missing.map((e) => e.field)).toEqual(
      expect.arrayContaining(["policeClearanceNumber", "policeClearanceDoc"]),
    );
    expect(validateCompanionApplication(validInput())).toEqual([]);
  });

  it("requires 18+ confirmation and strips it from public profiles", () => {
    const errors = validateCompanionApplication({ ...validInput(), adultConfirmed: false });
    expect(errors.map((e) => e.field)).toContain("adultConfirmed");
    expect(validateCompanionApplication(validInput())).toEqual([]);
  });

  it("requires a rate only when pricing is paid", () => {
    expect(validateCompanionApplication({ ...validInput(), pricingPreference: "paid" }).map((e) => e.field)).toContain(
      "preferredRate",
    );
    expect(
      validateCompanionApplication({ ...validInput(), pricingPreference: "paid", preferredRate: "$40/hr" }),
    ).toEqual([]);
  });
});

describe("flagsRegulatedClaims", () => {
  it("flags therapy and certification claims for closer review", () => {
    expect(flagsRegulatedClaims({ introduction: "I am a trained therapist", motivation: "help", activities: [] })).toBe(
      true,
    );
    expect(
      flagsRegulatedClaims({ introduction: "Love walks", motivation: "Meet people", activities: ["Walking"] }),
    ).toBe(false);
  });
});

describe("publicCompanionApplication", () => {
  it("never exposes private admin notes", () => {
    const app = {
      ...validInput(),
      applicationId: "a1",
      userId: "u1",
      status: "approved",
      adminNotes: "private note",
      createdAt: "",
      updatedAt: "",
    } as CompanionApplication;
    const pub = publicCompanionApplication(app);
    expect("adminNotes" in pub).toBe(false);
    expect("adultConfirmed" in pub).toBe(false);
    expect(pub.fullName).toBe("Alex Mate");
  });
});

describe("companionStatusCopy", () => {
  it("covers every status with applicant-friendly copy", () => {
    for (const s of ["draft", "submitted", "under_review", "approved", "declined", "more_info", "suspended"] as const) {
      const copy = companionStatusCopy(s);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.body.length).toBeGreaterThan(0);
    }
  });
});

describe("allowedAdminTransitions", () => {
  it("only allows suspend from approved, never direct approve from submitted", () => {
    expect(allowedAdminTransitions("submitted")).toEqual(["under_review", "declined"]);
    expect(allowedAdminTransitions("under_review")).toContain("approved");
    expect(allowedAdminTransitions("approved")).toEqual(["suspended"]);
    expect(allowedAdminTransitions("draft")).toEqual([]);
  });
});
