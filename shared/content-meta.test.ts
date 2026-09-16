import { describe, expect, it } from "vitest";
import { contentNeedsReview, isContentLive, stampContentMeta } from "./content-meta";

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

  it("marks unverified or pending content as needing review", () => {
    expect(contentNeedsReview({ verifiedOwner: false, reviewStatus: "approved" })).toBe(true);
    expect(contentNeedsReview({ verifiedOwner: true, reviewStatus: "pending" })).toBe(true);
    expect(contentNeedsReview({ verifiedOwner: true, reviewStatus: "approved" })).toBe(false);
  });
});
