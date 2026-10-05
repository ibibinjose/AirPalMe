import { describe, expect, it } from "vitest";
import type { HangoutPlan } from "@shared/plan";
import type { BioProfile } from "@shared/bio";
import { canViewProfile, completedExperiencesCount, isProfileOwner } from "./profile-stats";

function makePlan(overrides: Partial<HangoutPlan> = {}): HangoutPlan {
  return {
    id: "plan-1",
    title: "Coffee",
    type: "catchup",
    theme: "emerald",
    creator: { name: "Alex" },
    date: "2026-09-12",
    time: "10:00",
    datetime: "2026-09-12T10:00:00",
    city: "Sydney",
    destination: "Single O",
    stops: [],
    attendees: [],
    comments: [],
    subscribers: [],
    inviteCode: "ABC123",
    status: "open",
    createdAt: "2026-09-12T00:00:00Z",
    updatedAt: "2026-09-12T00:00:00Z",
    ...overrides,
  };
}

function makeBio(overrides: Partial<BioProfile> = {}): BioProfile {
  return {
    id: "bio-1",
    handle: "alex",
    name: "Alex",
    shortWhy: "Coffee lover",
    city: "Sydney",
    category: "eat",
    hours: "9am-5pm",
    openNow: true,
    products: [],
    services: [],
    deals: [],
    links: [],
    ...overrides,
  } as BioProfile;
}

describe("completedExperiencesCount", () => {
  it("counts completed plans created by uid or handle only", () => {
    const plans = [
      makePlan({ id: "a", status: "completed", creator: { name: "Alex", uid: "u1" } }),
      makePlan({ id: "b", status: "completed", creator: { name: "Alex", handle: "alex" } }),
      makePlan({ id: "c", status: "completed", creator: { name: "Sam", uid: "u2" } }),
      makePlan({ id: "d", status: "open", creator: { name: "Alex", uid: "u1" } }),
    ];
    expect(completedExperiencesCount(plans, { uid: "u1", handle: "alex" })).toBe(2);
    expect(completedExperiencesCount(plans, { uid: "nobody" })).toBe(0);
  });
});

describe("isProfileOwner", () => {
  const bio = makeBio({ ownerUid: "u1", ownerEmail: "alex@example.com" });

  it("matches by uid, email, or handle", () => {
    expect(isProfileOwner({ uid: "u1" }, bio)).toBe(true);
    expect(isProfileOwner({ email: "alex@example.com" }, bio)).toBe(true);
    expect(isProfileOwner({ handle: "@alex" }, bio)).toBe(true);
    expect(isProfileOwner({ uid: "u2" }, bio)).toBe(false);
    expect(isProfileOwner(null, bio)).toBe(false);
  });
});

describe("canViewProfile", () => {
  const social = { isFollowing: () => false, isFollower: () => false };
  const connected = { isFollowing: () => true, isFollower: () => false };
  const followedBy = { isFollowing: () => false, isFollower: () => true };

  it("lets the owner always see, even when private", () => {
    const bio = makeBio({ kind: "person", visibility: "private", ownerUid: "u1" });
    expect(canViewProfile({ uid: "u1" }, bio, social)).toBe(true);
  });

  it("keeps business storefronts public", () => {
    const bio = makeBio({ kind: "business", visibility: "private" });
    expect(canViewProfile(null, bio, social)).toBe(true);
  });

  it("opens public person profiles to signed-out guests", () => {
    const bio = makeBio({ kind: "person", visibility: "public" });
    expect(canViewProfile(null, bio, social)).toBe(true);
  });

  it("hides private person profiles from everyone but the owner", () => {
    const bio = makeBio({ kind: "person", visibility: "private" });
    expect(canViewProfile({ uid: "u2" }, bio, connected)).toBe(false);
    expect(canViewProfile(null, bio, social)).toBe(false);
  });

  it("defaults person profiles to friends-only for connected viewers", () => {
    const bio = makeBio({ kind: "person" });
    expect(canViewProfile(null, bio, social)).toBe(false);
    expect(canViewProfile({ uid: "u2" }, bio, social)).toBe(false);
    expect(canViewProfile({ uid: "u2" }, bio, connected)).toBe(true);
    expect(canViewProfile({ uid: "u2" }, bio, followedBy)).toBe(true);
  });
});
