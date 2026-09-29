/** AirPal Mate request loop: request → match → book/pay (Stripe) → meet → review. */

export const MATE_USE_CASES = [
  { id: "events", label: "Events", line: "Someone to come to this event with" },
  { id: "activities", label: "Activities", line: "Someone to do this with" },
  { id: "explore", label: "Explore", line: "Show me around Sydney" },
  { id: "travel", label: "Travel", line: "Company on a trip" },
  { id: "social", label: "Social", line: "Go out, not alone" },
] as const;

export type MateUseCaseId = (typeof MATE_USE_CASES)[number]["id"];

export type MateRequestStatus = "open" | "matched" | "completed" | "cancelled";

export interface MateRequest {
  id: string;
  ownerUid: string;
  useCase: MateUseCaseId;
  what: string;
  date: string;
  time: string;
  suburb: string;
  partySize: number;
  budget: number;
  mateKind: string;
  status: MateRequestStatus;
  adminNote: string;
  /** Post-meet review by the requester. Feeds trust data for future matching. */
  rating?: number;
  reviewText?: string;
  /** Post-meet review by the Mate. */
  mateRating?: number;
  mateReviewText?: string;
  /** Who delivered. Without this, reputation (§31) can never exist. */
  matchedMateUid?: string;
  matchedMateName?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MateRequestInput {
  useCase: MateUseCaseId;
  what: string;
  date: string;
  time: string;
  suburb: string;
  partySize: number;
  budget: number;
  mateKind: string;
}

export function emptyMateRequest(): MateRequestInput {
  return {
    useCase: "events",
    what: "",
    date: "",
    time: "",
    suburb: "",
    partySize: 2,
    budget: 80,
    mateKind: "",
  };
}

export function isUseCase(id: string): id is MateUseCaseId {
  return MATE_USE_CASES.some((c) => c.id === id);
}

export function mateRequestValid(input: MateRequestInput, today?: string): boolean {
  if (
    !(
      isUseCase(input.useCase) &&
      input.what.trim().length >= 4 &&
      /^\d{4}-\d{2}-\d{2}$/.test(input.date) &&
      input.suburb.trim().length >= 2 &&
      Number.isFinite(input.partySize) &&
      input.partySize >= 1 &&
      input.partySize <= 20 &&
      Number.isFinite(input.budget) &&
      input.budget >= 0
    )
  ) {
    return false;
  }
  // Past-date guard: callers pass the zoned today (LocalNow). YYYY-MM-DD
  // compares lexicographically; absent/malformed today keeps legacy behavior.
  if (today && /^\d{4}-\d{2}-\d{2}$/.test(today) && input.date < today) return false;
  return true;
}

export const MATE_REQUEST_STATUSES: MateRequestStatus[] = ["open", "matched", "completed", "cancelled"];

export function isRequestStatus(s: string): s is MateRequestStatus {
  return (MATE_REQUEST_STATUSES as string[]).includes(s);
}

export function reviewValid(rating: number, text: string): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 && text.trim().length <= 500;
}

export function canLeaveReview(status: MateRequestStatus): boolean {
  return status === "completed";
}

export function matchAssignmentValid(mateUid: string, mateName: string): boolean {
  return mateUid.trim().length > 0 && mateName.trim().length >= 2;
}

/**
 * Client-side precheck before claiming an open request. Firestore rules stay
 * the authority — this only explains the refusal early (B2 double-accept).
 * Returns null when the claim may proceed, otherwise a human-readable reason.
 */
export function canAcceptRequest(
  request: Pick<MateRequest, "status" | "ownerUid">,
  mateUid: string,
  isApprovedMate: boolean,
): string | null {
  if (!mateUid) return "Sign in as an approved Mate to accept.";
  if (!isApprovedMate) return "Only approved Mates can accept requests.";
  if (request.ownerUid === mateUid) return "You can't accept your own request.";
  if (request.status !== "open") return "This request is no longer open.";
  return null;
}

/**
 * Request → Plan handoff: prefill the plan form from a filed request.
 * The plan form validates date/time itself; blanks are omitted here.
 */
export function mateRequestPlanHref(input: Pick<MateRequestInput, "what" | "suburb" | "date" | "time">): string {
  const parts: string[] = [];
  const title = input.what.trim();
  const dest = input.suburb.trim();
  const date = input.date.trim();
  const time = input.time.trim();
  if (title) parts.push(`title=${encodeURIComponent(title)}`);
  if (dest) parts.push(`dest=${encodeURIComponent(dest)}`);
  if (date) parts.push(`date=${encodeURIComponent(date)}`);
  if (time) parts.push(`time=${encodeURIComponent(time)}`);
  return parts.length ? `/plan/new?${parts.join("&")}` : "/plan/new";
}

/** Understandable match reasons — never a mystery score (AGENTS.md §5). */
export function matchReasons(req: Pick<MateRequest, "suburb" | "date" | "time" | "mateKind" | "useCase">): string[] {
  const out: string[] = [];
  const suburb = req.suburb.trim();
  if (suburb) out.push(`In ${suburb}`);
  const time = req.time.trim();
  if (req.date) out.push(time ? `${req.date} at ${time}` : req.date);
  const kind = req.mateKind.trim();
  if (kind) out.push(`Looking for ${kind}`);
  const use = MATE_USE_CASES.find((c) => c.id === req.useCase);
  if (use) out.push(use.line);
  return out.slice(0, 4);
}
