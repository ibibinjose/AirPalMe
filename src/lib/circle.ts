export type CircleTab = "nearby" | "met" | "following" | "followers" | "likes";

export type Presence = {
  handle: string;
  city: string;
  updatedAt: string;
};

export function sameCity(a?: string, b?: string) {
  const x = (a || "").trim().toLowerCase();
  const y = (b || "").trim().toLowerCase();
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

/** Someone is in your Circle if you met them, follow them, like them, or they follow/like you. */
export function inCircle(
  handle: string | undefined,
  sets: {
    following: Set<string>;
    followers: Set<string>;
    liked: Set<string>;
    likedBy: Set<string>;
    met: Set<string>;
  },
) {
  const h = (handle || "").trim().toLowerCase().replace(/^@/, "");
  if (!h) return false;
  return sets.following.has(h) || sets.followers.has(h) || sets.liked.has(h) || sets.likedBy.has(h) || sets.met.has(h);
}

export function circleHandles(sets: {
  following: Set<string>;
  followers: Set<string>;
  liked: Set<string>;
  likedBy: Set<string>;
  met: Set<string>;
}): string[] {
  const all = new Set<string>();
  sets.following.forEach((h) => all.add(h));
  sets.followers.forEach((h) => all.add(h));
  sets.liked.forEach((h) => all.add(h));
  sets.likedBy.forEach((h) => all.add(h));
  sets.met.forEach((h) => all.add(h));
  return Array.from(all).filter(Boolean);
}
