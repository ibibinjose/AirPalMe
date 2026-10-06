import type { Geo } from "./nearby";

export type PlanType =
  | "birthday"
  | "wedding"
  | "graduation"
  | "housewarming"
  | "baby_shower"
  | "memorial"
  | "anniversary"
  | "nightout"
  | "lunch"
  | "movies"
  | "trip"
  | "escape"
  | "gig"
  | "walk"
  | "catchup"
  | "meeting"
  | "custom";

export type PlanTheme =
  | "gold"
  | "midnight"
  | "sunset"
  | "emerald"
  | "holographic"
  | "hotpink"
  | "champagne"
  | "celestial"
  | "fluro"
  | "jetblack";

export type PlanAttendeeStatus = "going" | "maybe" | "declined" | "waitlisted" | "pending";

/**
 * Who's-going privacy, host-controlled. Absent = everything visible
 * (today's behaviour). Guests never see more than this allows on the
 * invite page; the host always sees the full list.
 */
export interface PlanGuestListVisibility {
  /** Hide attendee names/handles/avatars/notes from other guests. */
  hideNames?: boolean;
  /** Hide going/maybe headcounts from other guests. */
  hideCount?: boolean;
}

export interface PlanAttendee {
  id: string; // uid or anonymous guest session ID
  name: string;
  handle?: string;
  avatar?: string;
  status: PlanAttendeeStatus;
  isAnonymous?: boolean;
  /** Extra heads beyond the guest (party size = 1 + plusOnes). Counts toward host capacity. */
  plusOnes?: number;
  /** Answers to host guest questions, keyed by question id. */
  answers?: Record<string, string>;
  /** Host-confirmed attendance: this person showed up. */
  checkedIn?: boolean;
  checkedInAt?: string;
  /** Post-experience rating (1–5) from someone who went. */
  rating?: number;
  /** Post-experience words (host-visible). */
  review?: string;
  notes?: string;
  respondedAt: string;
}

export type StopIconType =
  | "coffee"
  | "food"
  | "petrol"
  | "drinks"
  | "stay"
  | "sight"
  | "music"
  | "shop"
  | "walk"
  | "cake"
  | "ceremony"
  | "gift"
  | "speech"
  | "home"
  | "photo"
  | "toast"
  | "memorial"
  | "pin";

export interface PlanStop {
  id: string;
  name: string;
  time?: string;
  placeId?: string;
  address?: string;
  notes?: string;
  icon?: StopIconType | string;
  geo?: Geo;
  addedByName?: string;
  addedByUid?: string;
  votes?: number;
  voterUids?: string[];
}

export interface PlanComment {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle?: string;
  authorAvatar?: string;
  text: string;
  photoUrl?: string;
  createdAt: string;
}

export type PlanStatus = "draft" | "open" | "confirmed" | "completed" | "cancelled";

export type ExperienceCategory = "social" | "tour" | "workshop" | "fitness" | "getaway" | "retreat" | "other";

export interface ExperienceCategoryInfo {
  id: ExperienceCategory;
  label: string;
  emoji: string;
  tagline: string;
  description: string;
}

export const EXPERIENCE_CATEGORIES: Record<ExperienceCategory, ExperienceCategoryInfo> = {
  social: {
    id: "social",
    label: "Social & Meetup",
    emoji: "🍸",
    tagline: "Dinners, drinks & hangouts",
    description: "Community dining, golden hour rooftop drinks, picnics and casual meetups.",
  },
  tour: {
    id: "tour",
    label: "Tour & Trail",
    emoji: "🚶",
    tagline: "Guided walks & food crawls",
    description: "Expert-guided walking tours, local food crawls, photography and laneway discoveries.",
  },
  workshop: {
    id: "workshop",
    label: "Workshop & Class",
    emoji: "🎨",
    tagline: "Creative masterclasses & skills",
    description: "Culinary cooking classes, cocktail masterclasses, pottery, art and creative sessions.",
  },
  fitness: {
    id: "fitness",
    label: "Fitness & Wellness",
    emoji: "🧘",
    tagline: "Yoga, surf & wellness",
    description: "Morning yoga, run clubs, surf sessions, breathwork and outdoor movement.",
  },
  getaway: {
    id: "getaway",
    label: "Weekend Getaway",
    emoji: "🏕️",
    tagline: "Roadtrips & cabin escapes",
    description: "Weekend road trips, camping under the stars, cabin retreats, and coastal adventures.",
  },
  retreat: {
    id: "retreat",
    label: "Retreat & Expedition",
    emoji: "🌴",
    tagline: "Multi-day wellness & Bali journeys",
    description: "Curated multi-day wellness retreats, island journeys, and international group adventures.",
  },
  other: {
    id: "other",
    label: "Curated Experience",
    emoji: "✨",
    tagline: "Unique happenings & special events",
    description: "Bespoke experiences, VIP happenings, private tastings, and special events.",
  },
};

export type PricingModel = "free" | "fixed" | "tiered" | "deposit";

export interface PlanPricingTier {
  id: string;
  name: string;
  description?: string;
  price: number;
  capacity: number;
  spotsBooked?: number;
  depositAmount?: number;
}

export interface PlanDepositConfig {
  depositAmount: number;
  depositPercentage?: number;
  balanceDueDate?: string;
  balanceDueDaysBefore?: number;
  dueDateDaysBefore?: number;
  balanceDueDescription?: string;
}

export interface PlanInclusions {
  included: string[];
  notIncluded?: string[];
  whatToBring?: string[];
}

export interface PlanMultiDaySchedule {
  dayNumber: number;
  date?: string;
  title: string;
  description?: string;
  stops: PlanStop[];
}

export interface PlanBookingPolicy {
  cancellationPolicy?: "flexible" | "moderate" | "strict";
  refundPolicy?: "flexible" | "moderate" | "strict" | "non_refundable";
  instantBooking?: boolean;
  minGuests?: number;
  maxGuests?: number;
  hostStripeAccountId?: string;
  customTerms?: string;
}

export interface HangoutPlan {
  id: string;
  title: string;
  type: PlanType;
  theme: PlanTheme;
  creator: {
    uid?: string;
    name: string;
    handle?: string;
    avatar?: string;
    isAnonymous?: boolean;
  };
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  endTime?: string; // HH:mm (optional)
  datetime: string; // ISO string
  city: string;
  destination: string;
  heroImage?: string;
  notes?: string;
  stops: PlanStop[];
  attendees: PlanAttendee[];
  comments?: PlanComment[];
  subscribers: string[]; // user IDs following the plan (legacy rows may hold emails)
  inviteCode: string; // 6-char unique short code
  /** Public plans appear on the live map and nearby feed; private stay invite-only. */
  isPublic?: boolean;
  /** Demo-business marker: filtered from guest discovery, `demo-` ids skip KPIs. */
  demo?: boolean;
  /** Dropped pin for the meeting point. Absent = shown as a city-area pin. */
  geo?: Geo;
  /** Interest tags used for nearby matching. */
  interests?: string[];
  status: PlanStatus;
  /** Server-stamped when status flips to completed via completePlanRemote. */
  completedAt?: string;
  completedByUid?: string;
  /** Auto-reminder stamps, keyed by the plan date each nudge was sent for. */
  remindersSent?: {
    dayBefore?: string;
    dayOf?: string;
  };
  /** Who's-going visibility. Absent = names and counts visible. */
  guestList?: PlanGuestListVisibility;
  /** Host approves every guest: going intents land as pending requests. */
  requiresApproval?: boolean;
  /** Host questions for guests (diet, transport, vibe). Answers ride attendee rows. */
  guestQuestions?: PlanGuestQuestion[];
  /** Co-hosts: attendee uids with full host powers (manage, broadcast, check in). */
  coHostUids?: string[];
  /** Why the host cancelled, shown to the crew. */
  cancelReason?: string;
  /** "When works?" candidates. The host locks one into date/time. */
  dateOptions?: PlanDateOption[];
  /** True once the host locks a date option in. */
  datePollLocked?: boolean;

  // Experience Marketplace & Monetization Fields (Optional for full backward compatibility)
  isExperience?: boolean;
  experienceCategory?: ExperienceCategory;
  pricingModel?: PricingModel;
  pricePerPerson?: number;
  currency?: string;
  depositConfig?: PlanDepositConfig;
  pricingTiers?: PlanPricingTier[];
  inclusions?: PlanInclusions;
  durationMode?: "single_day" | "multi_day";
  endDate?: string;
  multiDaySchedule?: PlanMultiDaySchedule[];
  bookingPolicy?: PlanBookingPolicy;
  capacity?: number;
  spotsBooked?: number;

  createdAt: string;
  updatedAt: string;
}

/** Paid public events/experiences sell tickets through Stripe Checkout. */
export function isTicketed(plan: Pick<HangoutPlan, "isExperience" | "pricePerPerson" | "pricingModel">): boolean {
  if (!plan.isExperience) return false;
  if (plan.pricingModel === "free") return false;
  return Number(plan.pricePerPerson || 0) > 0;
}

export function spotsLeft(plan: Pick<HangoutPlan, "capacity" | "spotsBooked">): number | null {
  const cap = Number(plan.capacity || 0);
  if (!Number.isFinite(cap) || cap <= 0) return null;
  return Math.max(0, Math.floor(cap) - Math.max(0, Math.floor(Number(plan.spotsBooked || 0))));
}

export function isSoldOut(plan: Pick<HangoutPlan, "capacity" | "spotsBooked">): boolean {
  const left = spotsLeft(plan);
  return left !== null && left <= 0;
}

/** Sanity cap per RSVP — host capacity is the real gate. */
export const PLAN_PLUS_ONES_MAX = 5;
/** Sanity cap for host guest limits. */
export const PLAN_CAPACITY_MAX = 500;

export function normalizePlusOnes(n: unknown): number {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return 0;
  return Math.min(PLAN_PLUS_ONES_MAX, Math.max(0, v));
}

/** Seats one attendee occupies: head + plus-ones. Only going counts. */
export function attendeeSeats(a: Pick<PlanAttendee, "status" | "plusOnes"> | undefined): number {
  if (!a || a.status !== "going") return 0;
  return 1 + normalizePlusOnes(a.plusOnes);
}

/** Total seats taken by going attendees (party sizes), for host capacity. */
export function headcountTaken(plan: Pick<HangoutPlan, "attendees">): number {
  return (plan.attendees || []).reduce((n, a) => n + attendeeSeats(a), 0);
}

/** Spots left under the host guest limit, or null when the plan has no limit. */
export function headcountLeft(plan: Pick<HangoutPlan, "attendees" | "capacity">): number | null {
  const cap = Math.floor(Number(plan.capacity));
  if (!Number.isFinite(cap) || cap <= 0) return null;
  return Math.max(0, cap - headcountTaken(plan));
}

/** Clamp a host guest limit: empty/invalid clears it, otherwise 1..MAX. */
export function normalizeCapacity(n: unknown): number | undefined {
  if (n === undefined || n === null || String(n).trim() === "") return undefined;
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v) || v <= 0) return undefined;
  return Math.min(PLAN_CAPACITY_MAX, Math.max(1, v));
}

/** Experience money guardrails (dollars): finite, non-negative, capped. */
export const EXPERIENCE_PRICE_MAX = 1000000;
export const EXPERIENCE_CAPACITY_MAX = 100000;
export const EXPERIENCE_TIERS_MAX = 20;

export function clampExperienceMoney(n: unknown): number {
  const v = Number(n || 0);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.min(EXPERIENCE_PRICE_MAX, Math.round(v * 100) / 100);
}

export function clampExperienceCapacity(n: unknown, fallback = 20): number {
  const v = Math.floor(Number(n || 0));
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return Math.min(EXPERIENCE_CAPACITY_MAX, v);
}

export function sanitizeCurrencyCode(n: unknown): string {
  const code = String(n || "AUD").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "AUD";
}

export function sanitizePricingTiers(tiers: unknown): PlanPricingTier[] | undefined {
  if (!Array.isArray(tiers)) return undefined;
  const clean = tiers.slice(0, EXPERIENCE_TIERS_MAX).map((row, i) => {
    const t = (row || {}) as Partial<PlanPricingTier>;
    return {
      id: String(t.id || `tier-${i + 1}`),
      name: String(t.name || `Tier ${i + 1}`).slice(0, 80),
      description: t.description ? String(t.description).slice(0, 280) : undefined,
      price: clampExperienceMoney(t.price),
      capacity: clampExperienceCapacity(t.capacity),
      spotsBooked: 0,
      depositAmount: t.depositAmount === undefined ? undefined : clampExperienceMoney(t.depositAmount),
    } as PlanPricingTier;
  });
  return clean.length ? clean : undefined;
}

export function sanitizeDepositConfig(config: unknown): PlanDepositConfig | undefined {
  if (!config || typeof config !== "object") return undefined;
  const c = config as Partial<PlanDepositConfig>;
  const pct = Number(c.depositPercentage);
  return {
    depositAmount: clampExperienceMoney(c.depositAmount),
    depositPercentage: Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : undefined,
    balanceDueDate: c.balanceDueDate ? String(c.balanceDueDate).slice(0, 20) : undefined,
    balanceDueDaysBefore: c.balanceDueDaysBefore === undefined ? undefined : Math.max(0, Math.floor(Number(c.balanceDueDaysBefore)) || 0),
    dueDateDaysBefore: c.dueDateDaysBefore === undefined ? undefined : Math.max(0, Math.floor(Number(c.dueDateDaysBefore)) || 0),
    balanceDueDescription: c.balanceDueDescription ? String(c.balanceDueDescription).slice(0, 280) : undefined,
  };
}

/** One "when works?" candidate. Votes decide; the host locks one in. */
export interface PlanDateOption {
  id: string;
  /** YYYY-MM-DD calendar date. */
  date: string;
  /** HH:mm local time, optional — falls back to the plan time on lock. */
  time?: string;
  votes: number;
  voterUids?: string[];
  addedByUid?: string;
  addedByName?: string;
}

/** YYYY-MM-DD + optional HH:mm, both real calendar values. */
export function validDateOption(input: { date: unknown; time?: unknown }): string[] {
  const errors: string[] = [];
  const date = String(input.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push("Pick a date.");
  } else {
    const [y, m, d] = date.split("-").map(Number);
    const dt = new Date(Date.UTC(y!, m! - 1, d!));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m! - 1 || dt.getUTCDate() !== d) {
      errors.push("Pick a real date.");
    }
  }
  const time = String(input.time || "").trim();
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) errors.push("Pick a real time.");
  return errors;
}

/** A live poll: options proposed, host hasn't locked one in. */
export function hasOpenDatePoll(plan: Pick<HangoutPlan, "dateOptions" | "datePollLocked">): boolean {
  return Boolean((plan.dateOptions || []).length) && !plan.datePollLocked;
}

/** A host question for guests: diet, transport, vibe. Answers ride the attendee row. */
export type PlanQuestionType = "text" | "choice";

export interface PlanGuestQuestion {
  id: string;
  question: string;
  type: PlanQuestionType;
  /** Choice options (single-select). Ignored for text. */
  options?: string[];
}

export const PLAN_QUESTIONS_MAX = 10;
export const PLAN_QUESTION_MAX = 140;
export const PLAN_QUESTION_OPTIONS_MAX = 6;
export const PLAN_ANSWER_MAX = 280;

/** Host-side validation for a new question. */
export function validGuestQuestion(input: { question: unknown; type: unknown; options?: unknown }): string[] {
  const errors: string[] = [];
  const question = String(input.question || "").trim();
  if (!question) errors.push("Write the question.");
  if (question.length > PLAN_QUESTION_MAX) errors.push(`Keep it under ${PLAN_QUESTION_MAX} characters.`);
  const type = String(input.type || "text");
  if (type !== "text" && type !== "choice") {
    errors.push("Pick text or choice.");
    return errors;
  }
  if (type === "choice") {
    const raw = Array.isArray(input.options) ? input.options : [];
    const options = raw.map((o) => String(o || "").trim()).filter(Boolean);
    if (options.length < 2) errors.push("Choice needs at least 2 options.");
    if (options.length > PLAN_QUESTION_OPTIONS_MAX) errors.push(`At most ${PLAN_QUESTION_OPTIONS_MAX} options.`);
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) errors.push("Options must differ.");
  }
  return errors;
}

/** Clean a guest answer: trim, clamp, and (for choice) only a listed option survives. */
export function normalizeAnswer(question: Pick<PlanGuestQuestion, "type" | "options">, raw: unknown): string {
  const text = String(raw || "").trim().slice(0, PLAN_ANSWER_MAX);
  if (!text) return "";
  if (question.type === "choice") {
    const hit = (question.options || []).find((o) => o.toLowerCase() === text.toLowerCase());
    return hit || "";
  }
  return text;
}

/** Choice tallies, most-picked first (zero-vote options included so hosts see the full menu). */
export function choiceAnswerCounts(
  question: Pick<PlanGuestQuestion, "id" | "options">,
  attendees: Array<{ answers?: Record<string, string> } | undefined>,
): Array<{ option: string; count: number }> {
  const options = question.options || [];
  const id = String(question.id || "");
  const counts = new Map<string, number>(options.map((o) => [o, 0]));
  for (const a of attendees || []) {
    const v = String(a?.answers?.[id] || "").trim();
    if (!v) continue;
    const hit = options.find((o) => o.toLowerCase() === v.toLowerCase());
    if (hit) counts.set(hit, (counts.get(hit) || 0) + 1);
  }
  return options.map((option) => ({ option, count: counts.get(option) || 0 })).sort((a, b) => b.count - a.count);
}

/** Free-text answers in attendee order. */
export function textAnswers(
  question: Pick<PlanGuestQuestion, "id">,
  attendees: Array<{ answers?: Record<string, string> } | undefined>,
): string[] {
  const id = String(question.id || "");
  const out: string[] = [];
  for (const a of attendees || []) {
    const v = String(a?.answers?.[id] || "").trim();
    if (v) out.push(v);
  }
  return out;
}

/** Front-runner: most votes, earliest date breaks ties. */
export function topDateOption(
  plan: Pick<HangoutPlan, "dateOptions">,
): PlanDateOption | undefined {
  const opts = [...(plan.dateOptions || [])];
  if (!opts.length) return undefined;
  opts.sort((a, b) => b.votes - a.votes || String(a.date).localeCompare(String(b.date)));
  return opts[0];
}

/** "Sat 20 Sep" + " · 7:00 PM" when a time is set. */
export function formatDateOption(opt: Pick<PlanDateOption, "date" | "time">): string {
  const time = String(opt.time || "").trim();
  const d = new Date(`${opt.date}T${time || "12:00"}:00`);
  const datePart = Number.isNaN(d.getTime())
    ? opt.date
    : new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" }).format(d);
  if (!time) return datePart;
  const m = time.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return `${datePart} · ${time}`;
  let h = parseInt(m[1]!, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${datePart} · ${h}:${m[2]} ${ampm}`;
}

/** Pending join requests, oldest first. Host approves from this queue. */
export function pendingRequests(plan: Pick<HangoutPlan, "attendees">): PlanAttendee[] {
  return (plan.attendees || [])
    .filter((a) => a?.status === "pending")
    .sort((a, b) => String(a.respondedAt || "").localeCompare(String(b.respondedAt || "")));
}

/** Waitlist in promotion order: earliest response first. */
export function waitlistQueue(plan: Pick<HangoutPlan, "attendees">): PlanAttendee[] {
  return (plan.attendees || [])
    .filter((a) => a?.status === "waitlisted")
    .sort((a, b) => String(a.respondedAt || "").localeCompare(String(b.respondedAt || "")));
}

/** One shared-album photo, sourced from a photo comment on the plan. */
export interface PlanPhoto {
  commentId: string;
  url: string;
  caption: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

/** Newest-first album feed: every comment carrying a photo, tag prefix stripped. */
export function planPhotos(plan: Pick<HangoutPlan, "comments">): PlanPhoto[] {
  return (plan.comments || [])
    .filter((c) => c && c.photoUrl)
    .map((c) => ({
      commentId: c.id,
      url: String(c.photoUrl),
      caption: String(c.text || "").replace(/^\[(Meetup|Carpool|Tables|Photos)\]\s?/, "").trim(),
      authorId: String(c.authorId || ""),
      authorName: String(c.authorName || "Mate"),
      createdAt: String(c.createdAt || ""),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 1-based position in line, or null when not waitlisted. */
export function waitlistPosition(
  plan: Pick<HangoutPlan, "attendees">,
  attendeeId: string,
): number | null {
  const idx = waitlistQueue(plan).findIndex((a) => a.id === attendeeId);
  return idx < 0 ? null : idx + 1;
}

/** Creator or co-host: full management powers over the plan. */
export function isPlanManager(
  plan: Pick<HangoutPlan, "creator" | "coHostUids">,
  uid: string | null | undefined,
): boolean {
  if (!uid) return false;
  if (plan.creator?.uid && plan.creator.uid === uid) return true;
  return (plan.coHostUids || []).includes(uid);
}

/** Sanity cap — a plan needs hosts, not a committee. */
export const PLAN_COHOSTS_MAX = 5;

/** Co-host attendee rows (for badges and management), in RSVP order. */
export function coHostAttendees(plan: Pick<HangoutPlan, "attendees" | "coHostUids">): PlanAttendee[] {
  const set = new Set(plan.coHostUids || []);
  if (!set.size) return [];
  return (plan.attendees || []).filter((a) => a && set.has(a.id));
}

export interface PastCrewEntry {
  id: string;
  name: string;
  handle?: string;
  avatar?: string;
  /** Plans shared with the viewer. */
  sharedPlans: number;
  /** Latest RSVP timestamp across shared plans. */
  lastSeen: string;
}

/**
 * People you've already been out with, for re-invites: attendees across your
 * plans (excluding this plan's crew and yourself), ranked by shared plans
 * then recency. Device-local guest ids never leave the device.
 */
export function pastCrew(
  plans: Array<Pick<HangoutPlan, "id" | "attendees">>,
  selfUid: string | null | undefined,
  opts?: { excludeIds?: readonly string[]; excludePlanId?: string; limit?: number },
): PastCrewEntry[] {
  const excluded = new Set(opts?.excludeIds || []);
  const limit = Math.max(1, Math.min(20, Math.floor(Number(opts?.limit)) || 8));
  const byId = new Map<string, PastCrewEntry>();
  for (const p of plans || []) {
    if (!p || (opts?.excludePlanId && p.id === opts.excludePlanId)) continue;
    for (const a of p.attendees || []) {
      const id = String(a?.id || "").trim();
      if (!id || id === selfUid || excluded.has(id) || id.startsWith("anon-")) continue;
      const seen = String(a?.respondedAt || "");
      const prev = byId.get(id);
      if (prev) {
        prev.sharedPlans += 1;
        if (seen > prev.lastSeen) {
          prev.lastSeen = seen;
          prev.name = String(a?.name || prev.name);
          if (a?.handle) prev.handle = String(a.handle);
          if (a?.avatar) prev.avatar = String(a.avatar);
        }
      } else {
        byId.set(id, {
          id,
          name: String(a?.name || "Mate"),
          handle: a?.handle ? String(a.handle) : undefined,
          avatar: a?.avatar ? String(a.avatar) : undefined,
          sharedPlans: 1,
          lastSeen: seen,
        });
      }
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => b.sharedPlans - a.sharedPlans || b.lastSeen.localeCompare(a.lastSeen))
    .slice(0, limit);
}

export const PLAN_REVIEW_MAX = 500;

/** Star rating 1–5, or undefined when blank/invalid. */
export function normalizeRating(n: unknown): number | undefined {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v) || v < 1 || v > 5) return undefined;
  return v;
}

/** Review words, trimmed and clamped — blank becomes undefined. */
export function normalizeReview(text: unknown): string | undefined {
  const v = String(text || "").trim().slice(0, PLAN_REVIEW_MAX);
  return v || undefined;
}

/** Aggregate stars across going attendees who rated: average + count. */
export function planRatingSummary(plan: Pick<HangoutPlan, "attendees">): {
  average: number;
  count: number;
} {
  const ratings = (plan.attendees || [])
    .filter((a) => a?.status === "going")
    .map((a) => normalizeRating(a?.rating))
    .filter((r): r is number => r !== undefined);
  if (!ratings.length) return { average: 0, count: 0 };
  const sum = ratings.reduce((n, r) => n + r, 0);
  return { average: Math.round((sum / ratings.length) * 10) / 10, count: ratings.length };
}

/** How many showed (host-confirmed), regardless of RSVP status. */
export function checkedInCount(plan: Pick<HangoutPlan, "attendees">): number {
  return (plan.attendees || []).filter((a) => a?.checkedIn).length;
}

/** Host door check: flip one attendee's checked-in flag (stamp on, clear off). */
export function setAttendeeCheckedIn(
  attendees: readonly PlanAttendee[],
  attendeeId: string,
  on: boolean,
  now = new Date().toISOString(),
): PlanAttendee[] {
  return (attendees || []).map((a) => {
    if (!a || a.id !== attendeeId) return a;
    if (on) return { ...a, checkedIn: true, checkedInAt: now };
    const rest: PlanAttendee = { ...a };
    delete rest.checkedIn;
    delete rest.checkedInAt;
    return rest;
  });
}

export const ACTIVITY_INTERESTS = [
  { id: "family", label: "Family & Milestones" },
  { id: "celebration", label: "Celebration" },
  { id: "food", label: "Food & drink" },
  { id: "nightlife", label: "Nightlife" },
  { id: "outdoors", label: "Outdoors" },
  { id: "arts", label: "Arts & culture" },
  { id: "sport", label: "Sport" },
  { id: "music", label: "Live music" },
  { id: "markets", label: "Markets" },
] as const;

export type ActivityInterest = (typeof ACTIVITY_INTERESTS)[number]["id"];

/** Count of shared interest tags — the whole matching algorithm, kept simple. */
export function interestOverlap(a: readonly string[] | undefined, b: readonly string[] | undefined): number {
  if (!a?.length || !b?.length) return 0;
  const set = new Set(a.map((s) => s.toLowerCase()));
  let n = 0;
  for (const tag of b) if (set.has(tag.toLowerCase())) n += 1;
  return n;
}

/** Tags from the user's own plans — what "matches you" is measured against. */
export function myInterestProfile(
  plans: Array<{ interests?: string[]; attendees: Array<{ id: string }>; creator: { uid?: string } }>,
  uid?: string,
): string[] {
  const tags = new Set<string>();
  for (const p of plans) {
    const mine =
      (uid && (p.creator.uid === uid || p.attendees.some((a) => a.id === uid))) || (!uid && p.attendees.length > 0);
    if (mine) for (const t of p.interests || []) tags.add(t.toLowerCase());
  }
  return Array.from(tags);
}

export interface PlanTypeInfo {
  id: PlanType;
  label: string;
  emoji: string;
  category: "Life Milestone" | "Social Outing" | "Community";
  shortDesc: string;
  defaultTitle: string;
  suggestedStops: string[];
}

export const PLAN_TYPES: Record<PlanType, PlanTypeInfo> = {
  birthday: {
    id: "birthday",
    label: "Birthday Party",
    emoji: "🎂",
    category: "Life Milestone",
    shortDesc: "Birthday celebrations, milestone bashes & dinners",
    defaultTitle: "Birthday Celebration & Drinks",
    suggestedStops: ["Welcome & Cocktail Arrival", "Celebration Dinner & Speeches", "Birthday Cake & Dance Floor"],
  },
  wedding: {
    id: "wedding",
    label: "Wedding & Nuptials",
    emoji: "💍",
    category: "Life Milestone",
    shortDesc: "Wedding ceremony, reception, toasts & after-party",
    defaultTitle: "Wedding Ceremony & Reception",
    suggestedStops: [
      "Ceremony & Vows",
      "Cocktail Hour & Photos",
      "Dinner Reception & Speeches",
      "First Dance & Celebration",
    ],
  },
  graduation: {
    id: "graduation",
    label: "Graduation Ceremony",
    emoji: "🎓",
    category: "Life Milestone",
    shortDesc: "Education graduation, commencement & celebratory dinner",
    defaultTitle: "University Graduation & Family Dinner",
    suggestedStops: ["Commencement Ceremony & Stage Walk", "Campus Family Photos", "Graduation Toast & Dinner"],
  },
  housewarming: {
    id: "housewarming",
    label: "Housewarming",
    emoji: "🏡",
    category: "Life Milestone",
    shortDesc: "New home celebration, backyard BBQ & drinks",
    defaultTitle: "New Home Housewarming & BBQ",
    suggestedStops: ["House Tour & Welcome Drinks", "Backyard BBQ & Food", "Sunset Toast to New Memories"],
  },
  baby_shower: {
    id: "baby_shower",
    label: "Baby Shower & Birth",
    emoji: "👶",
    category: "Life Milestone",
    shortDesc: "Welcome baby, baby shower brunch, gender reveal & family blessings",
    defaultTitle: "Baby Shower Brunch & Celebration",
    suggestedStops: [
      "Welcome Refreshments & Grazing Table",
      "Baby Games & Gift Opening",
      "Celebration Cake & Family Toast",
    ],
  },
  memorial: {
    id: "memorial",
    label: "Memorial & Life Celebration",
    emoji: "🕊️",
    category: "Life Milestone",
    shortDesc: "Honouring a loved one, memorial service, wake & remembrance",
    defaultTitle: "Celebration of Life & Memorial Service",
    suggestedStops: ["Memorial Gathering & Tributes", "Remembrance Reception & Sharing Stories"],
  },
  anniversary: {
    id: "anniversary",
    label: "Anniversary & Jubilee",
    emoji: "🥂",
    category: "Life Milestone",
    shortDesc: "Milestone anniversaries, renewals & romantic dinner parties",
    defaultTitle: "Anniversary Celebration Dinner & Toast",
    suggestedStops: ["Anniversary Toast & Canapés", "Fine Dining Dinner", "Dessert & Speeches"],
  },
  nightout: {
    id: "nightout",
    label: "Night Out",
    emoji: "🍸",
    category: "Social Outing",
    shortDesc: "Rooftop drinks, pubs, craft beers & late night spots",
    defaultTitle: "Friday Night Out in The Rocks",
    suggestedStops: ["The Glenmore Rooftop Bar", "Fortune of War Sandstone Yard", "The Cut Bar & Grill"],
  },
  lunch: {
    id: "lunch",
    label: "Lunch & Bites",
    emoji: "🍕",
    category: "Social Outing",
    shortDesc: "Café brunches, sunny patios, bakeries & foodie spots",
    defaultTitle: "Weekend Harbour Lunch & Wine",
    suggestedStops: ["The Rocks Café", "Laneway Pour Specialty Coffee", "Quay Bao Dumplings"],
  },
  movies: {
    id: "movies",
    label: "Cinema & Movies",
    emoji: "🍿",
    category: "Social Outing",
    shortDesc: "Indie theatres, IMAX, popcorn & post-film dinner",
    defaultTitle: "Evening Movies & Late Bites",
    suggestedStops: ["Cinema Premiere", "Post-Movie Cocktails & Dessert"],
  },
  trip: {
    id: "trip",
    label: "Roadtrip & Trip",
    emoji: "🚗",
    category: "Social Outing",
    shortDesc: "Weekend getaways, coastal drives, beaches & scenic routes",
    defaultTitle: "Sydney to Blue Mountains Weekend Trip",
    suggestedStops: ["Breakfast Pitstop", "Scenic Lookout Vista", "Sunset Campfire Dinner"],
  },
  escape: {
    id: "escape",
    label: "Weekend Escape",
    emoji: "🌴",
    category: "Social Outing",
    shortDesc: "Coastal retreats, cabins, wine trails & nature getaways",
    defaultTitle: "Weekend Escape & Coastal Getaway",
    suggestedStops: ["Scenic Drive & Coffee Stop", "Cabin / Beachside Check-In", "Sunset Dinner & Firepit Drinks"],
  },
  gig: {
    id: "gig",
    label: "Live Music & Gigs",
    emoji: "🎸",
    category: "Social Outing",
    shortDesc: "Concerts, jazz nights, harbour sessions & DJ sets",
    defaultTitle: "Live Jazz & Harbour Session",
    suggestedStops: ["Pre-Show Drinks", "Live Stage & Main Act", "Late Night Supper"],
  },
  walk: {
    id: "walk",
    label: "Walk & Meetup",
    emoji: "☕",
    category: "Community",
    shortDesc: "Heritage precinct strolls, harbour views & coffee walks",
    defaultTitle: "Historic Rocks Walk & Coffee Catch-Up",
    suggestedStops: ["Morning Espresso Meetup", "Sandstone Laneways Walk", "Waterfront Gelato"],
  },
  catchup: {
    id: "catchup",
    label: "Catch Up & Coffee",
    emoji: "☕",
    category: "Social Outing",
    shortDesc: "Casual 1-on-1 coffee, drinks or lunch catch-up",
    defaultTitle: "Coffee & Catch Up",
    suggestedStops: ["Coffee & Catch Up", "Laneway Walk & Conversation"],
  },
  meeting: {
    id: "meeting",
    label: "Book a Meeting",
    emoji: "📅",
    category: "Social Outing",
    shortDesc: "1-on-1 sync, consultation or advisory session",
    defaultTitle: "1-on-1 Sync & Discussion",
    suggestedStops: ["Meeting & Discussion", "Next Steps & Wrap Up"],
  },
  custom: {
    id: "custom",
    label: "Custom Plan",
    emoji: "✨",
    category: "Community",
    shortDesc: "Design your own gathering, party, or celebration",
    defaultTitle: "Mates Catch-Up & Day Out",
    suggestedStops: ["Meeting Point", "Main Event"],
  },
};

export interface PlanCoverPreset {
  id: string;
  title: string;
  url: string;
  category: string;
}

export const PLAN_COVER_PRESETS: PlanCoverPreset[] = [
  {
    id: "coffee-catchup",
    title: "Coffee & Conversation",
    category: "Catch Up",
    url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "meeting-sync",
    title: "Meeting & Discussion",
    category: "Meeting",
    url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "birthday-cake",
    title: "Birthday Party & Sparkles",
    category: "Birthday",
    url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "wedding-celebration",
    title: "Wedding Garden & Florals",
    category: "Wedding",
    url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "graduation-caps",
    title: "Graduation Commencement",
    category: "Graduation",
    url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "housewarming-dinner",
    title: "Housewarming & Home Dinner",
    category: "Housewarming",
    url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "baby-shower-pastel",
    title: "Baby Shower & Welcome Baby",
    category: "Baby Shower",
    url: "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "memorial-peace",
    title: "Peaceful Memorial & Sunset",
    category: "Memorial",
    url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "anniversary-champagne",
    title: "Champagne Anniversary Toast",
    category: "Anniversary",
    url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "escape-beach",
    title: "Coastal Escape",
    category: "Weekend Escape",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "escape-cabin",
    title: "Cabin in the Pines",
    category: "Weekend Escape",
    url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "nightout-rooftop",
    title: "Sunset Rooftop",
    category: "Night Out",
    url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "trip-mountains",
    title: "Mountain Highway",
    category: "Roadtrip",
    url: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "lunch-brunch",
    title: "Sunny Patios & Bites",
    category: "Lunch",
    url: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "music-festival",
    title: "Live Music Session",
    category: "Gigs",
    url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
  },
];

export const PLAN_THEMES: Record<
  PlanTheme,
  {
    id: PlanTheme;
    name: string;
    /** Full-colour card background — the whole invite card takes this colour. */
    bgClass: string;
    borderClass: string;
    badgeClass: string;
    accentColor: string;
    foilGlow: string;
    /** Main text colour on the full-colour background. */
    onThemeClass: string;
    /** Secondary text colour on the full-colour background. */
    onThemeMutedClass: string;
  }
> = {
  gold: {
    id: "gold",
    name: "Luxury Gold",
    bgClass: "from-amber-400 via-amber-500 to-amber-600",
    borderClass: "border-amber-200/50 shadow-amber-600/30",
    badgeClass: "bg-amber-500/20 text-amber-300 ring-amber-500/40",
    accentColor: "#fbbf24",
    foilGlow: "rgba(251, 191, 36, 0.35)",
    onThemeClass: "text-white",
    onThemeMutedClass: "text-white/80",
  },
  champagne: {
    id: "champagne",
    name: "Champagne Elegance",
    bgClass: "from-amber-200 via-rose-300 to-amber-500",
    borderClass: "border-amber-100/60 shadow-amber-400/30",
    badgeClass: "bg-amber-300/30 text-amber-950 ring-amber-200/50",
    accentColor: "#fde68a",
    foilGlow: "rgba(253, 230, 138, 0.4)",
    onThemeClass: "text-zinc-950",
    onThemeMutedClass: "text-zinc-900/80",
  },
  celestial: {
    id: "celestial",
    name: "Celestial Silver",
    bgClass: "from-slate-300 via-sky-300 to-indigo-400",
    borderClass: "border-white/50 shadow-sky-400/30",
    badgeClass: "bg-white/30 text-slate-900 ring-white/50",
    accentColor: "#cbd5e1",
    foilGlow: "rgba(203, 213, 225, 0.4)",
    onThemeClass: "text-zinc-950",
    onThemeMutedClass: "text-zinc-900/80",
  },
  midnight: {
    id: "midnight",
    name: "Cyber Midnight",
    bgClass: "from-indigo-500 via-indigo-600 to-blue-800",
    borderClass: "border-indigo-300/40 shadow-indigo-600/30",
    badgeClass: "bg-indigo-500/20 text-indigo-300 ring-indigo-500/40",
    accentColor: "#818cf8",
    foilGlow: "rgba(129, 140, 248, 0.35)",
    onThemeClass: "text-white",
    onThemeMutedClass: "text-white/75",
  },
  sunset: {
    id: "sunset",
    name: "Sunset Rose",
    bgClass: "from-rose-500 via-rose-600 to-pink-700",
    borderClass: "border-rose-200/40 shadow-rose-600/30",
    badgeClass: "bg-rose-500/20 text-rose-300 ring-rose-500/40",
    accentColor: "#fb7185",
    foilGlow: "rgba(251, 113, 133, 0.35)",
    onThemeClass: "text-white",
    onThemeMutedClass: "text-white/80",
  },
  emerald: {
    id: "emerald",
    name: "Botanic Emerald",
    bgClass: "from-emerald-500 via-emerald-600 to-teal-700",
    borderClass: "border-emerald-200/40 shadow-emerald-600/30",
    badgeClass: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40",
    accentColor: "#34d399",
    foilGlow: "rgba(52, 211, 153, 0.35)",
    onThemeClass: "text-white",
    onThemeMutedClass: "text-white/80",
  },
  holographic: {
    id: "holographic",
    name: "Holographic VIP",
    bgClass: "from-cyan-400 via-sky-500 to-blue-600",
    borderClass: "border-cyan-100/50 shadow-cyan-500/30",
    badgeClass: "bg-cyan-400/20 text-cyan-200 ring-cyan-300/50",
    accentColor: "#a5f3fc",
    foilGlow: "rgba(165, 243, 252, 0.4)",
    onThemeClass: "text-white",
    onThemeMutedClass: "text-white/85",
  },
  hotpink: {
    id: "hotpink",
    name: "Hot Pink",
    bgClass: "from-pink-500 via-pink-600 to-fuchsia-700",
    borderClass: "border-pink-200/40 shadow-pink-600/30",
    badgeClass: "bg-pink-500/20 text-pink-200 ring-pink-400/40",
    accentColor: "#f9a8d4",
    foilGlow: "rgba(249, 168, 212, 0.4)",
    onThemeClass: "text-white",
    onThemeMutedClass: "text-white/80",
  },
  fluro: {
    id: "fluro",
    name: "Fluro Green",
    bgClass: "from-lime-300 via-lime-400 to-green-500",
    borderClass: "border-lime-100/60 shadow-lime-500/30",
    badgeClass: "bg-lime-300/30 text-lime-950 ring-lime-100/50",
    accentColor: "#00e676",
    foilGlow: "rgba(0, 230, 118, 0.35)",
    onThemeClass: "text-zinc-950",
    onThemeMutedClass: "text-zinc-900/75",
  },
  jetblack: {
    id: "jetblack",
    name: "Jet Black",
    bgClass: "from-zinc-700 via-zinc-900 to-black",
    borderClass: "border-white/20 shadow-black/50",
    badgeClass: "bg-white/10 text-zinc-200 ring-white/25",
    accentColor: "#a1a1aa",
    foilGlow: "rgba(255, 255, 255, 0.14)",
    onThemeClass: "text-white",
    onThemeMutedClass: "text-white/70",
  },
};

/** Coerce untrusted input to a real invitation theme; unknown values fall back to gold. */
export function resolvePlanTheme(input: unknown): PlanTheme {
  return typeof input === "string" && input in PLAN_THEMES ? (input as PlanTheme) : "gold";
}

export function planInviteUrl(planId: string, origin = "", inviteCode?: string): string {
  const base = origin.replace(/\/+$/, "");
  if (inviteCode) return `${base}/invite/${inviteCode}`;
  return `${base}/plan/${planId}`;
}

export function planInviteCodeUrl(inviteCode: string, origin = ""): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/invite/${inviteCode}`;
}

export function formatPlanDate(dateStr: string, timeStr: string): string {
  try {
    const d = new Date(`${dateStr}T${timeStr}:00`);
    if (Number.isNaN(d.getTime())) return `${dateStr} at ${timeStr}`;
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return `${dateStr} ${timeStr}`;
  }
}

export function formatTime12h(timeStr?: string): string {
  if (!timeStr) return "";
  const trimmed = timeStr.trim();
  if (!trimmed) return "";
  if (/am|pm/i.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return trimmed;
  let hours = parseInt(match[1]!, 10);
  const minutes = match[2];
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

/** Reorder stops by moving the stop at `fromIndex` to `toIndex`. Out-of-range indices return the list unchanged. */
/**
 * D4 — trip itinerary days in order. Drops malformed entries, sorts by
 * dayNumber, and renumbers sequentially so trip views never show day gaps.
 */
export function scheduleDays(schedule: readonly PlanMultiDaySchedule[] | undefined): PlanMultiDaySchedule[] {
  if (!schedule) return [];
  return schedule
    .filter((d) => d && Number.isFinite(d.dayNumber) && d.dayNumber >= 1 && d.title.trim())
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((d, i) => ({ ...d, dayNumber: i + 1 }));
}

/** D4 — a plan carries a trip itinerary worth rendering as day views. */
export function hasTripItinerary(plan: Pick<HangoutPlan, "type" | "multiDaySchedule">): boolean {
  return (plan.type === "trip" || plan.type === "escape") && scheduleDays(plan.multiDaySchedule).length > 0;
}

export function reorderStops<T>(stops: readonly T[], fromIndex: number, toIndex: number): T[] {
  const next = [...stops];
  if (fromIndex < 0 || fromIndex >= next.length || toIndex < 0 || toIndex >= next.length) return next;
  if (fromIndex === toIndex) return next;
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved!);
  return next;
}

export type StopChangeAction = "added" | "updated" | "removed" | "reordered" | "voted";

/** Every collaborator involved in the itinerary: attendee IDs plus follower/subscriber IDs, deduped. */
export function stopChangeRecipients(plan: Pick<HangoutPlan, "attendees" | "subscribers">): string[] {
  const ids = new Set<string>();
  for (const a of plan.attendees || []) {
    if (a?.id) ids.add(a.id);
  }
  for (const s of plan.subscribers || []) {
    if (s) ids.add(s);
  }
  return Array.from(ids);
}

/** Human-readable summary of a stop change, used for collaborator notifications. */
export function buildStopChangeMessage(action: StopChangeAction, stopName: string, actorName?: string): string {
  const actor = actorName?.trim() ? ` by ${actorName.trim()}` : "";
  switch (action) {
    case "added":
      return `New stop added: "${stopName}"${actor}`;
    case "updated":
      return `Stop updated: "${stopName}"${actor}`;
    case "removed":
      return `Stop removed: "${stopName}"${actor}`;
    case "reordered":
      return `Itinerary order changed${actor}`;
    case "voted":
      return `Vote added for "${stopName}"${actor}`;
  }
}

export function randomInviteCode(length = 6): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let res = "";
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export function isValidPlan(plan: unknown): plan is HangoutPlan {
  if (!plan || typeof plan !== "object") return false;
  const p = plan as Partial<HangoutPlan>;
  return Boolean(
    p.id &&
    typeof p.title === "string" &&
    typeof p.type === "string" &&
    typeof p.theme === "string" &&
    typeof p.date === "string" &&
    typeof p.time === "string" &&
    Array.isArray(p.stops) &&
    Array.isArray(p.attendees),
  );
}

export const SEED_PLANS: HangoutPlan[] = [
  {
    id: "plan-birthday-celebration",
    title: "Liam's 30th Birthday Celebration & Rooftop",
    type: "birthday",
    theme: "champagne",
    creator: {
      uid: "user-liam",
      name: "Liam",
      handle: "liam",
      isAnonymous: false,
    },
    date: "2026-09-26",
    time: "17:00",
    endTime: "23:30",
    datetime: "2026-09-26T17:00:00+10:00",
    city: "Sydney",
    destination: "Barangaroo & The Rocks",
    heroImage: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80",
    notes:
      "Turning 30! Join us for sunset cocktails, dinner, birthday cake, and rooftop dance floor. Dress code: Smart Casual.",
    stops: [
      {
        id: "stop-bday-1",
        name: "Welcome Cocktails & Grazing",
        time: "17:00",
        address: "Barangaroo Foreshore",
        notes: "Arrival drinks and mingling as everyone gathers",
        addedByName: "Liam",
        votes: 5,
        icon: "toast",
      },
      {
        id: "stop-bday-2",
        name: "Birthday Dinner & Speeches",
        time: "19:00",
        address: "The Rocks Waterfront Restaurant",
        notes: "Shared dining banquet and toasts",
        addedByName: "Liam",
        votes: 4,
        icon: "food",
      },
      {
        id: "stop-bday-3",
        name: "Birthday Cake Cutting & Party",
        time: "21:00",
        notes: "Cake cutting, music, and celebration",
        addedByName: "Liam",
        votes: 6,
        icon: "cake",
      },
    ],
    attendees: [
      {
        id: "user-liam",
        name: "Liam",
        handle: "liam",
        status: "going",
        respondedAt: "2026-09-12T10:00:00Z",
      },
      {
        id: "user-sam",
        name: "Sam",
        handle: "sambondi",
        status: "going",
        respondedAt: "2026-09-12T10:30:00Z",
      },
      {
        id: "user-alex",
        name: "Alex",
        handle: "alex",
        status: "going",
        respondedAt: "2026-09-12T11:00:00Z",
      },
    ],
    comments: [
      {
        id: "msg-bday-1",
        authorId: "user-liam",
        authorName: "Liam",
        text: "Can't wait to see everyone! Let me know any dietary requirements.",
        createdAt: "2026-09-12T11:05:00Z",
      },
    ],
    subscribers: ["liam@mates.io"],
    inviteCode: "BDAY30",
    isPublic: true,
    status: "open",
    interests: ["celebration", "food", "nightlife"],
    createdAt: "2026-09-12T09:00:00Z",
    updatedAt: "2026-09-12T11:05:00Z",
  },
  {
    id: "plan-wedding-harbour",
    title: "Sarah & David's Wedding Ceremony & Reception",
    type: "wedding",
    theme: "gold",
    creator: {
      uid: "user-sarah",
      name: "Sarah & David",
      handle: "sarahd",
      isAnonymous: false,
    },
    date: "2026-10-10",
    time: "15:00",
    endTime: "23:00",
    datetime: "2026-10-10T15:00:00+10:00",
    city: "Sydney",
    destination: "Royal Botanic Garden & Harbour Foreshore",
    heroImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
    notes:
      "We invite you to celebrate our wedding day with ceremony, cocktail garden reception, and evening banquet dinner under the stars.",
    stops: [
      {
        id: "stop-wed-1",
        name: "Wedding Ceremony & Vows Exchange",
        time: "15:00",
        address: "Royal Botanic Garden Lawn",
        notes: "Please arrive 15 minutes prior for seating",
        icon: "ceremony",
      },
      {
        id: "stop-wed-2",
        name: "Champagne Lawn & Photography",
        time: "16:15",
        notes: "Canapés, live strings quartet, and portraits",
        icon: "toast",
      },
      {
        id: "stop-wed-3",
        name: "Dinner Banquet, Speeches & First Dance",
        time: "18:30",
        address: "Harbour Dining Pavilion",
        notes: "Dinner banquet, family speeches, followed by dancing",
        icon: "food",
      },
    ],
    attendees: [
      {
        id: "user-sarah",
        name: "Sarah (Host)",
        status: "going",
        respondedAt: "2026-09-10T09:00:00Z",
      },
      {
        id: "user-alex",
        name: "Alex",
        status: "going",
        respondedAt: "2026-09-10T12:00:00Z",
      },
    ],
    comments: [],
    subscribers: ["sarah@airpal.me"],
    inviteCode: "WEDDAY",
    isPublic: true,
    status: "open",
    interests: ["celebration", "family", "food"],
    createdAt: "2026-09-10T08:00:00Z",
    updatedAt: "2026-09-10T12:00:00Z",
  },
  {
    id: "plan-housewarming-harbour",
    title: "Sunny New Home Housewarming & Terrace BBQ",
    type: "housewarming",
    theme: "emerald",
    creator: {
      uid: "user-chloe",
      name: "Chloe & Mark",
      isAnonymous: false,
    },
    date: "2026-10-04",
    time: "14:00",
    endTime: "19:00",
    datetime: "2026-10-04T14:00:00+10:00",
    city: "Sydney",
    destination: "Balmain / The Rocks Peninsula",
    heroImage: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
    notes:
      "We finally moved in! Come over to celebrate our new place with terrace drinks, Aussie BBQ, and sunset views.",
    stops: [
      {
        id: "stop-hw-1",
        name: "Welcome & House Tour",
        time: "14:00",
        notes: "Grab a drink and check out the new place",
        icon: "home",
      },
      {
        id: "stop-hw-2",
        name: "Terrace BBQ & Grazing Feast",
        time: "15:30",
        notes: "Gourmet burgers, salads, craft beers and wine",
        icon: "food",
      },
    ],
    attendees: [
      {
        id: "user-chloe",
        name: "Chloe",
        status: "going",
        respondedAt: "2026-09-11T10:00:00Z",
      },
      {
        id: "user-sam",
        name: "Sam",
        status: "going",
        respondedAt: "2026-09-11T11:00:00Z",
      },
    ],
    comments: [],
    subscribers: ["chloe@mates.io"],
    inviteCode: "NEWHOM",
    isPublic: true,
    status: "open",
    interests: ["celebration", "food", "outdoors"],
    createdAt: "2026-09-11T09:00:00Z",
    updatedAt: "2026-09-11T11:00:00Z",
  },
  {
    id: "plan-rocks-night-out",
    title: "Friday Night Out in The Rocks",
    type: "nightout",
    theme: "gold",
    creator: {
      uid: "user-alex",
      name: "Alex",
      handle: "alex",
      isAnonymous: false,
    },
    date: "2026-09-18",
    time: "18:30",
    datetime: "2026-09-18T18:30:00+10:00",
    city: "Sydney",
    destination: "The Rocks, Sydney Harbour",
    heroImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    notes:
      "Meeting up for sunset rooftop drinks, sandstone pub dining, and live acoustic music down the cobblestone lanes!",
    stops: [
      {
        id: "stop-1",
        name: "The Glenmore Rooftop",
        time: "18:30",
        placeId: "glenmore",
        address: "96 Cumberland St, The Rocks",
        notes: "Rooftop golden hour with Opera House views. 15% AirPal guest perk.",
        addedByName: "Alex",
        votes: 4,
        voterUids: ["user-alex", "user-sam", "guest-chloe", "guest-liam"],
        icon: "drinks",
      },
      {
        id: "stop-2",
        name: "Fortune of War",
        time: "20:00",
        placeId: "fortune-of-war",
        address: "137 George St, The Rocks",
        notes: "Sydney's oldest sandstone beer garden for dinner & craft ales.",
        addedByName: "Sam",
        votes: 3,
        voterUids: ["user-sam", "user-alex", "guest-chloe"],
        icon: "food",
      },
      {
        id: "stop-3",
        name: "The Rocks Laneway Jazz",
        time: "21:30",
        notes: "Late acoustic jam & live music under the arches.",
        addedByName: "Mia",
        votes: 5,
        voterUids: ["user-alex", "user-sam", "guest-chloe", "guest-liam", "user-jordan"],
        icon: "music",
      },
    ],
    attendees: [
      {
        id: "user-alex",
        name: "Alex",
        handle: "alex",
        status: "going",
        respondedAt: "2026-09-11T12:00:00Z",
      },
      {
        id: "user-sam",
        name: "Sam",
        handle: "sambondi",
        status: "going",
        respondedAt: "2026-09-11T12:30:00Z",
      },
      {
        id: "guest-chloe",
        name: "Chloe",
        status: "going",
        isAnonymous: true,
        respondedAt: "2026-09-11T13:10:00Z",
      },
      {
        id: "guest-liam",
        name: "Liam",
        status: "maybe",
        isAnonymous: true,
        notes: "Finishing work around 7pm, will catch up at Fortune of War!",
        respondedAt: "2026-09-11T14:00:00Z",
      },
    ],
    comments: [
      {
        id: "msg-1",
        authorId: "user-alex",
        authorName: "Alex",
        authorHandle: "alex",
        text: "Table is booked upstairs near the harbour view deck! See everyone at 6:30pm 🍸",
        createdAt: "2026-09-11T14:15:00Z",
      },
      {
        id: "msg-2",
        authorId: "user-sam",
        authorName: "Sam",
        authorHandle: "sambondi",
        text: "Awesome! I'll be there on time. Can't wait!",
        createdAt: "2026-09-11T14:22:00Z",
      },
    ],
    subscribers: ["chloe@mates.io", "liam@mates.io"],
    inviteCode: "ROCKS7",
    isPublic: true,
    status: "open",
    interests: ["nightlife", "food", "music"],
    createdAt: "2026-09-11T11:00:00Z",
    updatedAt: "2026-09-11T14:22:00Z",
  },
  {
    id: "plan-sunday-harbour-lunch",
    title: "Sunday Harbour Lunch & Walk",
    type: "lunch",
    theme: "emerald",
    creator: {
      uid: "user-jordan",
      name: "Jordan",
      handle: "jordan",
      isAnonymous: false,
    },
    date: "2026-09-20",
    time: "12:00",
    datetime: "2026-09-20T12:00:00+10:00",
    city: "Sydney",
    destination: "Circular Quay & The Rocks",
    heroImage: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=1200&q=80",
    notes: "Easy Sunday brunch, specialty coffee, and a sunny stroll around the harbour foreshore.",
    stops: [
      {
        id: "stop-lunch-1",
        name: "Laneway Pour Coffee",
        time: "12:00",
        address: "Playfair St, The Rocks",
        notes: "Pre-brunch flat whites.",
        addedByName: "Jordan",
        votes: 2,
        icon: "coffee",
      },
      {
        id: "stop-lunch-2",
        name: "The Rocks Weekend Market & Food Stalls",
        time: "12:45",
        placeId: "evt-rocks-market",
        address: "George & Playfair St",
        notes: "Pork bao, street paella, artisanal treats.",
        addedByName: "Jordan",
        votes: 3,
        icon: "food",
      },
    ],
    attendees: [
      {
        id: "user-jordan",
        name: "Jordan",
        handle: "jordan",
        status: "going",
        respondedAt: "2026-09-11T10:00:00Z",
      },
      {
        id: "guest-olivia",
        name: "Olivia",
        status: "going",
        isAnonymous: true,
        respondedAt: "2026-09-11T11:20:00Z",
      },
    ],
    comments: [],
    subscribers: ["jordan@airpal.me"],
    inviteCode: "SUNLUN",
    isPublic: true,
    status: "open",
    interests: ["food", "outdoors", "markets"],
    createdAt: "2026-09-11T09:30:00Z",
    updatedAt: "2026-09-11T11:20:00Z",
  },
  {
    id: "plan-bali-surf-yoga-retreat",
    title: "5-Day Bali Surf & Yoga Sanctuary Retreat",
    type: "escape",
    theme: "sunset",
    creator: {
      uid: "user-maya",
      name: "Maya & Wayan",
      handle: "mayabali",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      isAnonymous: false,
    },
    date: "2026-11-05",
    endDate: "2026-11-10",
    time: "14:00",
    datetime: "2026-11-05T14:00:00+08:00",
    city: "Bali",
    destination: "Canggu & Uluwatu, Bali",
    heroImage: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
    notes:
      "An all-inclusive 5-day tropical escape featuring daily sunrise vinyasa, guided reef surf coaching, organic chef-prepared meals, sound healing, and luxury private pool villa stays.",
    isExperience: true,
    experienceCategory: "retreat",
    durationMode: "multi_day",
    pricingModel: "deposit",
    pricePerPerson: 1450,
    currency: "AUD",
    capacity: 12,
    spotsBooked: 7,
    depositConfig: {
      depositAmount: 250,
      balanceDueDaysBefore: 14,
    },
    pricingTiers: [
      {
        id: "tier-shared",
        name: "Deluxe Shared Villa Suite",
        description: "Shared master suite with 2 queen beds, outdoor tropical shower & pool access.",
        price: 1450,
        capacity: 8,
        spotsBooked: 5,
      },
      {
        id: "tier-private",
        name: "Private Ocean-View Villa",
        description: "King bed, private plunge pool, daily in-villa massage & VIP airport transfer.",
        price: 2150,
        capacity: 4,
        spotsBooked: 2,
      },
    ],
    inclusions: {
      included: [
        "5 nights in 5-star eco-luxury villa",
        "Daily morning yoga & sunset sound bath",
        "3 daily organic chef-prepared meals & fresh juices",
        "Guided surf lessons with video analysis",
        "Return Denpasar (DPS) airport transfers",
      ],
      notIncluded: ["International flights to Bali", "Comprehensive travel insurance"],
      whatToBring: [
        "Swimwear & rash guard",
        "Reef-safe sunscreen & sunglasses",
        "Light summer clothes & personal toiletries",
      ],
    },
    multiDaySchedule: [
      {
        dayNumber: 1,
        title: "Arrival, Villa Welcome & Sunset Blessing",
        description: "Check-in at our Canggu jungle villa, welcome mocktails and Balinese flower blessing.",
        stops: [
          {
            id: "b1",
            name: "Denpasar Airport VIP Pickup",
            time: "14:00",
            icon: "stay",
            notes: "Private AC shuttle to Canggu sanctuary",
          },
          {
            id: "b2",
            name: "Villa Check-in & Fresh Young Coconuts",
            time: "16:00",
            icon: "home",
            notes: "Unpack and explore the pool grounds",
          },
          {
            id: "b3",
            name: "Opening Circle & Balinese Sunset Banquet",
            time: "18:30",
            icon: "food",
            notes: "Traditional organic Indonesian feast",
          },
        ],
      },
      {
        dayNumber: 2,
        title: "Sunrise Flow & Guided Surf Coaching",
        description:
          "Morning ocean breathwork, breakfast bowls, and video-analyzed beginner-to-intermediate surf session.",
        stops: [
          {
            id: "b4",
            name: "Sunrise Ocean Yoga Flow",
            time: "07:00",
            icon: "sight",
            notes: "75-min rejuvenating vinyasa flow",
          },
          {
            id: "b5",
            name: "Batu Bolong Surf Coaching",
            time: "09:30",
            icon: "walk",
            notes: "2 hours guided in-water surf lessons",
          },
          {
            id: "b6",
            name: "Plant-based Grazing Lunch",
            time: "13:00",
            icon: "food",
            notes: "Fresh tropical poke and dragonfruit smoothies",
          },
        ],
      },
      {
        dayNumber: 3,
        title: "Uluwatu Cliffs & Sound Healing Sanctuary",
        description: "Day excursion to the scenic southern cliffs, crystal sound bath, and seafood sunset dinner.",
        stops: [
          {
            id: "b7",
            name: "Pyramids of Chi Sound Bath",
            time: "11:00",
            icon: "music",
            notes: "Ancient Tibetan singing bowls & gong journey",
          },
          {
            id: "b8",
            name: "Jimbaran Bay Sunset Seafood Feast",
            time: "18:00",
            icon: "food",
            notes: "Candlelit beach dining with waves at your feet",
          },
        ],
      },
    ],
    stops: [
      {
        id: "b1",
        name: "Villa Check-in & Welcome",
        time: "16:00",
        icon: "home",
        notes: "Check-in and welcome coconuts",
      },
      {
        id: "b2",
        name: "Opening Circle & Sunset Dinner",
        time: "18:30",
        icon: "food",
        notes: "Traditional Balinese dinner",
      },
    ],
    attendees: [
      { id: "user-maya", name: "Maya", status: "going", respondedAt: "2026-09-10T10:00:00Z" },
      { id: "guest-emma", name: "Emma", status: "going", isAnonymous: false, respondedAt: "2026-09-11T12:00:00Z" },
    ],
    comments: [],
    subscribers: ["maya@baliretreat.io"],
    inviteCode: "BALIY5",
    isPublic: true,
    status: "open",
    interests: ["outdoors", "food", "celebration"],
    createdAt: "2026-09-10T10:00:00Z",
    updatedAt: "2026-09-12T15:00:00Z",
  },
  {
    id: "plan-sydney-laneway-tasting-tour",
    title: "Secret Laneways & Craft Cocktail Food Crawl",
    type: "nightout",
    theme: "celestial",
    creator: {
      uid: "user-liam",
      name: "Liam Foster",
      handle: "liamtours",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
      isAnonymous: false,
    },
    date: "2026-09-26",
    time: "18:00",
    datetime: "2026-09-26T18:00:00+10:00",
    city: "Sydney",
    destination: "Surry Hills, Sydney",
    heroImage: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80",
    notes:
      "A 3.5-hour hosted evening tasting crawl through Surry Hills' hidden speakeasies, artisan tapas bars, and underground jazz lounges.",
    isExperience: true,
    experienceCategory: "tour",
    durationMode: "single_day",
    pricingModel: "fixed",
    pricePerPerson: 65,
    currency: "AUD",
    capacity: 10,
    spotsBooked: 6,
    inclusions: {
      included: [
        "3 bespoke craft cocktail tastings",
        "4 curated gourmet share tapas plates",
        "Expert local foodie host & history commentary",
        "VIP reserved lounge seating at all venues",
      ],
      notIncluded: ["Extra cocktails beyond scheduled tastings"],
      whatToBring: ["Valid 18+ photo ID", "Comfortable walking shoes"],
    },
    stops: [
      {
        id: "t1",
        name: "The Clock Speakeasy Greeting",
        time: "18:00",
        address: "470 Crown St, Surry Hills",
        icon: "drinks",
        notes: "Welcome signature gin fizz tasting",
      },
      {
        id: "t2",
        name: "El Loco Tacos & Mezcal Pairing",
        time: "19:00",
        address: "64 Foveaux St, Surry Hills",
        icon: "food",
        notes: "Slow-cooked carnitas & smoked mezcal",
      },
      {
        id: "t3",
        name: "Low 302 Vinyl & Jazz Lounge",
        time: "20:30",
        address: "302 Crown St, Surry Hills",
        icon: "music",
        notes: "Dessert cocktail & live vinyl jazz tunes",
      },
    ],
    attendees: [
      { id: "user-liam", name: "Liam", status: "going", respondedAt: "2026-09-11T10:00:00Z" },
      { id: "guest-chloe", name: "Chloe", status: "going", isAnonymous: false, respondedAt: "2026-09-12T11:00:00Z" },
    ],
    comments: [],
    subscribers: ["liam@sydneytours.com"],
    inviteCode: "CRAWL7",
    isPublic: true,
    status: "open",
    interests: ["food", "nightlife", "music"],
    createdAt: "2026-09-11T10:00:00Z",
    updatedAt: "2026-09-12T12:00:00Z",
  },
];

// Plan Callable API Contracts
export interface CreatePlanRequest {
  id?: string;
  title: string;
  type: PlanType;
  theme: PlanTheme | string;
  date: string;
  time: string;
  endTime?: string;
  city?: string;
  destination?: string;
  heroImage?: string;
  notes?: string;
  isPublic?: boolean;
  interests?: string[];
  initialStops?: Array<{
    name: string;
    time?: string;
    notes?: string;
    icon?: string;
    placeId?: string;
    address?: string;
  }>;
  isExperience?: boolean;
  experienceCategory?: ExperienceCategory;
  durationMode?: "single_day" | "multi_day";
  endDate?: string;
  pricingModel?: PricingModel;
  pricePerPerson?: number;
  currency?: string;
  capacity?: number;
  depositConfig?: PlanDepositConfig;
  pricingTiers?: PlanPricingTier[];
  inclusions?: PlanInclusions;
  bookingPolicy?: PlanBookingPolicy;
}

export interface CreatePlanResponse {
  ok: true;
  plan: HangoutPlan;
}

export interface RsvpPlanRequest {
  planId: string;
  status: PlanAttendeeStatus;
  guestName?: string;
  notes?: string;
}

export interface RsvpPlanResponse {
  ok: true;
  attendee: PlanAttendee;
}

export interface AddPlanStopRequest {
  planId: string;
  name: string;
  time?: string;
  notes?: string;
  placeId?: string;
  icon?: string;
  address?: string;
}

export interface AddPlanStopResponse {
  ok: true;
  stop: PlanStop;
}

export interface VotePlanStopRequest {
  planId: string;
  stopId: string;
}

export interface VotePlanStopResponse {
  ok: true;
  votes: number;
  voted: boolean;
}

export interface VoteDateOptionRequest {
  planId: string;
  optionId: string;
}

export interface VoteDateOptionResponse {
  ok: true;
  votes: number;
  voted: boolean;
}

export interface PostPlanCommentRequest {
  planId: string;
  text: string;
  photoUrl?: string;
}

export interface PostPlanCommentResponse {
  ok: true;
  comment: PlanComment;
}

export interface CompletePlanRequest {
  planId: string;
}

export interface CompletePlanResponse {
  ok: true;
  planId: string;
  status: "completed";
  completedAt: string;
}

/** Only a live plan can close the loop — drafts, cancelled, and already-completed plans cannot. */
export const COMPLETABLE_PLAN_STATUSES: readonly PlanStatus[] = ["open", "confirmed"];

export function canCompletePlanStatus(status: PlanStatus): boolean {
  return COMPLETABLE_PLAN_STATUSES.includes(status);
}

/** Only a live plan can be cancelled — drafts, completed, and already-cancelled plans cannot. */
export const CANCELLABLE_PLAN_STATUSES: readonly PlanStatus[] = ["open", "confirmed"];

export function canCancelPlanStatus(status: PlanStatus): boolean {
  return CANCELLABLE_PLAN_STATUSES.includes(status);
}

export interface GetPlanByInviteCodeRequest {
  inviteCode: string;
}

export interface GetPlanByInviteCodeResponse {
  ok: true;
  plan: HangoutPlan;
}

/**
 * Public proof counters for the home hero. Aggregates only — no plan bodies,
 * no names — so guests can see the loop is alive without reading anyone's plans.
 */
export interface ExperienceProofResponse {
  ok: true;
  /** Plans with status completed (all cities; Sydney beachhead dominates). */
  completed: number;
  /** Plans currently open or confirmed and joinable. */
  live: number;
}

/**
 * Plan-form `?date=` prefill. Valid YYYY-MM-DD on/after the zoned today
 * wins; anything else falls back to today (never a past or malformed date).
 */
export function initialPlanDate(param: string | null, today: string): string {
  if (param && /^\d{4}-\d{2}-\d{2}$/.test(param) && param >= today) return param;
  return today;
}

/** Plan-form `?time=` prefill. Valid 24h HH:MM wins, else the fallback. */
export function initialPlanTime(param: string | null, fallback: string): string {
  if (param && /^([01]\d|2[0-3]):[0-5]\d$/.test(param)) return param;
  return fallback;
}
