/** Anonymous-user abuse controls: rate limits, duplicates, automation signals. */

export const RATE_LIMIT_ACTIONS = [
  "ask",
  "claim",
  "rating",
  "ticket",
  "pulse_response",
  "analytics",
  "listingWrite",
  "eventWrite",
  "redeem",
  "bioTap",
  "saveEvent",
  "planWrite",
  "planRsvp",
  "enter",
  "authLogin",
  "broadcast",
  "hereShare",
  "wave",
  "pay",
] as const;

export type RateLimitAction = (typeof RATE_LIMIT_ACTIONS)[number];

export type RateLimitSpec = {
  windowMs: number;
  max: number;
  anonymousMax: number;
};

export const RATE_LIMITS: Record<RateLimitAction, RateLimitSpec> = {
  ask: { windowMs: 60_000, max: 8, anonymousMax: 5 },
  claim: { windowMs: 60_000, max: 6, anonymousMax: 3 },
  rating: { windowMs: 10 * 60_000, max: 4, anonymousMax: 2 },
  ticket: { windowMs: 5 * 60_000, max: 5, anonymousMax: 3 },
  pulse_response: { windowMs: 5 * 60_000, max: 5, anonymousMax: 3 },
  analytics: { windowMs: 60_000, max: 60, anonymousMax: 40 },
  listingWrite: { windowMs: 60_000, max: 12, anonymousMax: 0 },
  eventWrite: { windowMs: 60_000, max: 12, anonymousMax: 0 },
  redeem: { windowMs: 60_000, max: 8, anonymousMax: 0 },
  bioTap: { windowMs: 60_000, max: 30, anonymousMax: 20 },
  saveEvent: { windowMs: 60_000, max: 20, anonymousMax: 12 },
  planWrite: { windowMs: 60_000, max: 15, anonymousMax: 10 },
  planRsvp: { windowMs: 60_000, max: 20, anonymousMax: 15 },
  enter: { windowMs: 60_000, max: 10, anonymousMax: 0 },
  authLogin: { windowMs: 60_000, max: 8, anonymousMax: 8 },
  broadcast: { windowMs: 60_000, max: 4, anonymousMax: 0 },
  hereShare: { windowMs: 60_000, max: 8, anonymousMax: 0 },
  wave: { windowMs: 60_000, max: 12, anonymousMax: 0 },
  pay: { windowMs: 60_000, max: 8, anonymousMax: 0 },
};

export function rateLimitMax(action: RateLimitAction, anonymous: boolean): number {
  const spec = RATE_LIMITS[action];
  return anonymous ? spec.anonymousMax : spec.max;
}

export function rateLimitAllows(input: {
  action: RateLimitAction;
  anonymous: boolean;
  count: number;
  windowStart: number;
  now?: number;
}): { ok: true; nextCount: number; windowStart: number } | { ok: false; retryAfterMs: number } {
  const spec = RATE_LIMITS[input.action];
  const now = input.now ?? Date.now();
  const inWindow = now - input.windowStart < spec.windowMs && input.windowStart > 0;
  const count = inWindow ? input.count : 0;
  const windowStart = inWindow ? input.windowStart : now;
  const max = rateLimitMax(input.action, input.anonymous);
  if (count >= max) {
    return { ok: false, retryAfterMs: Math.max(0, spec.windowMs - (now - windowStart)) };
  }
  return { ok: true, nextCount: count + 1, windowStart };
}

export function submissionFingerprint(parts: Array<string | number | boolean | undefined | null>): string {
  return parts
    .map((part) =>
      String(part ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " "),
    )
    .join("|");
}

export function isDuplicateSubmission(
  previousAt: string | number | undefined,
  now = Date.now(),
  windowMs = 120_000,
): boolean {
  if (previousAt == null || previousAt === "") return false;
  const at = typeof previousAt === "number" ? previousAt : Date.parse(previousAt);
  return Number.isFinite(at) && now - at < windowMs;
}

export function ratingTargetKey(input: {
  target: string;
  eventId?: string;
  stallId?: string;
  propertyId?: string;
}): string {
  if (input.target === "stall" && input.stallId) return `stall:${input.stallId}`;
  if (input.target === "event" && input.eventId) return `event:${input.eventId}`;
  if (input.propertyId) return `stay:${input.propertyId}`;
  if (input.eventId) return `event:${input.eventId}`;
  return input.target;
}

export function ratingDocId(uid: string, key: string): string {
  const safe = `${uid}_${key}`.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 700);
  return safe || "rating";
}

export type AutomationSignal = {
  score: number;
  flags: string[];
  automated: boolean;
};

/** Heuristic score for bot-like bursts. Score >= 3 is treated as automated. */
export function automatedActivityScore(input: {
  eventsInWindow: number;
  windowMs: number;
  uniqueActions: number;
  identicalPayloads: number;
  missingAppCheck?: boolean;
}): AutomationSignal {
  const flags: string[] = [];
  let score = 0;
  const perMinute = input.windowMs > 0 ? input.eventsInWindow / (input.windowMs / 60_000) : input.eventsInWindow;

  if (perMinute >= 40) {
    score += 2;
    flags.push("high_velocity");
  } else if (perMinute >= 20) {
    score += 1;
    flags.push("elevated_velocity");
  }

  if (input.eventsInWindow >= 8 && input.uniqueActions <= 1) {
    score += 1;
    flags.push("single_action_burst");
  }

  if (input.identicalPayloads >= 4) {
    score += 2;
    flags.push("repeated_payload");
  } else if (input.identicalPayloads >= 3) {
    score += 1;
    flags.push("similar_payload");
  }

  if (input.missingAppCheck) {
    score += 1;
    flags.push("missing_app_check");
  }

  return { score, flags, automated: score >= 3 };
}
