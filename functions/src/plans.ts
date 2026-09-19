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
  PostPlanCommentRequest,
  PostPlanCommentResponse,
  GetPlanByInviteCodeRequest,
  GetPlanByInviteCodeResponse,
  HangoutPlan,
  PlanAttendee,
  PlanComment,
  PlanStop,
} from "../../shared/plan";
import { randomInviteCode } from "../../shared/plan";
import { CALLABLE, db, requireAuth } from "./admin";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";

export type {
  CreatePlanRequest,
  CreatePlanResponse,
  RsvpPlanRequest,
  RsvpPlanResponse,
  AddPlanStopRequest,
  AddPlanStopResponse,
  VotePlanStopRequest,
  VotePlanStopResponse,
  PostPlanCommentRequest,
  PostPlanCommentResponse,
  GetPlanByInviteCodeRequest,
  GetPlanByInviteCodeResponse,
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
    subscribers: authUser?.email ? [String(authUser.email).toLowerCase()] : [],
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
    pricePerPerson: data.isExperience ? Number(data.pricePerPerson || 0) : undefined,
    currency: data.isExperience ? String(data.currency || "AUD") : undefined,
    capacity: data.isExperience ? Number(data.capacity || 20) : undefined,
    depositConfig: data.isExperience ? data.depositConfig : undefined,
    pricingTiers: data.isExperience ? data.pricingTiers : undefined,
    inclusions: data.isExperience ? data.inclusions : undefined,
    bookingPolicy: data.isExperience ? data.bookingPolicy : undefined,
  };

  await db.collection("plans").doc(planId).set(planDoc);
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

// Canonical domain-named exports (mirrors *Remote for API consistency)
export const createPlan = createPlanRemote;
export const rsvpPlan = rsvpPlanRemote;
export const addPlanStop = addPlanStopRemote;
export const votePlanStop = votePlanStopRemote;
export const postPlanComment = postPlanCommentRemote;
