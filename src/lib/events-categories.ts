/**
 * /events buckets: every upcoming event lands in exactly one of Places,
 * Community, or Friends. Rules derive only from real event fields —
 * nothing is guessed.
 *
 * - Friends: created by people (user source, individual host).
 * - Community: community source/category (public gatherings, expos, markets).
 * - Places: everything else — venue and business-backed events.
 */
export type EventBucket = "places" | "community" | "friends";

export const EVENT_BUCKETS: { id: EventBucket; label: string; blurb: string }[] = [
  { id: "places", label: "Places", blurb: "Gigs, dinners and nights at venues and businesses." },
  { id: "community", label: "Community", blurb: "Markets, expos and public community gatherings." },
  { id: "friends", label: "Friends", blurb: "Events created by people, not businesses." },
];

export interface BucketInput {
  source?: string;
  hostType?: string;
  category?: string;
}

export function bucketEvent(input: BucketInput): EventBucket {
  if (input.source === "user" || input.hostType === "individual") return "friends";
  if (input.source === "community" || input.category === "community") return "community";
  return "places";
}
