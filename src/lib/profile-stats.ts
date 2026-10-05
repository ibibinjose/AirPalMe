import type { HangoutPlan } from "@shared/plan";
import type { BioProfile, BioVisibility } from "@shared/bio";

/** Completed plans created by uid or @handle — reputation from real experiences only. */
export function completedExperiencesCount(plans: HangoutPlan[], owner: { uid?: string; handle?: string }): number {
  const handle = owner.handle?.trim().toLowerCase();
  return plans.filter(
    (p) =>
      p.status === "completed" &&
      ((owner.uid && p.creator?.uid === owner.uid) || (handle && p.creator?.handle?.trim().toLowerCase() === handle)),
  ).length;
}

export type ProfileViewer = {
  uid?: string;
  email?: string;
  handle?: string;
} | null;

export function isProfileOwner(
  viewer: ProfileViewer,
  bio: Pick<BioProfile, "ownerUid" | "ownerEmail" | "handle">,
): boolean {
  if (!viewer) return false;
  const viewerHandle = viewer.handle?.trim().toLowerCase().replace(/^@/, "");
  return Boolean(
    (viewer.uid && bio.ownerUid === viewer.uid) ||
    (viewer.email && bio.ownerEmail === viewer.email) ||
    (viewerHandle && viewerHandle === bio.handle.trim().toLowerCase()),
  );
}

export type ProfileSocial = {
  isFollowing: (handle: string) => boolean;
  isFollower: (handle: string) => boolean;
};

/**
 * Who can see a profile. The owner always can; business storefronts stay
 * public. Person profiles default to friends-only (connected either way);
 * private hides from everyone but the owner.
 */
export function canViewProfile(
  viewer: ProfileViewer,
  bio: Pick<BioProfile, "kind" | "visibility" | "ownerUid" | "ownerEmail" | "handle">,
  social: ProfileSocial,
): boolean {
  if (isProfileOwner(viewer, bio)) return true;
  if (bio.kind === "business") return true;
  const visibility: BioVisibility = bio.visibility ?? "friends";
  if (visibility === "public") return true;
  if (!viewer) return false;
  if (visibility === "private") return false;
  return social.isFollowing(bio.handle) || social.isFollower(bio.handle);
}
