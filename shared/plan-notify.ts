import type { HangoutPlan, PlanAttendee, PlanAttendeeStatus } from "./plan";
import { headcountTaken, normalizePlusOnes } from "./plan";

/**
 * Plan-layer broadcast + reminders (P0: plan → show up).
 *
 * A host broadcasts to "going" attendees; the server fans out to the inbox +
 * push via the existing notification plumbing. Auto reminders fire day-before
 * and day-of. Pure helpers here; Functions own the sends.
 */

export const PLAN_BROADCAST_TITLE_MAX = 80;
export const PLAN_BROADCAST_BODY_MAX = 280;

/** Mirrors the Circle broadcast cap — a plan blast is a small trusted audience, never everyone. */
export const PLAN_BROADCAST_CAP = 250;

export type PlanReminderKind = "day-before" | "day-of";

export interface PlanBroadcastInput {
  title: unknown;
  body: unknown;
}

/** Same caps as Circle announcements: short note, not a newsletter. */
export function validatePlanBroadcast(input: PlanBroadcastInput): string[] {
  const errors: string[] = [];
  const title = String(input.title || "").trim();
  const body = String(input.body || "").trim();
  if (!title) errors.push("Title is required.");
  if (title.length > PLAN_BROADCAST_TITLE_MAX) errors.push("Title must be 80 characters or fewer.");
  if (!body) errors.push("Message is required.");
  if (body.length > PLAN_BROADCAST_BODY_MAX) errors.push("Message must be 280 characters or fewer.");
  return errors;
}

/**
 * Uids that should receive a plan blast or reminder: "going" attendees only.
 * Skips the sender, empties, duplicates, and device-local guest ids
 * (`anon-…`) that no account can read — over the cap, oldest RSVPs win.
 */
export function planBroadcastRecipients(plan: Pick<HangoutPlan, "attendees">, senderUid?: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const a of plan.attendees || []) {
    const id = String(a?.id || "").trim();
    if (!id || id === senderUid || seen.has(id)) continue;
    if (a?.status !== "going") continue;
    if (id.startsWith("anon-")) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= PLAN_BROADCAST_CAP) break;
  }
  return out;
}

function parseDay(dayStr: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayStr.trim());
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Which auto reminder (if any) a plan date earns against a zoned "today".
 * Both inputs are YYYY-MM-DD calendar dates — pure calendar math, no clock.
 */
export function planReminderKind(input: { planDate: string; todayStr: string }): PlanReminderKind | null {
  const planMs = parseDay(input.planDate);
  const todayMs = parseDay(input.todayStr);
  if (planMs === null || todayMs === null) return null;
  const diffDays = Math.round((planMs - todayMs) / 86400000);
  if (diffDays === 1) return "day-before";
  if (diffDays === 0) return "day-of";
  return null;
}

/** Reminder stamps live on the plan, keyed by the plan date they were sent for. */
export function reminderAlreadySent(
  plan: Pick<HangoutPlan, "date" | "remindersSent">,
  kind: PlanReminderKind,
): boolean {
  const stamp = kind === "day-before" ? plan.remindersSent?.dayBefore : plan.remindersSent?.dayOf;
  return Boolean(stamp && stamp === plan.date);
}

export function buildPlanReminder(
  plan: Pick<HangoutPlan, "title" | "date" | "time" | "destination">,
  kind: PlanReminderKind,
): { title: string; body: string } {
  const when = kind === "day-before" ? "tomorrow" : "today";
  const where = plan.destination ? ` · ${plan.destination}` : "";
  return {
    title: `${kind === "day-before" ? "Tomorrow" : "Today"}: ${plan.title}`,
    body: `Going ${when}${plan.time ? ` at ${plan.time}` : ""}${where} — see you there.`,
  };
}

/** Who is asking to see the guest list. */
export interface GuestListViewer {
  uid?: string | null;
  isHost?: boolean;
}

/** Host toggles resolved to effective display. Absent flags = visible. */
export function guestListDisplay(plan: Pick<HangoutPlan, "guestList">): {
  showNames: boolean;
  showCount: boolean;
} {
  return {
    showNames: !plan.guestList?.hideNames,
    showCount: !plan.guestList?.hideCount,
  };
}

/**
 * Attendees as a viewer may see them. The host and the plan creator row stay
 * intact; everyone keeps their own row. Other guests collapse to "Guest"
 * (name, handle, avatar, and notes redacted — ids and statuses stay so counts
 * and RSVP matching keep working).
 */
export function visibleAttendees(
  plan: Pick<HangoutPlan, "attendees" | "creator" | "guestList">,
  viewer?: GuestListViewer,
): PlanAttendee[] {
  const attendees = plan.attendees || [];
  if (viewer?.isHost) return attendees;
  if (guestListDisplay(plan).showNames) return attendees;
  return attendees.map((a) => {
    if (!a) return a;
    if (viewer?.uid && a.id === viewer.uid) return a;
    if (plan.creator?.uid && a.id === plan.creator.uid) return a;
    if (plan.creator?.name && a.name === plan.creator.name) return a;
    return {
      ...a,
      name: "Guest",
      handle: undefined,
      avatar: undefined,
      notes: undefined,
      answers: undefined,
      review: undefined,
    };
  });
}

/** Would a going intent fit under the host limit (null limit = always)? */
export function goingFits(
  plan: Pick<HangoutPlan, "attendees" | "capacity">,
  attendeeId: string,
  plusOnes?: unknown,
): boolean {
  const cap = Math.floor(Number(plan.capacity));
  if (!Number.isFinite(cap) || cap <= 0) return true;
  const existing = (plan.attendees || []).find((a) => a?.id === attendeeId);
  const takenExcludingSelf =
    headcountTaken(plan) - (existing?.status === "going" ? 1 + normalizePlusOnes(existing.plusOnes) : 0);
  return takenExcludingSelf + 1 + normalizePlusOnes(plusOnes) <= cap;
}

export type RsvpIntent = "going" | "maybe" | "declined";

/** RSVPs only land on live plans — cancelled and completed plans are locked. */
export function rsvpAllowed(plan: Pick<HangoutPlan, "status">): boolean {
  return plan.status !== "cancelled" && plan.status !== "completed";
}

/**
 * Where a going tap actually lands: approval-gated plans park newcomers as
 * pending, full plans park them on the waitlist, everyone else goes straight
 * in. Re-saves from someone already going stay going (party growth is
 * clamped, not re-queued, by the caller).
 */
export function resolveRsvpStatus(
  plan: Pick<HangoutPlan, "attendees" | "capacity" | "requiresApproval">,
  attendeeId: string,
  intent: RsvpIntent,
  plusOnes?: unknown,
): PlanAttendeeStatus {
  if (intent !== "going") return intent;
  const existing = (plan.attendees || []).find((a) => a?.id === attendeeId);
  if (existing?.status === "going") return "going";
  if (plan.requiresApproval) return "pending";
  return goingFits(plan, attendeeId, plusOnes) ? "going" : "waitlisted";
}

/** Max promotions per trigger run — bounds the write. */
export const WAITLIST_PROMOTE_MAX = 25;

/**
 * Waitlisted ids to promote now, in line order (strict FIFO: stop at the
 * first party that doesn't fit). Unlimited plans drain the whole queue.
 */
export function nextPromotions(plan: Pick<HangoutPlan, "attendees" | "capacity">): string[] {
  const cap = Math.floor(Number(plan.capacity));
  const unlimited = !Number.isFinite(cap) || cap <= 0;
  const queue = (plan.attendees || [])
    .filter((a) => a?.status === "waitlisted")
    .sort((a, b) => String(a.respondedAt || "").localeCompare(String(b.respondedAt || "")));
  const ids: string[] = [];
  let taken = headcountTaken(plan);
  for (const a of queue) {
    if (ids.length >= WAITLIST_PROMOTE_MAX) break;
    const need = 1 + normalizePlusOnes(a.plusOnes);
    if (!unlimited) {
      if (taken + need > cap) break;
      taken += need;
    }
    ids.push(a.id);
  }
  return ids;
}

export type SendPlanBroadcastRequest = {
  planId: string;
  title: string;
  body: string;
};

export type SendPlanBroadcastResponse = {
  ok: boolean;
  sent: number;
};

export type InviteToPlanRequest = {
  planId: string;
  /** Account uid of the past guest to invite. */
  uid: string;
};

export type InviteToPlanResponse = {
  ok: boolean;
  sent: number;
};
