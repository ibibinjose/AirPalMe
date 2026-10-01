import { randomBytes } from "node:crypto";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import type {
  CreatePlanRequest,
  CreatePlanResponse,
  RsvpPlanRequest,
  RsvpPlanResponse,
  AddPlanStopRequest,
  AddPlanStopResponse,
  VotePlanStopRequest,
  VotePlanStopResponse,
  VoteDateOptionRequest,
  VoteDateOptionResponse,
  PostPlanCommentRequest,
  PostPlanCommentResponse,
  CompletePlanRequest,
  CompletePlanResponse,
  GetPlanByInviteCodeRequest,
  GetPlanByInviteCodeResponse,
  ExperienceProofResponse,
  HangoutPlan,
  PlanAttendee,
  PlanComment,
  PlanStop,
} from "../../shared/plan";
import {
  canCompletePlanStatus,
  clampExperienceCapacity,
  clampExperienceMoney,
  isPlanManager,
  randomInviteCode,
  sanitizeCurrencyCode,
  sanitizeDepositConfig,
  sanitizePricingTiers,
} from "../../shared/plan";
import {
  REFERRAL_INVITEE_STARS,
  REFERRAL_INVITER_STARS,
  computeReferralReward,
  tierForBalance,
  type StarLedgerEntry,
} from "../../shared/stars";
import { CALLABLE, db, isPlatformAdmin, requireAuth } from "./admin";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import type { AccessClaims } from "../../shared/airpal-security";
import { writeAuthoritativeEvent } from "./analytics";

export type {
  CreatePlanRequest,
  CreatePlanResponse,
  RsvpPlanRequest,
  RsvpPlanResponse,
  AddPlanStopRequest,
  AddPlanStopResponse,
  VotePlanStopRequest,
  VotePlanStopResponse,
  VoteDateOptionRequest,
  VoteDateOptionResponse,
  PostPlanCommentRequest,
  PostPlanCommentResponse,
  CompletePlanRequest,
  CompletePlanResponse,
  GetPlanByInviteCodeRequest,
  GetPlanByInviteCodeResponse,
  ExperienceProofResponse,
};

export const createPlanRemote = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "createPlanRemote");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "planWrite", isAnonymousAuth(request));

  const data = (request.data || {}) as CreatePlanRequest;
  const title = String(data.title || "").trim();
  const date = String(data.date || "").trim();
  const time = String(data.time || "").trim();

  if (!title) throw new HttpsError("invalid-argument", "Plan title is required.");
  if (!date) throw new HttpsError("invalid-argument", "Plan date is required.");
  if (!time) throw new HttpsError("invalid-argument", "Plan time is required.");

  const planId = data.id || `plan-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
  const now = new Date().toISOString();
  const inviteCode = randomInviteCode(6);

  const authUser = request.auth?.token;
  const creatorName = String(authUser?.name || "Event Organiser").trim();

  const stops: PlanStop[] = (data.initialStops || []).map((s, idx) => ({
    id: `stop-${idx + 1}`,
    name: String(s.name || "").trim(),
    time: s.time ? String(s.time).trim() : undefined,
    notes: s.notes ? String(s.notes).trim() : undefined,
    icon: s.icon ? String(s.icon) : "pin",
    placeId: s.placeId ? String(s.placeId) : undefined,
    addedByName: creatorName,
    addedByUid: uid,
    votes: 1,
    voterUids: [uid],
  }));

  const initialAttendee: PlanAttendee = {
    id: uid,
    name: creatorName,
    status: "going",
    isAnonymous: Boolean(authUser?.firebase?.sign_in_provider === "anonymous"),
    respondedAt: now,
  };

  const planDoc: HangoutPlan = {
    id: planId,
    title,
    type: data.type || "custom",
    theme: (data.theme as any) || "gold",
    creator: {
      uid,
      name: creatorName,
      isAnonymous: Boolean(authUser?.firebase?.sign_in_provider === "anonymous"),
    },
    date,
    time,
    endTime: data.endTime ? String(data.endTime).trim() : undefined,
    datetime: `${date}T${time}:00`,
    city: String(data.city || "Sydney").trim(),
    destination: String(data.destination || "Sydney Harbour").trim(),
    heroImage: data.heroImage ? String(data.heroImage).trim() : undefined,
    notes: data.notes ? String(data.notes).trim() : undefined,
    stops,
    attendees: [initialAttendee],
    comments: [],
    subscribers: [uid],
    inviteCode,
    isPublic: Boolean(data.isPublic ?? true),
    interests: (data.interests || []).map((t) => String(t).toLowerCase()),
    status: "open",
    createdAt: now,
    updatedAt: now,

    // Experience Marketplace
    isExperience: Boolean(data.isExperience),
    experienceCategory: data.isExperience ? data.experienceCategory : undefined,
    durationMode: data.isExperience ? data.durationMode : undefined,
    endDate: data.isExperience ? data.endDate : undefined,
    pricingModel: data.isExperience ? data.pricingModel : undefined,
    pricePerPerson: data.isExperience ? clampExperienceMoney(data.pricePerPerson) : undefined,
    currency: data.isExperience ? sanitizeCurrencyCode(data.currency) : undefined,
    capacity: data.isExperience ? clampExperienceCapacity(data.capacity) : undefined,
    depositConfig: data.isExperience ? sanitizeDepositConfig(data.depositConfig) : undefined,
    pricingTiers: data.isExperience ? sanitizePricingTiers(data.pricingTiers) : undefined,
    inclusions: data.isExperience ? data.inclusions : undefined,
    bookingPolicy: data.isExperience ? data.bookingPolicy : undefined,
  };

  const planRef = db.collection("plans").doc(planId);
  const existingSnap = await planRef.get();
  if (existingSnap.exists) {
    const existing = existingSnap.data() as HangoutPlan;
    if (existing.creator?.uid === uid) return { ok: true, plan: existing };
    throw new HttpsError("already-exists", "That plan id is taken.");
  }
  await planRef.set(planDoc);
  return { ok: true, plan: planDoc };
});

export const rsvpPlanRemote = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "rsvpPlanRemote");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "planRsvp", isAnonymousAuth(request));

  const data = (request.data || {}) as RsvpPlanRequest;
  const planId = String(data.planId || "").trim();
  const status = data.status;

  if (!planId) throw new HttpsError("invalid-argument", "planId is required.");
  if (!["going", "maybe", "declined"].includes(status)) {
    throw new HttpsError("invalid-argument", "Invalid RSVP status.");
  }

  const planRef = db.collection("plans").doc(planId);
  const planSnap = await planRef.get();
  if (!planSnap.exists) {
    throw new HttpsError("not-found", "Plan not found.");
  }

  const plan = planSnap.data() as HangoutPlan;
  const authUser = request.auth?.token;
  const name = String(data.guestName || authUser?.name || "Guest Mate").trim();
  const now = new Date().toISOString();

  const existingIdx = plan.attendees.findIndex((a) => a.id === uid);
  const newAttendee: PlanAttendee = {
    id: uid,
    name,
    status,
    notes: data.notes ? String(data.notes).trim() : undefined,
    isAnonymous: Boolean(authUser?.firebase?.sign_in_provider === "anonymous"),
    respondedAt: now,
  };

  const nextAttendees = [...(plan.attendees || [])];
  if (existingIdx >= 0) {
    nextAttendees[existingIdx] = newAttendee;
  } else {
    nextAttendees.push(newAttendee);
  }

  await planRef.update({
    attendees: nextAttendees,
    updatedAt: now,
  });

  return { ok: true, attendee: newAttendee };
});

export const addPlanStopRemote = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "addPlanStopRemote");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "planWrite", isAnonymousAuth(request));

  const data = (request.data || {}) as AddPlanStopRequest;
  const planId = String(data.planId || "").trim();
  const stopName = String(data.name || "").trim();

  if (!planId) throw new HttpsError("invalid-argument", "planId is required.");
  if (!stopName) throw new HttpsError("invalid-argument", "Stop name is required.");

  const planRef = db.collection("plans").doc(planId);
  const planSnap = await planRef.get();
  if (!planSnap.exists) {
    throw new HttpsError("not-found", "Plan not found.");
  }

  const plan = planSnap.data() as HangoutPlan;
  const authUser = request.auth?.token;
  const adderName = String(authUser?.name || "Mate").trim();

  const newStop: PlanStop = {
    id: `stop-${Date.now()}-${randomBytes(2).toString("hex")}`,
    name: stopName,
    time: data.time ? String(data.time).trim() : undefined,
    notes: data.notes ? String(data.notes).trim() : undefined,
    placeId: data.placeId ? String(data.placeId).trim() : undefined,
    icon: data.icon ? String(data.icon) : "pin",
    address: data.address ? String(data.address).trim() : undefined,
    addedByName: adderName,
    addedByUid: uid,
    votes: 1,
    voterUids: [uid],
  };

  const nextStops = [...(plan.stops || []), newStop];
  await planRef.update({
    stops: nextStops,
    updatedAt: new Date().toISOString(),
  });

  return { ok: true, stop: newStop };
});

export const votePlanStopRemote = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "votePlanStopRemote");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "planRsvp", isAnonymousAuth(request));

  const data = (request.data || {}) as VotePlanStopRequest;
  const planId = String(data.planId || "").trim();
  const stopId = String(data.stopId || "").trim();

  if (!planId || !stopId) throw new HttpsError("invalid-argument", "planId and stopId are required.");

  const planRef = db.collection("plans").doc(planId);
  const planSnap = await planRef.get();
  if (!planSnap.exists) throw new HttpsError("not-found", "Plan not found.");

  const plan = planSnap.data() as HangoutPlan;
  const stop = plan.stops.find((s) => s.id === stopId);
  if (!stop) throw new HttpsError("not-found", "Stop not found in plan.");

  const voters = new Set(stop.voterUids || []);
  if (voters.has(uid)) {
    voters.delete(uid);
  } else {
    voters.add(uid);
  }

  const nextStops = plan.stops.map((s) =>
    s.id === stopId ? { ...s, voterUids: Array.from(voters), votes: voters.size } : s,
  );

  await planRef.update({
    stops: nextStops,
    updatedAt: new Date().toISOString(),
  });

  return { ok: true, votes: voters.size, voted: voters.has(uid) };
});

export const postPlanCommentRemote = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "postPlanCommentRemote");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "planWrite", isAnonymousAuth(request));

  const data = (request.data || {}) as PostPlanCommentRequest;
  const planId = String(data.planId || "").trim();
  const text = String(data.text || "").trim();

  if (!planId) throw new HttpsError("invalid-argument", "planId is required.");
  if (!text) throw new HttpsError("invalid-argument", "Comment text is required.");

  const planRef = db.collection("plans").doc(planId);
  const planSnap = await planRef.get();
  if (!planSnap.exists) throw new HttpsError("not-found", "Plan not found.");

  const plan = planSnap.data() as HangoutPlan;
  const authUser = request.auth?.token;
  const comment: PlanComment = {
    id: `comment-${Date.now()}-${randomBytes(2).toString("hex")}`,
    authorId: uid,
    authorName: String(authUser?.name || "Mate").trim(),
    text,
    photoUrl: data.photoUrl ? String(data.photoUrl).trim() : undefined,
    createdAt: new Date().toISOString(),
  };

  const nextComments = [...(plan.comments || []), comment];
  await planRef.update({
    comments: nextComments,
    updatedAt: new Date().toISOString(),
  });

  return { ok: true, comment };
});

/**
 * P0 — close the AirPal loop with server authority. The creator, a going
 * attendee (someone who showed up), or a platform admin flips a live plan to
 * completed. The server stamps completedAt, writes an audit record, and logs
 * the authoritative experience_completed event for the North Star count.
 */
export const completePlanRemote = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "completePlanRemote");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "planWrite", isAnonymousAuth(request));

  const data = (request.data || {}) as CompletePlanRequest;
  const planId = String(data.planId || "").trim();
  if (!planId) throw new HttpsError("invalid-argument", "planId is required.");

  const planRef = db.collection("plans").doc(planId);
  const planSnap = await planRef.get();
  if (!planSnap.exists) throw new HttpsError("not-found", "Plan not found.");
  const plan = planSnap.data() as HangoutPlan;

  const claims = request.auth?.token as AccessClaims | undefined;
  const admin = isPlatformAdmin(claims);
  const manages = isPlanManager(plan, uid);
  const wentAlong = (plan.attendees || []).some((a) => a.id === uid && a.status === "going");
  if (!manages && !wentAlong && !admin) {
    throw new HttpsError("permission-denied", "Only the host, someone who went, or an admin can complete this plan.");
  }
  if (plan.status === "completed") {
    return { ok: true, planId, status: "completed", completedAt: plan.completedAt || plan.updatedAt } as CompletePlanResponse;
  }
  if (!canCompletePlanStatus(plan.status)) {
    throw new HttpsError("failed-precondition", "Only a live plan can be marked completed.");
  }

  const now = new Date().toISOString();
  await planRef.update({
    status: "completed",
    completedAt: now,
    completedByUid: uid,
    updatedAt: now,
  });

  await db.collection("admin_audits").add({
    actorUid: uid,
    action: "plan.status",
    collection: "plans",
    docId: planId,
    from: plan.status,
    to: "completed",
    note: "",
    createdAt: now,
  });

  await writeAuthoritativeEvent({
    uid,
    eventName: "content_action",
    contextId: planId,
    source: "internal",
    properties: {
      actionType: "experience_completed",
      contextId: planId,
      contentId: planId,
    },
  });

  // Referral stars vest on first completed experiences — never fail the
  // completion itself if rewards hit trouble.
  try {
    await vestReferralStars(uid, now);
  } catch (err) {
    console.error("vestReferralStars failed", err);
  }

  return { ok: true, planId, status: "completed", completedAt: now } as CompletePlanResponse;
});

/**
 * First-completion referral payout: the invitee's referral row pays both
 * sides once (100 inviter / 50 invitee), inside one transaction so a
 * double-complete race can't double-pay.
 */
export async function vestReferralStars(completerUid: string, now = new Date().toISOString()): Promise<boolean> {
  const ref = db.collection("referrals").doc(completerUid);
  const snap = await ref.get();
  if (computeReferralReward(snap.exists ? snap.data() : null, completerUid) === null) return false;

  return db.runTransaction(async (tx) => {
    const fresh = await tx.get(ref);
    const reward = computeReferralReward(fresh.exists ? fresh.data() : null, completerUid);
    if (!reward) return false;
    const ledger = db.collection("star_ledger");
    const inviterEntry: StarLedgerEntry = {
      uid: reward.inviterUid,
      stars: REFERRAL_INVITER_STARS,
      reason: "referral_inviter",
      refId: completerUid,
      createdAt: now,
    };
    const inviteeEntry: StarLedgerEntry = {
      uid: reward.inviteeUid,
      stars: REFERRAL_INVITEE_STARS,
      reason: "referral_invitee",
      refId: completerUid,
      createdAt: now,
    };
    tx.set(ledger.doc(), inviterEntry);
    tx.set(ledger.doc(), inviteeEntry);
    tx.update(ref, { rewardedAt: now });
    // Stamp the earned tier name onto each earner's person profiles so public
    // bios can show a coarse status badge. Tier only — never a balance, and
    // person profiles only (businesses don't earn Stars).
    for (const [uid, newlyVested] of [
      [reward.inviterUid, REFERRAL_INVITER_STARS],
      [reward.inviteeUid, REFERRAL_INVITEE_STARS],
    ] as const) {
      const prior = await tx.get(db.collection("star_ledger").where("uid", "==", uid));
      let balance = newlyVested;
      prior.forEach((doc) => {
        balance += Number(doc.data()?.stars) || 0;
      });
      const tierName = tierForBalance(balance).name;
      const profiles = await tx.get(db.collection("profiles").where("ownerUid", "==", uid));
      profiles.forEach((doc) => {
        if (doc.data()?.kind === "person" && doc.data()?.starTier !== tierName) {
          tx.update(doc.ref, { starTier: tierName });
        }
      });
    }
    return true;
  });
}

/**
 * Date-poll votes from any signed-in guest (anonymous included). Direct
 * Firestore writes to `dateOptions` stay host-only per rules, so guests vote
 * through here: authenticated, rate-limited like RSVPs, toggle semantics.
 */
export const voteDateOptionRemote = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "voteDateOptionRemote");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "planRsvp", isAnonymousAuth(request));

  const data = (request.data || {}) as VoteDateOptionRequest;
  const planId = String(data.planId || "").trim();
  const optionId = String(data.optionId || "").trim();
  if (!planId || !optionId) throw new HttpsError("invalid-argument", "planId and optionId are required.");

  const planRef = db.collection("plans").doc(planId);
  const planSnap = await planRef.get();
  if (!planSnap.exists) throw new HttpsError("not-found", "Plan not found.");
  const plan = planSnap.data() as HangoutPlan;
  if (plan.datePollLocked) throw new HttpsError("failed-precondition", "The date is locked in.");

  const option = (plan.dateOptions || []).find((o) => o.id === optionId);
  if (!option) throw new HttpsError("not-found", "Date option not found.");

  const voters = new Set(option.voterUids || []);
  if (voters.has(uid)) voters.delete(uid);
  else voters.add(uid);

  const nextOptions = (plan.dateOptions || []).map((o) =>
    o.id === optionId ? { ...o, voterUids: Array.from(voters), votes: voters.size } : o,
  );
  await planRef.update({ dateOptions: nextOptions, updatedAt: new Date().toISOString() });

  return { ok: true, votes: voters.size, voted: voters.has(uid) } as VoteDateOptionResponse;
});

export const getPlanByInviteCode = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "getPlanByInviteCode");
  const data = (request.data || {}) as GetPlanByInviteCodeRequest;
  const code = String(data.inviteCode || "")
    .trim()
    .toUpperCase();
  if (!code) throw new HttpsError("invalid-argument", "Invite code is required.");

  const snap = await db.collection("plans").where("inviteCode", "==", code).limit(1).get();
  if (snap.empty) {
    throw new HttpsError("not-found", "No plan matching this invite code.");
  }

  return { ok: true, plan: snap.docs[0]!.data() };
});

/**
 * Public proof counters: how many plans completed, how many live now.
 * No auth needed — aggregates only, never plan bodies or names.
 */
export const getExperienceProofRemote = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "getExperienceProofRemote");
  const [completedSnap, liveSnap] = await Promise.all([
    db.collection("plans").where("status", "==", "completed").count().get(),
    db.collection("plans").where("status", "in", ["open", "confirmed"]).count().get(),
  ]);
  return {
    ok: true,
    completed: completedSnap.data().count,
    live: liveSnap.data().count,
  } as ExperienceProofResponse;
});

export const getExperienceProof = getExperienceProofRemote;

// Canonical domain-named exports (mirrors *Remote for API consistency)
export const createPlan = createPlanRemote;
export const rsvpPlan = rsvpPlanRemote;
export const addPlanStop = addPlanStopRemote;
export const votePlanStop = votePlanStopRemote;
export const voteDateOption = voteDateOptionRemote;
export const postPlanComment = postPlanCommentRemote;
export const completePlan = completePlanRemote;
