import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import type {
  InviteToPlanRequest,
  InviteToPlanResponse,
  SendPlanBroadcastRequest,
  SendPlanBroadcastResponse,
} from "../../shared/plan-notify";
import {
  buildPlanReminder,
  nextPromotions,
  planBroadcastRecipients,
  planReminderKind,
  reminderAlreadySent,
  validatePlanBroadcast,
} from "../../shared/plan-notify";
import type { HangoutPlan } from "../../shared/plan";
import { isPlanManager } from "../../shared/plan";
import { CALLABLE, db, isPlatformAdmin, requireAccount } from "./admin";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import type { AccessClaims } from "../../shared/airpal-security";
import { fanOut } from "./notifications";

/**
 * P0 — one update to everyone "going". Host (or admin) only, real account
 * only: `requireAccount` rejects anonymous callers, matching the broadcast
 * rate-limit gate (anonymousMax 0). Small trusted audience, so no admin
 * review queue — unlike platform-wide blasts.
 */
export const sendPlanBroadcast = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "sendPlanBroadcast");
  const uid = requireAccount(request, "Create an account to message your plan crew.");
  await enforceRateLimit(uid, "broadcast", isAnonymousAuth(request));

  const data = (request.data || {}) as SendPlanBroadcastRequest;
  const planId = String(data.planId || "").trim();
  if (!planId) throw new HttpsError("invalid-argument", "planId is required.");

  const errors = validatePlanBroadcast({ title: data.title, body: data.body });
  if (errors.length) throw new HttpsError("invalid-argument", errors.join(" "));

  const planRef = db.collection("plans").doc(planId);
  const planSnap = await planRef.get();
  if (!planSnap.exists) throw new HttpsError("not-found", "Plan not found.");
  const plan = planSnap.data() as HangoutPlan;

  const claims = request.auth?.token as AccessClaims | undefined;
  if (!isPlanManager(plan, uid) && !isPlatformAdmin(claims)) {
    throw new HttpsError("permission-denied", "Only the host can message this plan.");
  }
  if (plan.status === "completed" || plan.status === "cancelled") {
    throw new HttpsError("failed-precondition", "This plan is over — no more updates to send.");
  }

  const recipients = planBroadcastRecipients(plan, uid);
  if (!recipients.length) {
    return { ok: true, sent: 0 } as SendPlanBroadcastResponse;
  }

  const sent = await fanOut({
    uids: recipients,
    kind: "announcement",
    title: String(data.title).trim(),
    body: String(data.body).trim(),
    promotionId: "",
    href: `/invite/${plan.inviteCode}`,
  });
  return { ok: true, sent } as SendPlanBroadcastResponse;
});

/**
 * Re-invite someone you've been out with: one targeted inbox+push note with
 * the guest-friendly invite link. Managers only (creator/co-host/admin),
 * real accounts only, one recipient per call — this is a nudge, not a blast.
 */
export const inviteToPlan = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "inviteToPlan");
  const uid = requireAccount(request, "Create an account to invite mates.");
  await enforceRateLimit(uid, "broadcast", isAnonymousAuth(request));

  const data = (request.data || {}) as InviteToPlanRequest;
  const planId = String(data.planId || "").trim();
  const targetUid = String(data.uid || "").trim();
  if (!planId) throw new HttpsError("invalid-argument", "planId is required.");
  if (!targetUid || targetUid === uid || targetUid.startsWith("anon-")) {
    throw new HttpsError("invalid-argument", "Pick someone to invite.");
  }

  const planRef = db.collection("plans").doc(planId);
  const planSnap = await planRef.get();
  if (!planSnap.exists) throw new HttpsError("not-found", "Plan not found.");
  const plan = planSnap.data() as HangoutPlan;

  const claims = request.auth?.token as AccessClaims | undefined;
  if (!isPlanManager(plan, uid) && !isPlatformAdmin(claims)) {
    throw new HttpsError("permission-denied", "Only the host can invite to this plan.");
  }
  if (plan.status === "completed" || plan.status === "cancelled") {
    throw new HttpsError("failed-precondition", "This plan is over — no more invites.");
  }
  if ((plan.attendees || []).some((a) => a?.id === targetUid)) {
    throw new HttpsError("already-exists", "They're already on this plan.");
  }

  const inviter = (plan.attendees || []).find((a) => a?.id === uid);
  const hostName = String(inviter?.name || plan.creator?.name || "A mate").trim() || "A mate";
  const sent = await fanOut({
    uids: [targetUid],
    kind: "announcement",
    title: `You're invited: ${plan.title}`,
    body: `${hostName} wants you there — ${plan.date}${plan.time ? ` at ${plan.time}` : ""}.`,
    promotionId: "",
    href: `/invite/${plan.inviteCode}`,
  });
  return { ok: true, sent } as InviteToPlanResponse;
});

/** Device-local ids no account can read — inbox rows for them are write-only litter. */
function notifyTargets(id: string): string[] {
  const trimmed = String(id || "").trim();
  return trimmed && !trimmed.startsWith("anon-") ? [trimmed] : [];
}

/**
 * Waitlist promotions + guest decision notices. Any plan write re-runs this:
 * freed seats (cancellations, party shrinks, capacity raises) promote the
 * waitlist in line order, and guests the host/system moved get an inbox+push
 * note. Self-selected RSVPs have no tracked transition, so they stay quiet.
 * Convergent: a promotion write re-triggers into a no-op (nothing left to
 * promote, no fresh transitions).
 */
export const onPlanUpdated = onDocumentUpdated("plans/{planId}", async (event) => {
  const before = event.data?.before.data() as HangoutPlan | undefined;
  const after = event.data?.after.data() as HangoutPlan | undefined;
  if (!before || !after || !event.data) return;
  if (after.status === "completed" || after.status === "cancelled") return;

  let finalAttendees = after.attendees || [];
  const promote = nextPromotions(after);
  if (promote.length) {
    const now = new Date().toISOString();
    const set = new Set(promote);
    finalAttendees = finalAttendees.map((a) =>
      set.has(a.id) ? { ...a, status: "going" as const, respondedAt: now } : a,
    );
    await event.data.after.ref.update({ attendees: finalAttendees, updatedAt: now });
  }

  const href = `/invite/${after.inviteCode}`;
  const prevById = new Map((before.attendees || []).map((a) => [a.id, a.status]));
  for (const a of finalAttendees) {
    const prev = prevById.get(a.id);
    if (!prev || prev === a.status) continue;
    const uids = notifyTargets(a.id);
    if (!uids.length) continue;
    if (prev === "waitlisted" && a.status === "going") {
      await fanOut({
        uids,
        kind: "announcement",
        title: `You're in: ${after.title}`,
        body: `A spot opened up — see you ${after.date}${after.time ? ` at ${after.time}` : ""}.`,
        promotionId: "",
        href,
      });
    } else if (prev === "pending" && a.status === "going") {
      await fanOut({
        uids,
        kind: "announcement",
        title: `You're in: ${after.title}`,
        body: `The host approved your request — see you ${after.date}.`,
        promotionId: "",
        href,
      });
    } else if (prev === "pending" && a.status === "declined") {
      await fanOut({
        uids,
        kind: "announcement",
        title: after.title,
        body: `The host couldn't fit you in this time.`,
        promotionId: "",
        href,
      });
    }
  }
});

/** Sydney calendar date — never UTC-sliced for "today". */
export function sydneyToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * P0 — auto day-before / day-of nudges ("wait, when is this?" kills
 * attendance). Hourly scan of live plans against the Sydney date; each nudge
 * fires once per plan date, so a rescheduled plan reminds again.
 */
export const sendPlanReminders = onSchedule(
  { region: "us-central1", schedule: "every 60 minutes", timeoutSeconds: 180 },
  async () => {
    const todayStr = sydneyToday();
    const live = await db.collection("plans").where("status", "in", ["open", "confirmed"]).limit(300).get();
    for (const doc of live.docs) {
      const plan = doc.data() as HangoutPlan;
      const kind = planReminderKind({ planDate: String(plan.date || ""), todayStr });
      if (!kind) continue;
      if (reminderAlreadySent(plan, kind)) continue;
      const recipients = planBroadcastRecipients(plan);
      if (recipients.length) {
        const msg = buildPlanReminder(plan, kind);
        await fanOut({
          uids: recipients,
          kind: "announcement",
          title: msg.title,
          body: msg.body,
          promotionId: "",
          href: `/invite/${plan.inviteCode}`,
        });
      }
      const stampKey = kind === "day-before" ? "dayBefore" : "dayOf";
      await doc.ref.update({
        remindersSent: { ...(plan.remindersSent || {}), [stampKey]: plan.date },
        updatedAt: new Date().toISOString(),
      });
    }
  },
);
