import { beforeEach, describe, expect, it } from "vitest";
import {
  adminUpdateApplication,
  clearCompanionStore,
  getApplicationByUser,
  getOrCreateDraft,
  listApplicationsForAdmin,
  listCompanionNotifications,
  saveDraft,
  submitApplication,
} from "./companion-store";
import type { CompanionApplicationInput } from "@shared/companion";

const DRAFT: CompanionApplicationInput = {
  roles: ["friend", "companion"],
  fullName: "Alex Mate",
  email: "alex@mates.io",
  phone: "+61400123123",
  city: "Sydney",
  suburb: "Surry Hills",
  ageRange: "25–34",
  introduction: "Love coffee, coastal walks and good conversation with new people.",
  languages: ["English"],
  interests: ["Coffee"],
  hobbies: ["Walking"],
  enjoysWithOthers: "Exploring neighbourhoods together.",
  activities: ["Coffee & conversation"],
  availability: ["Weekends"],
  serviceArea: "Inner Sydney",
  pricingPreference: "free",
  motivation: "Help newcomers feel welcome in Sydney.",
  policeClearanceNumber: "NSW-123456",
  policeClearanceDoc: "https://cdn.example/clearance.jpg",
  applicantAgreementAccepted: true,
  communityGuidelinesAccepted: true,
  adultConfirmed: true,
};

describe("companion store", () => {
  beforeEach(() => {
    clearCompanionStore();
  });

  it("creates and resumes a draft per user", () => {
    const a = getOrCreateDraft("u1");
    expect(a.status).toBe("draft");
    expect(getOrCreateDraft("u1").applicationId).toBe(a.applicationId);
    expect(getApplicationByUser("u1")?.userId).toBe("u1");
  });

  it("rejects invalid submits and accepts complete ones", () => {
    const draft = getOrCreateDraft("u1");
    const bad = submitApplication(draft.applicationId);
    expect(bad.application).toBeUndefined();
    expect(bad.errors?.length).toBeGreaterThan(0);

    saveDraft(draft.applicationId, { ...DRAFT });
    const good = submitApplication(draft.applicationId);
    expect(good.errors).toBeUndefined();
    expect(good.application?.status).toBe("submitted");
    expect(good.application?.submittedAt).toBeTruthy();
  });

  it("enforces the admin status pipeline and notifies", () => {
    const draft = getOrCreateDraft("u1");
    saveDraft(draft.applicationId, { ...DRAFT });
    submitApplication(draft.applicationId);

    const illegal = adminUpdateApplication(draft.applicationId, { status: "approved" });
    expect(illegal.application).toBeUndefined();
    expect(illegal.error).toContain("Cannot move");

    expect(adminUpdateApplication(draft.applicationId, { status: "under_review" }).application?.status).toBe(
      "under_review",
    );
    const approved = adminUpdateApplication(draft.applicationId, {
      status: "approved",
      adminNotes: "private",
      reviewedBy: "admin",
    });
    expect(approved.application?.status).toBe("approved");

    const notes = listCompanionNotifications("u1").map((n) => n.status);
    expect(notes).toContain("submitted");
    expect(notes).toContain("approved");

    const suspended = adminUpdateApplication(draft.applicationId, { status: "suspended" });
    expect(suspended.application?.status).toBe("suspended");
  });

  it("filters the admin list by status, role, and location", () => {
    const draft = getOrCreateDraft("u1");
    saveDraft(draft.applicationId, { ...DRAFT });
    submitApplication(draft.applicationId);
    expect(listApplicationsForAdmin({ status: "submitted" })).toHaveLength(1);
    expect(listApplicationsForAdmin({ status: "approved" })).toHaveLength(0);
    expect(listApplicationsForAdmin({ role: "teammate" })).toHaveLength(0);
    expect(listApplicationsForAdmin({ role: "friend" })).toHaveLength(1);
    expect(listApplicationsForAdmin({ location: "surry" })).toHaveLength(1);
    expect(listApplicationsForAdmin({ location: "melbourne" })).toHaveLength(0);
  });
});
