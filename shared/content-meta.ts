/** Ownership, moderation, freshness, and expiry for listings, offers, events, and profiles. */

export const REVIEW_STATUSES = ["draft", "pending", "approved", "rejected", "expired"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const CONTENT_SOURCES = ["seed", "host", "partner", "organiser", "guest"] as const;
export type ContentSource = (typeof CONTENT_SOURCES)[number];

export type ContentMeta = {
  ownerUid?: string;
  ownerEmail?: string;
  source: ContentSource;
  verifiedOwner: boolean;
  reviewStatus: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
};

export type ContentAudit = {
  id?: string;
  collection: string;
  docId: string;
  action: "create" | "update" | "delete" | "approve" | "reject" | "expire";
  actorUid: string;
  at: string;
  note?: string;
};

export function isReviewStatus(value: string): value is ReviewStatus {
  return (REVIEW_STATUSES as readonly string[]).includes(value);
}

export function isContentSource(value: string): value is ContentSource {
  return (CONTENT_SOURCES as readonly string[]).includes(value);
}

export function stampContentMeta(
  previous: Partial<ContentMeta> | undefined,
  patch: Partial<ContentMeta> & { source?: ContentSource },
  now = new Date().toISOString(),
): ContentMeta {
  const source = patch.source || previous?.source || "host";
  const ownerUid = patch.ownerUid ?? previous?.ownerUid;
  return {
    ownerUid,
    ownerEmail: patch.ownerEmail ?? previous?.ownerEmail,
    source,
    verifiedOwner: patch.verifiedOwner ?? previous?.verifiedOwner ?? Boolean(ownerUid),
    reviewStatus: patch.reviewStatus || previous?.reviewStatus || (source === "seed" ? "approved" : "approved"),
    createdAt: previous?.createdAt || patch.createdAt || now,
    updatedAt: patch.updatedAt || now,
    expiresAt: patch.expiresAt ?? previous?.expiresAt,
  };
}

export function isContentLive(
  input: {
    status?: string;
    reviewStatus?: string;
    expiresAt?: string;
    source?: string;
  },
  now = Date.now(),
): boolean {
  const status = input.status;
  if (status && status !== "active" && status !== "live") return false;
  const review = input.reviewStatus;
  if (review === "rejected" || review === "expired" || review === "draft") return false;
  if (review === "pending" && input.source !== "seed") return false;
  if (input.expiresAt) {
    const at = Date.parse(input.expiresAt);
    if (Number.isFinite(at) && at <= now) return false;
  }
  return true;
}

export function contentNeedsReview(meta: Partial<ContentMeta>): boolean {
  return !meta.verifiedOwner || meta.reviewStatus === "pending" || meta.reviewStatus === "draft";
}
