/** AirPal Mate request loop MVP: request → (manual) match → meet → review. No payments yet. */

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

export function mateRequestValid(input: MateRequestInput): boolean {
  return (
    isUseCase(input.useCase) &&
    input.what.trim().length >= 4 &&
    /^\d{4}-\d{2}-\d{2}$/.test(input.date) &&
    input.suburb.trim().length >= 2 &&
    Number.isFinite(input.partySize) &&
    input.partySize >= 1 &&
    input.partySize <= 20 &&
    Number.isFinite(input.budget) &&
    input.budget >= 0
  );
}

export const MATE_REQUEST_STATUSES: MateRequestStatus[] = ["open", "matched", "completed", "cancelled"];

export function isRequestStatus(s: string): s is MateRequestStatus {
  return (MATE_REQUEST_STATUSES as string[]).includes(s);
}

export function reviewValid(rating: number, text: string): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 && text.trim().length <= 500;
}

export function matchAssignmentValid(mateUid: string, mateName: string): boolean {
  return mateUid.trim().length > 0 && mateName.trim().length >= 2;
}

/** Understandable match reasons — never a mystery score (AGENTS.md §5). */
export function matchReasons(
  req: Pick<MateRequest, "suburb" | "date" | "time" | "mateKind" | "useCase">,
): string[] {
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
