/**
 * AirPal Pulse — Stay beachhead shared types + helpers.
 *
 * Public URL (locked): /pulse/:publicToken
 * Token format: pls_ + 20 URL-safe alphabet chars (opaque; never a Firestore id).
 * Property-scoped paths under properties/{propertyId}/…
 */

const TOKEN_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const PULSE_TOKEN_PREFIX = "pls_";
export const PULSE_TOKEN_BODY_LEN = 20;

export const PULSE_QUESTION_TYPES = [
  "rating_5",
  "emoji",
  "yes_no",
  "single_choice",
  "text_short",
  "nps",
] as const;
export type PulseQuestionType = (typeof PULSE_QUESTION_TYPES)[number];

export const PULSE_STATUSES = ["draft", "live", "paused", "archived"] as const;
export type PulseStatus = (typeof PULSE_STATUSES)[number];

export const PULSE_TEMPLATES = [
  "stay_during",
  "dining_cafe",
  "event_experience",
  "service_retail",
  "general_csat",
] as const;
export type PulseTemplate = (typeof PULSE_TEMPLATES)[number];

export const PULSE_ISSUE_STATUSES = ["open", "acknowledged", "resolved"] as const;
export type PulseIssueStatus = (typeof PULSE_ISSUE_STATUSES)[number];

export const PULSE_ISSUE_CATEGORIES = [
  "service",
  "staff",
  "cleanliness",
  "maintenance",
  "dining",
  "noise",
  "wifi",
  "other",
] as const;
export type PulseIssueCategory = (typeof PULSE_ISSUE_CATEGORIES)[number];

export const PULSE_LOGIC_ACTIONS = ["show_question", "create_issue", "ask_contact"] as const;
export type PulseLogicAction = (typeof PULSE_LOGIC_ACTIONS)[number];

export type PulseLogicOperator = "lte" | "gte" | "eq" | "in";

export type PulseQuestion = {
  id: string;
  type: PulseQuestionType;
  prompt: string;
  required: boolean;
  options?: string[];
  /** Only shown when a logic rule reveals it. */
  gated?: boolean;
  sortOrder: number;
};

export type PulseLogicRule = {
  id: string;
  sourceQuestionId: string;
  operator: PulseLogicOperator;
  value: number | string | boolean | Array<string | number>;
  action: PulseLogicAction;
  targetQuestionId?: string;
};

export type Pulse = {
  id: string;
  propertyId: string;
  name: string;
  template: PulseTemplate;
  status: PulseStatus;
  questions: PulseQuestion[];
  logic: PulseLogicRule[];
  branding?: { title?: string; accent?: string; imageUrl?: string };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  publishedAt?: string;
};

export type PulseDeployment = {
  id: string;
  propertyId: string;
  pulseId: string;
  publicToken: string;
  placement: "room" | "lobby" | "other";
  label?: string;
  active: boolean;
  createdAt: string;
  createdBy: string;
};

export type PulseAnswer = {
  questionId: string;
  type: PulseQuestionType;
  value: number | string | boolean;
  label?: string;
};

export type PulseResponse = {
  id: string;
  propertyId: string;
  pulseId: string;
  deploymentId: string;
  publicToken: string;
  answers: PulseAnswer[];
  primaryScore?: number;
  contactRequested?: boolean;
  contactName?: string;
  contactMethod?: string;
  roomNumber?: string;
  issueId?: string;
  /** Idempotency key from the respondent client, when provided. */
  clientKey?: string;
  createdAt: string;
  uid?: string;
  anonymous: boolean;
};

export type PulseIssue = {
  id: string;
  propertyId: string;
  pulseId: string;
  responseId: string;
  deploymentId: string;
  status: PulseIssueStatus;
  category: PulseIssueCategory;
  summary: string;
  primaryScore?: number;
  roomNumber?: string;
  contactRequested?: boolean;
  contactName?: string;
  contactMethod?: string;
  assigneeUid?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  followupScore?: number;
  followupAt?: string;
  followupNote?: string;
  followupBy?: string;
  staffTicketId?: string;
  createdAt: string;
};

/** Safe public DTO — no host emails, member lists, or private tokens. */
export type PulsePublicDto = {
  propertyId: string;
  propertyName: string;
  /** Property hero image for the branded header ("" when none). */
  propertyHeroImage: string;
  pulseId: string;
  deploymentId: string;
  publicToken: string;
  name: string;
  title: string;
  /** Per-pulse cover image for the guest header ("" when none — fall back to property hero). */
  imageUrl: string;
  questions: PulseQuestion[];
  logic: PulseLogicRule[];
  status: "live";
};

/** Fling distance that commits a swipe answer (px, either direction). */
export const SWIPE_CHOOSE_THRESHOLD_PX = 90;

/**
 * Which side a drag offset commits to, if any. Positive x = right.
 * Shared so the card and its tests agree on the threshold.
 */
export function swipeChoiceForOffset(offsetX: number): "left" | "right" | null {
  if (!Number.isFinite(offsetX)) return null;
  if (offsetX >= SWIPE_CHOOSE_THRESHOLD_PX) return "right";
  if (offsetX <= -SWIPE_CHOOSE_THRESHOLD_PX) return "left";
  return null;
}

/** Bio-page rate card: the property's currently live Pulse, if any. */
export type BioPulseResult =
  | { found: false }
  | { found: true; publicToken: string; title: string; propertyName: string };

export type PulseSubmitPayload = {
  publicToken: string;
  answers: PulseAnswer[];
  contactRequested?: boolean;
  contactName?: string;
  contactMethod?: string;
  roomNumber?: string;
  /**
   * Idempotency key minted by the respondent client (one per form instance).
   * Resubmits with the same key return the original response instead of
   * creating a duplicate response + issue.
   */
  clientKey?: string;
};

/** Lifecycle transitions. Publish stays the only draft → live route. */
const PULSE_STATUS_TRANSITIONS: Record<PulseStatus, PulseStatus[]> = {
  draft: ["archived"],
  live: ["paused", "archived"],
  paused: ["live", "archived"],
  archived: [],
};

export function resolvePulseStatusTransition(from: PulseStatus, to: PulseStatus): boolean {
  if (from === to) return false;
  return (PULSE_STATUS_TRANSITIONS[from] || []).includes(to);
}

const CLIENT_KEY_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function isValidClientKey(value: unknown): value is string {
  return typeof value === "string" && CLIENT_KEY_RE.test(value);
}

/** Max stored length for a Pulse cover image URL. */
export const PULSE_IMAGE_URL_MAX_LEN = 2048;

/** Cover images must be plain https URLs (Firebase Storage download URLs). Empty means "no image". */
export function pulseImageUrlOk(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const url = value.trim();
  if (!url || url.length > PULSE_IMAGE_URL_MAX_LEN) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export type FollowupValidation = { ok: true; score: number; note?: string } | { ok: false; reason: string };

/** Guest follow-up after resolution: score 1–5 plus an optional short note. */
export function validatePulseFollowup(score: unknown, note?: unknown): FollowupValidation {
  const n = typeof score === "number" ? score : Number(score);
  if (!Number.isInteger(n) || n < 1 || n > 5) return { ok: false, reason: "bad_score" };
  if (note != null && String(note).length > 500) return { ok: false, reason: "note_too_long" };
  const trimmed = note != null ? String(note).trim() : "";
  return { ok: true, score: n, note: trimmed || undefined };
}

function randomAlphabet(length: number): string {
  const out = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(out);
  } else {
    for (let i = 0; i < length; i++) out[i] = Math.floor(Math.random() * 256) & 0xff;
  }
  let s = "";
  for (let i = 0; i < length; i++) s += TOKEN_ALPHABET[out[i]! % TOKEN_ALPHABET.length];
  return s;
}

/** Opaque public token: `pls_` + 20 URL-safe chars. */
export function createPublicToken(): string {
  return `${PULSE_TOKEN_PREFIX}${randomAlphabet(PULSE_TOKEN_BODY_LEN)}`;
}

export function isPulsePublicToken(value: string): boolean {
  return new RegExp(`^${PULSE_TOKEN_PREFIX}[0-9A-Za-z]{${PULSE_TOKEN_BODY_LEN}}$`).test(value.trim());
}

export function buildPulsePublicPath(publicToken: string): string {
  return `/pulse/${encodeURIComponent(publicToken.trim())}`;
}

export function buildPulsePublicUrl(publicToken: string, origin = "https://airpal.me"): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${buildPulsePublicPath(publicToken)}`;
}

/** Negative primary score: rating_5 / emoji ≤ 2, or NPS ≤ 6 (detractor). */
export function isNegativeRating(type: PulseQuestionType, value: number | string | boolean): boolean {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return false;
  if (type === "rating_5" || type === "emoji") return n <= 2;
  if (type === "nps") return n <= 6;
  return false;
}

export function scoreBucket(score: number | undefined): string | undefined {
  if (score == null || !Number.isFinite(score)) return undefined;
  if (score <= 2) return "1_2";
  if (score <= 3) return "3";
  if (score <= 4) return "4";
  return "5";
}

function matchesRule(rule: PulseLogicRule, answer: PulseAnswer | undefined): boolean {
  if (!answer) return false;
  const raw = answer.value;
  const num = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (rule.operator === "lte") return Number.isFinite(num) && num <= Number(rule.value);
  if (rule.operator === "gte") return Number.isFinite(num) && num >= Number(rule.value);
  if (rule.operator === "eq") {
    if (typeof rule.value === "boolean" || typeof raw === "boolean") {
      return Boolean(raw) === Boolean(rule.value);
    }
    return String(raw) === String(rule.value) || (Number.isFinite(num) && num === Number(rule.value));
  }
  if (rule.operator === "in") {
    const list = Array.isArray(rule.value) ? rule.value : [rule.value];
    return list.some((v) => String(v) === String(raw));
  }
  return false;
}

export type LogicEvaluation = {
  showQuestionIds: string[];
  createIssue: boolean;
  askContact: boolean;
};

/** Minimal IF engine: rating≤N → show question / create_issue / ask_contact. */
export function evaluateLogic(logic: PulseLogicRule[], answers: PulseAnswer[]): LogicEvaluation {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  const show = new Set<string>();
  let createIssue = false;
  let askContact = false;
  for (const rule of logic) {
    if (!matchesRule(rule, byId.get(rule.sourceQuestionId))) continue;
    if (rule.action === "show_question" && rule.targetQuestionId) show.add(rule.targetQuestionId);
    if (rule.action === "create_issue") createIssue = true;
    if (rule.action === "ask_contact") askContact = true;
  }
  return { showQuestionIds: Array.from(show), createIssue, askContact };
}

export function visibleQuestions(
  pulse: Pick<Pulse, "questions" | "logic">,
  answers: PulseAnswer[],
): PulseQuestion[] {
  const evaled = evaluateLogic(pulse.logic, answers);
  const show = new Set(evaled.showQuestionIds);
  return [...pulse.questions]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((q) => !q.gated || show.has(q.id));
}

export function primaryScoreFromAnswers(answers: PulseAnswer[]): number | undefined {
  const primary = answers.find((a) => a.type === "rating_5" || a.type === "emoji" || a.type === "nps");
  if (!primary) return undefined;
  const n = typeof primary.value === "number" ? primary.value : Number(primary.value);
  return Number.isFinite(n) ? n : undefined;
}

export function categoryFromPulseAnswers(answers: PulseAnswer[]): PulseIssueCategory {
  const choice = answers.find((a) => a.questionId === "q_wrong" || a.type === "single_choice");
  if (choice) {
    const v = String(choice.value).toLowerCase();
    for (const cat of PULSE_ISSUE_CATEGORIES) {
      if (v === cat || v.includes(cat)) return cat;
    }
  }
  const text = answers
    .map((a) => String(a.value))
    .join(" ")
    .toLowerCase();
  if (/clean|towel|linen|housekeep/.test(text)) return "cleanliness";
  if (/staff|rude|reception|front.?desk/.test(text)) return "staff";
  if (/ac|air.?con|plumb|leak|broken|light|tv|maintenance|fix/.test(text)) return "maintenance";
  if (/breakfast|dinner|menu|food|dining|restaurant/.test(text)) return "dining";
  if (/noise|loud|party|thin.?wall/.test(text)) return "noise";
  if (/wifi|internet|password|network/.test(text)) return "wifi";
  if (/service|wait|slow|help/.test(text)) return "service";
  return "other";
}

export type SubmitValidation =
  | { ok: true; answers: PulseAnswer[]; primaryScore?: number; createIssue: boolean; askContact: boolean }
  | { ok: false; reason: string };

export function validatePulseSubmitPayload(
  pulse: Pick<Pulse, "questions" | "logic">,
  payload: PulseSubmitPayload,
): SubmitValidation {
  if (!payload || typeof payload !== "object") return { ok: false, reason: "invalid_payload" };
  if (!isPulsePublicToken(String(payload.publicToken || ""))) return { ok: false, reason: "bad_token" };
  if (!Array.isArray(payload.answers) || payload.answers.length < 1) return { ok: false, reason: "no_answers" };
  if (payload.answers.length > 40) return { ok: false, reason: "too_many_answers" };

  const qById = new Map(pulse.questions.map((q) => [q.id, q]));
  const cleaned: PulseAnswer[] = [];
  for (const raw of payload.answers) {
    if (!raw || typeof raw !== "object") return { ok: false, reason: "bad_answer" };
    const questionId = String(raw.questionId || "").trim();
    const q = qById.get(questionId);
    if (!q) return { ok: false, reason: "unknown_question" };
    if (q.type !== raw.type) return { ok: false, reason: "type_mismatch" };
    const value = raw.value;
    if (q.type === "rating_5" || q.type === "emoji") {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1 || n > 5) return { ok: false, reason: "bad_rating" };
      cleaned.push({
        questionId,
        type: q.type,
        value: n,
        label: raw.label ? String(raw.label).slice(0, 40) : undefined,
      });
    } else if (q.type === "nps") {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0 || n > 10) return { ok: false, reason: "bad_nps" };
      cleaned.push({ questionId, type: q.type, value: n });
    } else if (q.type === "yes_no") {
      if (typeof value !== "boolean" && value !== "yes" && value !== "no") {
        return { ok: false, reason: "bad_yes_no" };
      }
      cleaned.push({ questionId, type: q.type, value: value === true || value === "yes" });
    } else if (q.type === "single_choice") {
      const s = String(value || "").trim();
      if (!s || s.length > 80) return { ok: false, reason: "bad_choice" };
      if (q.options?.length && !q.options.includes(s)) return { ok: false, reason: "choice_not_allowed" };
      cleaned.push({ questionId, type: q.type, value: s });
    } else if (q.type === "text_short") {
      const s = String(value || "").trim();
      if (s.length > 500) return { ok: false, reason: "text_too_long" };
      if (q.required && !s) return { ok: false, reason: "text_required" };
      cleaned.push({ questionId, type: q.type, value: s });
    } else {
      return { ok: false, reason: "unsupported_type" };
    }
  }

  const visible = visibleQuestions(pulse, cleaned);
  for (const q of visible) {
    if (!q.required) continue;
    if (!cleaned.some((a) => a.questionId === q.id)) return { ok: false, reason: "missing_required" };
  }

  const logic = evaluateLogic(pulse.logic, cleaned);
  return {
    ok: true,
    answers: cleaned,
    primaryScore: primaryScoreFromAnswers(cleaned),
    createIssue: logic.createIssue,
    askContact: logic.askContact,
  };
}

const EMOJI_OPTIONS = ["😠", "😕", "😐", "🙂", "😍"];

/** Stay “during stay” starter template (editable after create). */
export function stayDuringStayTemplate(
  propertyId: string,
  createdBy = "system",
): Omit<Pulse, "id" | "createdAt" | "updatedAt"> {
  const qStay: PulseQuestion = {
    id: "q_stay",
    type: "rating_5",
    prompt: "How is your stay?",
    required: true,
    options: EMOJI_OPTIONS,
    sortOrder: 1,
  };
  const qWrong: PulseQuestion = {
    id: "q_wrong",
    type: "single_choice",
    prompt: "What went wrong?",
    required: true,
    gated: true,
    options: [...PULSE_ISSUE_CATEGORIES],
    sortOrder: 2,
  };
  const qHelp: PulseQuestion = {
    id: "q_help",
    type: "text_short",
    prompt: "What can we do to help?",
    required: false,
    gated: true,
    sortOrder: 3,
  };
  const qContact: PulseQuestion = {
    id: "q_contact",
    type: "yes_no",
    prompt: "Want someone to contact you?",
    required: false,
    gated: true,
    sortOrder: 4,
  };

  const logic: PulseLogicRule[] = [
    {
      id: "r_show_wrong",
      sourceQuestionId: qStay.id,
      operator: "lte",
      value: 2,
      action: "show_question",
      targetQuestionId: qWrong.id,
    },
    {
      id: "r_show_help",
      sourceQuestionId: qStay.id,
      operator: "lte",
      value: 2,
      action: "show_question",
      targetQuestionId: qHelp.id,
    },
    {
      id: "r_show_contact",
      sourceQuestionId: qStay.id,
      operator: "lte",
      value: 2,
      action: "show_question",
      targetQuestionId: qContact.id,
    },
    {
      id: "r_create_issue",
      sourceQuestionId: qStay.id,
      operator: "lte",
      value: 2,
      action: "create_issue",
    },
    {
      id: "r_ask_contact",
      sourceQuestionId: qContact.id,
      operator: "eq",
      value: true,
      action: "ask_contact",
    },
  ];

  return {
    propertyId,
    name: "During stay",
    template: "stay_during",
    status: "draft",
    questions: [qStay, qWrong, qHelp, qContact],
    logic,
    branding: { title: "How is your stay?" },
    createdBy,
  };
}

/** Dining & Cafe template (food, ambiance, service, staff) */
export function diningCafeTemplate(
  propertyId: string,
  createdBy = "system",
  name = "Dining experience",
): Omit<Pulse, "id" | "createdAt" | "updatedAt"> {
  const qRate: PulseQuestion = {
    id: "q_dining",
    type: "rating_5",
    prompt: "How was your food & dining experience?",
    required: true,
    options: EMOJI_OPTIONS,
    sortOrder: 1,
  };
  const qWrong: PulseQuestion = {
    id: "q_wrong",
    type: "single_choice",
    prompt: "What went wrong?",
    required: true,
    gated: true,
    options: ["dining", "service", "cleanliness", "staff", "noise", "other"],
    sortOrder: 2,
  };
  const qHelp: PulseQuestion = {
    id: "q_help",
    type: "text_short",
    prompt: "How can our chef or manager make it right?",
    required: false,
    gated: true,
    sortOrder: 3,
  };
  const qContact: PulseQuestion = {
    id: "q_contact",
    type: "yes_no",
    prompt: "Would you like our team to follow up with you?",
    required: false,
    gated: true,
    sortOrder: 4,
  };

  const logic: PulseLogicRule[] = [
    { id: "r_show_wrong", sourceQuestionId: qRate.id, operator: "lte", value: 2, action: "show_question", targetQuestionId: qWrong.id },
    { id: "r_show_help", sourceQuestionId: qRate.id, operator: "lte", value: 2, action: "show_question", targetQuestionId: qHelp.id },
    { id: "r_show_contact", sourceQuestionId: qRate.id, operator: "lte", value: 2, action: "show_question", targetQuestionId: qContact.id },
    { id: "r_create_issue", sourceQuestionId: qRate.id, operator: "lte", value: 2, action: "create_issue" },
    { id: "r_ask_contact", sourceQuestionId: qContact.id, operator: "eq", value: true, action: "ask_contact" },
  ];

  return {
    propertyId,
    name,
    template: "dining_cafe",
    status: "draft",
    questions: [qRate, qWrong, qHelp, qContact],
    logic,
    branding: { title: "How was your experience?" },
    createdBy,
  };
}

/** Events & Experiences template (vibe, speaker, venue, organization) */
export function eventExperienceTemplate(
  propertyId: string,
  createdBy = "system",
  name = "Event feedback",
): Omit<Pulse, "id" | "createdAt" | "updatedAt"> {
  const qRate: PulseQuestion = {
    id: "q_event",
    type: "rating_5",
    prompt: "How was your experience at the event?",
    required: true,
    options: EMOJI_OPTIONS,
    sortOrder: 1,
  };
  const qWrong: PulseQuestion = {
    id: "q_wrong",
    type: "single_choice",
    prompt: "What could be improved?",
    required: true,
    gated: true,
    options: ["service", "staff", "noise", "cleanliness", "other"],
    sortOrder: 2,
  };
  const qHelp: PulseQuestion = {
    id: "q_help",
    type: "text_short",
    prompt: "Any suggestions for our organizers?",
    required: false,
    gated: true,
    sortOrder: 3,
  };
  const qContact: PulseQuestion = {
    id: "q_contact",
    type: "yes_no",
    prompt: "Want us to contact you for the next event?",
    required: false,
    gated: true,
    sortOrder: 4,
  };

  const logic: PulseLogicRule[] = [
    { id: "r_show_wrong", sourceQuestionId: qRate.id, operator: "lte", value: 2, action: "show_question", targetQuestionId: qWrong.id },
    { id: "r_show_help", sourceQuestionId: qRate.id, operator: "lte", value: 2, action: "show_question", targetQuestionId: qHelp.id },
    { id: "r_show_contact", sourceQuestionId: qRate.id, operator: "lte", value: 2, action: "show_question", targetQuestionId: qContact.id },
    { id: "r_create_issue", sourceQuestionId: qRate.id, operator: "lte", value: 2, action: "create_issue" },
    { id: "r_ask_contact", sourceQuestionId: qContact.id, operator: "eq", value: true, action: "ask_contact" },
  ];

  return {
    propertyId,
    name,
    template: "event_experience",
    status: "draft",
    questions: [qRate, qWrong, qHelp, qContact],
    logic,
    branding: { title: "How was the event?" },
    createdBy,
  };
}

/** Services & Retail template (speed, service, quality, pricing) */
export function serviceRetailTemplate(
  propertyId: string,
  createdBy = "system",
  name = "Service feedback",
): Omit<Pulse, "id" | "createdAt" | "updatedAt"> {
  const qRate: PulseQuestion = {
    id: "q_service",
    type: "rating_5",
    prompt: "How was your service today?",
    required: true,
    options: EMOJI_OPTIONS,
    sortOrder: 1,
  };
  const qWrong: PulseQuestion = {
    id: "q_wrong",
    type: "single_choice",
    prompt: "What went wrong?",
    required: true,
    gated: true,
    options: ["service", "staff", "cleanliness", "maintenance", "other"],
    sortOrder: 2,
  };
  const qHelp: PulseQuestion = {
    id: "q_help",
    type: "text_short",
    prompt: "What can we do to make it right?",
    required: false,
    gated: true,
    sortOrder: 3,
  };
  const qContact: PulseQuestion = {
    id: "q_contact",
    type: "yes_no",
    prompt: "Would you like our management to contact you?",
    required: false,
    gated: true,
    sortOrder: 4,
  };

  const logic: PulseLogicRule[] = [
    { id: "r_show_wrong", sourceQuestionId: qRate.id, operator: "lte", value: 2, action: "show_question", targetQuestionId: qWrong.id },
    { id: "r_show_help", sourceQuestionId: qRate.id, operator: "lte", value: 2, action: "show_question", targetQuestionId: qHelp.id },
    { id: "r_show_contact", sourceQuestionId: qRate.id, operator: "lte", value: 2, action: "show_question", targetQuestionId: qContact.id },
    { id: "r_create_issue", sourceQuestionId: qRate.id, operator: "lte", value: 2, action: "create_issue" },
    { id: "r_ask_contact", sourceQuestionId: qContact.id, operator: "eq", value: true, action: "ask_contact" },
  ];

  return {
    propertyId,
    name,
    template: "service_retail",
    status: "draft",
    questions: [qRate, qWrong, qHelp, qContact],
    logic,
    branding: { title: "How was your service?" },
    createdBy,
  };
}

/** General CSAT template for any individual, business, or creator */
export function generalCsatTemplate(
  propertyId: string,
  createdBy = "system",
  name = "Customer feedback",
): Omit<Pulse, "id" | "createdAt" | "updatedAt"> {
  const qRate: PulseQuestion = {
    id: "q_general",
    type: "rating_5",
    prompt: "How was your experience with us?",
    required: true,
    options: EMOJI_OPTIONS,
    sortOrder: 1,
  };
  const qWrong: PulseQuestion = {
    id: "q_wrong",
    type: "single_choice",
    prompt: "What went wrong?",
    required: true,
    gated: true,
    options: ["service", "staff", "cleanliness", "maintenance", "other"],
    sortOrder: 2,
  };
  const qHelp: PulseQuestion = {
    id: "q_help",
    type: "text_short",
    prompt: "How can we help or improve?",
    required: false,
    gated: true,
    sortOrder: 3,
  };
  const qContact: PulseQuestion = {
    id: "q_contact",
    type: "yes_no",
    prompt: "Want someone to follow up with you?",
    required: false,
    gated: true,
    sortOrder: 4,
  };

  const logic: PulseLogicRule[] = [
    { id: "r_show_wrong", sourceQuestionId: qRate.id, operator: "lte", value: 2, action: "show_question", targetQuestionId: qWrong.id },
    { id: "r_show_help", sourceQuestionId: qRate.id, operator: "lte", value: 2, action: "show_question", targetQuestionId: qHelp.id },
    { id: "r_show_contact", sourceQuestionId: qRate.id, operator: "lte", value: 2, action: "show_question", targetQuestionId: qContact.id },
    { id: "r_create_issue", sourceQuestionId: qRate.id, operator: "lte", value: 2, action: "create_issue" },
    { id: "r_ask_contact", sourceQuestionId: qContact.id, operator: "eq", value: true, action: "ask_contact" },
  ];

  return {
    propertyId,
    name,
    template: "general_csat",
    status: "draft",
    questions: [qRate, qWrong, qHelp, qContact],
    logic,
    branding: { title: "How was your experience?" },
    createdBy,
  };
}

export function createPulseTemplate(
  template: PulseTemplate,
  propertyId: string,
  createdBy = "system",
  name?: string,
): Omit<Pulse, "id" | "createdAt" | "updatedAt"> {
  switch (template) {
    case "dining_cafe":
      return diningCafeTemplate(propertyId, createdBy, name || "Dining feedback");
    case "event_experience":
      return eventExperienceTemplate(propertyId, createdBy, name || "Event feedback");
    case "service_retail":
      return serviceRetailTemplate(propertyId, createdBy, name || "Service feedback");
    case "general_csat":
      return generalCsatTemplate(propertyId, createdBy, name || "Customer feedback");
    case "stay_during":
    default:
      return stayDuringStayTemplate(propertyId, createdBy);
  }
}

export function issueSummaryFromAnswers(answers: PulseAnswer[], primaryScore?: number): string {
  const help = answers.find((a) => a.questionId === "q_help" || a.type === "text_short");
  const cat = answers.find((a) => a.questionId === "q_wrong" || a.type === "single_choice");
  const bits = [
    primaryScore != null ? `Stay ${primaryScore}/5` : "Stay feedback",
    cat ? String(cat.value) : null,
    help && String(help.value).trim() ? String(help.value).trim().slice(0, 120) : null,
  ].filter(Boolean);
  return bits.join(" · ").slice(0, 200) || "Pulse issue";
}

/** 1–5 score histogram for the satisfaction breakdown. Ignores unscored rows. */
export function scoreDistribution(rows: Array<{ primaryScore?: number | null }>): Record<1 | 2 | 3 | 4 | 5, number> {
  const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const row of rows) {
    const p = row.primaryScore;
    if (p != null && p >= 1 && p <= 5) counts[p] += 1;
  }
  return counts as Record<1 | 2 | 3 | 4 | 5, number>;
}

/** The pulse whose QR is live, else the first one to continue working on. */
export function activeLivePulse<T extends { status: string }>(pulses: T[]): T | undefined {
  return pulses.find((p) => p.status === "live") || pulses[0];
}

/** CSV header + rows for host export (only contact fields the guest offered). */
export function pulseResponsesToCsv(rows: PulseResponse[]): string {
  const header = [
    "responseId",
    "createdAt",
    "primaryScore",
    "roomNumber",
    "contactRequested",
    "contactName",
    "contactMethod",
    "issueId",
    "answersJson",
  ];
  const sanitizeCell = (v: unknown): string => {
    if (v == null) return '""';
    let s = String(v);
    // Neutralize spreadsheet formula injection (=, +, -, @, tab, CR)
    if (/^[=+\-@\t\r]/.test(s)) {
      s = `'${s}`;
    }
    return `"${s.replace(/"/g, '""')}"`;
  };

  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        sanitizeCell(row.id),
        sanitizeCell(row.createdAt),
        sanitizeCell(row.primaryScore ?? ""),
        sanitizeCell(row.roomNumber ?? ""),
        sanitizeCell(row.contactRequested ? "yes" : "no"),
        sanitizeCell(row.contactName ?? ""),
        sanitizeCell(row.contactMethod ?? ""),
        sanitizeCell(row.issueId ?? ""),
        sanitizeCell(JSON.stringify(row.answers || [])),
      ].join(","),
    );
  }
  return lines.join("\n");
}
