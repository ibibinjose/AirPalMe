export type CircleTab = "nearby" | "met" | "following" | "followers" | "likes";

export const CIRCLE_QUESTS = [
  { id: "handle", title: "Claim your @handle", hint: "So family and friends can find you.", points: 20 },
  { id: "city", title: "Share your city", hint: "City only — never your address.", points: 20 },
  { id: "invite", title: "Invite family or a friend", hint: "Send your Circle link in one tap.", points: 25 },
  { id: "people", title: "Add someone to your Circle", hint: "Follow, meet, or get a follow back.", points: 20 },
  { id: "plan", title: "Make a plan together", hint: "Brunch, a walk, a night out.", points: 25 },
] as const;

export type CircleQuestId = (typeof CIRCLE_QUESTS)[number]["id"];

const CIRCLE_INVITE_KEY = "airpal.circle.invited";

export function hasMarkedCircleInvite(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(CIRCLE_INVITE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markCircleInviteSent(): void {
  try {
    localStorage.setItem(CIRCLE_INVITE_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function circleLevel(completed: number): { rank: number; name: string } {
  if (completed >= 5) return { rank: 5, name: "Circle host" };
  if (completed >= 4) return { rank: 4, name: "Planner" };
  if (completed >= 3) return { rank: 3, name: "Connected" };
  if (completed >= 2) return { rank: 2, name: "Local" };
  if (completed >= 1) return { rank: 1, name: "Named" };
  return { rank: 0, name: "New" };
}

export function circleQuestProgress(input: {
  hasHandle: boolean;
  sharingCity: boolean;
  invited: boolean;
  memberCount: number;
  planCount: number;
}): {
  done: Record<CircleQuestId, boolean>;
  completed: number;
  total: number;
  points: number;
  level: { rank: number; name: string };
} {
  const done: Record<CircleQuestId, boolean> = {
    handle: input.hasHandle,
    city: input.sharingCity,
    invite: input.invited,
    people: input.memberCount > 0,
    plan: input.planCount > 0,
  };
  const completed = CIRCLE_QUESTS.filter((q) => done[q.id]).length;
  const points = CIRCLE_QUESTS.reduce((sum, q) => sum + (done[q.id] ? q.points : 0), 0);
  return { done, completed, total: CIRCLE_QUESTS.length, points, level: circleLevel(completed) };
}

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
