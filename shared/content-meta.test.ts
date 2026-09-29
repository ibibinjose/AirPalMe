import { describe, expect, it } from "vitest";
import {
  contentNeedsReview,
  DEMO_ID_PREFIX,
  demoDocId,
  demoFlagAllowed,
  isContentLive,
  isDemoContent,
  stampContentMeta,
} from "./content-meta";

describe("content meta", () => {
  it("stamps owner, review, and timestamps without clobbering createdAt", () => {
    const first = stampContentMeta(undefined, { ownerUid: "u1", source: "partner" }, "2026-01-01T00:00:00.000Z");
    expect(first.verifiedOwner).toBe(true);
    expect(first.reviewStatus).toBe("approved");
    expect(first.createdAt).toBe("2026-01-01T00:00:00.000Z");
    const next = stampContentMeta(first, { source: "partner" }, "2026-02-01T00:00:00.000Z");
    expect(next.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(next.updatedAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("hides rejected, draft, pending, inactive, and expired rows", () => {
    expect(isContentLive({ status: "active", reviewStatus: "approved" })).toBe(true);
    expect(isContentLive({ status: "active" })).toBe(true);
    expect(isContentLive({ status: "inactive" })).toBe(false);
    expect(isContentLive({ status: "active", reviewStatus: "pending" })).toBe(false);
    expect(isContentLive({ status: "active", reviewStatus: "rejected" })).toBe(false);
    expect(isContentLive({ status: "active", expiresAt: "2020-01-01T00:00:00.000Z" })).toBe(false);
    expect(isContentLive({ status: "active", expiresAt: "2099-01-01T00:00:00.000Z" })).toBe(true);
  });

  it("flags demo content only on an explicit true", () => {
    expect(isDemoContent({ demo: true })).toBe(true);
    expect(isDemoContent({})).toBe(false);
    expect(isDemoContent({ demo: false })).toBe(false);
    expect(isDemoContent({ demo: "true" })).toBe(false);
    expect(isDemoContent({ demo: 1 })).toBe(false);
  });

  it("builds demo- ids that seed-context detection already excludes", () => {
    expect(DEMO_ID_PREFIX).toBe("demo-");
    expect(demoDocId("list", "a1b2c3d4")).toBe("demo-list-a1b2c3d4");
    expect(demoDocId("evt", "e5f6a7b8")).toBe("demo-evt-e5f6a7b8");
  });

  it("allows the demo flag for platform admins only", () => {
    expect(demoFlagAllowed(true, true)).toBe(true);
    expect(demoFlagAllowed(false, true)).toBe(false);
    expect(demoFlagAllowed(true, false)).toBe(false);
    expect(demoFlagAllowed(true, "true")).toBe(false);
    expect(demoFlagAllowed(true, undefined)).toBe(false);
  });

  it("marks unverified or pending content as needing review", () => {
    expect(contentNeedsReview({ verifiedOwner: false, reviewStatus: "approved" })).toBe(true);
    expect(contentNeedsReview({ verifiedOwner: true, reviewStatus: "pending" })).toBe(true);
    expect(contentNeedsReview({ verifiedOwner: true, reviewStatus: "approved" })).toBe(false);
  });
});
