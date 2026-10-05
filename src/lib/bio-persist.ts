import type { BioProfile } from "@shared/bio";
import { createBusinessProfileRemote, liveBackendEnabled, updateBusinessProfileRemote } from "./functions";
import { getFirebaseAuth } from "./firebase";

export function profileToRemotePatch(profile: BioProfile) {
  return {
    handle: profile.handle,
    name: profile.name,
    shortWhy: profile.shortWhy,
    city: profile.city,
    category: profile.category,
    hours: profile.hours,
    openNow: profile.openNow,
    phone: profile.phone,
    avatar: profile.avatar,
    cover: profile.cover,
    links: profile.links,
    products: profile.products,
    services: profile.services,
    deals: profile.deals,
    mapsPlaceId: profile.mapsPlaceId,
    listingId: profile.listingId,
    placeId: profile.placeId,
    kind: profile.kind,
    aboutText: profile.aboutText,
    pronouns: profile.pronouns,
    languages: profile.languages,
    categoryTag: profile.categoryTag,
    primaryCta: profile.primaryCta,
    availabilityStatus: profile.availabilityStatus,
    customStatus: profile.customStatus,
    customStatusEmoji: profile.customStatusEmoji,
    geo: profile.geo,
    zooHunt: profile.zooHunt,
    visibility: profile.visibility,
  };
}

function isNotFound(err: unknown): boolean {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code) : "";
  const message = err instanceof Error ? err.message : "";
  return code.includes("not-found") || /no handle/i.test(message);
}

/** Writes the full @handle profile (socials, catalog, photos) to Firestore. */
export async function persistOwnedProfile(profile: BioProfile): Promise<void> {
  if (!liveBackendEnabled() || !getFirebaseAuth()?.currentUser) return;
  if (!profile.handle) return;
  const patch = profileToRemotePatch(profile);
  try {
    await updateBusinessProfileRemote(patch);
  } catch (err) {
    if (!isNotFound(err)) throw err;
    await createBusinessProfileRemote({
      handle: profile.handle,
      name: profile.name || profile.handle,
      city: profile.city,
      category: profile.category,
      shortWhy: profile.shortWhy,
      placeId: profile.placeId,
      listingId: profile.listingId,
      kind: profile.kind === "business" ? "business" : "person",
    });
    await updateBusinessProfileRemote(patch);
  }
}
