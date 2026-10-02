/** Fields a wallet business card reads off a Firestore profile. Bios store `name` and `shortWhy`. */

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function cardFieldsFromProfile(
  profile: Record<string, unknown>,
  handle: string,
): { name: string; bio: string; city: string; kind: string } {
  return {
    name: text(profile.name) || text(profile.displayName) || text(profile.firstName) || `@${handle}`,
    bio: text(profile.shortWhy) || text(profile.bio),
    city: text(profile.city),
    kind: text(profile.kind),
  };
}
