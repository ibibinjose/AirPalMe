import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  cleanCapacity,
  cleanStallLocation,
  cleanTicketCents,
  eventGatePath,
  isEventFlavour,
  isStallCategory,
} from "../../shared/event";
import { checkSessionAttach, isValidFestivalSlug } from "../../shared/festival";
import { normalizeSpeakerHandle } from "../../shared/event";
import type { AccessClaims } from "../../shared/airpal-security";
import { stampContentMeta } from "../../shared/content-meta";
import { ratingDocId, ratingTargetKey } from "../../shared/abuse";
import { normalizeHandle } from "../../shared/bio";
import type {
  SaveAttendeeStallRequest,
  SubmitVenueRatingRequest,
  UpsertEventRequest,
  UpsertEventStallRequest,
} from "../../shared/airpal-security";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck, writeAudit } from "./abuse";
import { writeAuthoritativeEvent } from "./analytics";
import { CALLABLE, auth, db, isPlatformAdmin, requireAccount, requireAuth } from "./admin";

export const upsertEvent = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "upsertEvent");
  const uid = requireAccount(request, "Create an email account to run an event.");
  await enforceRateLimit(uid, "eventWrite", false);
  const data = (request.data || {}) as UpsertEventRequest;
  const name = String(data.name || "").trim();
  const flavour = String(data.flavour || "market");
  if (!name) throw new HttpsError("invalid-argument", "Event name is required.");
  if (!isEventFlavour(flavour)) throw new HttpsError("invalid-argument", "Unknown flavour.");
  let eventId = String(data.eventId || "").trim();
  if (!eventId) {
    const existing = await db.collection("events").where("organiserUid", "==", uid).limit(1).get();
    eventId = existing.empty ? `evt-${randomBytes(4).toString("hex")}` : existing.docs[0]!.id;
  } else {
    const snap = await db.collection("events").doc(eventId).get();
    if (snap.exists && String(snap.data()?.organiserUid) !== uid) {
      throw new HttpsError("permission-denied", "Not your event.");
    }
  }
  // Festival attach: the slug must be real, and only the festival organiser
  // (or an admin) may pull an event into the program.
  const festivalSlug = String(data.festivalSlug || "").trim().toLowerCase();
  let festivalTrack = "";
  let festivalRegistrationUrl = "";
  let festivalRegistrationNote = "";
  let festivalSpeakers: { name: string; role?: string }[] | undefined;
  if (festivalSlug) {
    if (!isValidFestivalSlug(festivalSlug)) throw new HttpsError("invalid-argument", "Unknown festival.");
    const festivalSnap = await db.collection("festivals").doc(festivalSlug).get();
    const festivalData = festivalSnap.exists
      ? { slug: festivalSnap.id, ...(festivalSnap.data() as { createdByUid?: string }) }
      : null;
    const refusal = checkSessionAttach(
      festivalData,
      uid,
      isPlatformAdmin(request.auth?.token as AccessClaims | undefined),
    );
    if (refusal) throw new HttpsError("permission-denied", refusal);
    festivalTrack = String(data.track || "").trim().slice(0, 60);
    festivalRegistrationUrl = String(data.registrationUrl || "").trim().slice(0, 500);
    festivalRegistrationNote = String(data.registrationNote || "").trim().slice(0, 120);
    if (Array.isArray(data.speakers)) {
      const cleaned = data.speakers
        .filter((s) => s && typeof s.name === "string" && s.name.trim())
        .map((s) => {
          const handle = typeof s.handle === "string" ? normalizeSpeakerHandle(s.handle) : "";
          return {
            name: s.name.trim().slice(0, 80),
            ...(typeof s.role === "string" && s.role.trim() ? { role: s.role.trim().slice(0, 120) } : {}),
            ...(handle ? { handle } : {}),
          };
        })
        .slice(0, 24);
      if (cleaned.length) festivalSpeakers = cleaned;
    }
  }
  const authUser = await auth.getUser(uid);
  const existingEvent = await db.collection("events").doc(eventId).get();
  const meta = stampContentMeta(
    existingEvent.exists
      ? (existingEvent.data() as Partial<import("../../shared/content-meta").ContentMeta>)
      : undefined,
    {
      ownerUid: uid,
      ownerEmail: (authUser.email || "").toLowerCase(),
      source: "organiser",
      verifiedOwner: true,
      reviewStatus: "approved",
    },
  );
  const festivalFields = !("festivalSlug" in data)
    ? {}
    : festivalSlug
      ? {
          festivalSlug,
          track: festivalTrack || null,
          registrationUrl: festivalRegistrationUrl || null,
          registrationNote: festivalRegistrationNote || null,
          speakers: festivalSpeakers || null,
        }
      : { festivalSlug: null, track: null, registrationUrl: null, registrationNote: null, speakers: null };
  const record = {
    id: eventId,
    name,
    flavour,
    city: String(data.city || "Sydney").trim(),
    venue: String(data.venue || "").trim(),
    room: String(data.room || "").trim() || null,
    ticketPriceCents: cleanTicketCents(data.ticketPriceCents) || null,
    capacity: cleanCapacity(data.capacity) || null,
    ...festivalFields,
    startsAt: String(data.startsAt || new Date().toISOString()),
    endsAt: String(data.endsAt || ""),
    status: data.status === "draft" || data.status === "ended" ? data.status : "live",
    gatePath: eventGatePath(eventId),
    organiserUid: uid,
    organiserEmail: (authUser.email || "").toLowerCase(),
    categoryChips: Array.isArray(data.categoryChips) ? data.categoryChips : ["eat", "coffee", "shops"],
    source: meta.source,
    verifiedOwner: meta.verifiedOwner,
    reviewStatus: meta.reviewStatus,
    createdAt: existingEvent.exists
      ? existingEvent.data()?.createdAt || FieldValue.serverTimestamp()
      : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    scheduleVerifiedAt: FieldValue.serverTimestamp(),
    expiresAt: data.endsAt || meta.expiresAt || null,
  };
  await db.collection("events").doc(eventId).set(record, { merge: true });
  await writeAudit({
    collection: "events",
    docId: eventId,
    action: existingEvent.exists ? "update" : "create",
    actorUid: uid,
  });
  if (!existingEvent.exists) {
    await writeAuthoritativeEvent({
      uid,
      eventName: "host_activation",
      contextId: eventId,
      contextType: "event",
      source: "internal",
      properties: { tenantId: uid, activationStep: "event_created", contextId: eventId, actorRole: "organiser" },
    });
  }
  return { eventId };
});

export const upsertEventStall = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const data = (request.data || {}) as UpsertEventStallRequest;
  const eventId = String(data.eventId || "").trim();
  const name = String(data.name || "").trim();
  if (!eventId || !name) throw new HttpsError("invalid-argument", "Event and stall name are required.");
  const eventSnap = await db.collection("events").doc(eventId).get();
  if (!eventSnap.exists) throw new HttpsError("not-found", "Event not found.");
  if (String(eventSnap.data()?.organiserUid) !== uid) throw new HttpsError("permission-denied", "Not your event.");
  const category = String(data.category || "shops").toLowerCase();
  const stallId = String(data.id || "").trim() || `st-${randomBytes(3).toString("hex")}`;
  const stall = {
    id: stallId,
    eventId,
    name,
    category: isStallCategory(category) ? category : "shops",
    booth: String(data.booth || "").trim(),
    location: cleanStallLocation(data.location) || null,
    shortWhy: String(data.shortWhy || "").trim(),
    offer: String(data.offer || "").trim() || null,
    handle: data.handle ? normalizeHandle(String(data.handle)) : null,
    status: "active",
    updatedAt: FieldValue.serverTimestamp(),
  };
  await db.collection("events").doc(eventId).collection("stalls").doc(stallId).set(stall, { merge: true });
  const all = await db.collection("events").doc(eventId).collection("stalls").get();
  await db.collection("events").doc(eventId).set({ stallCount: all.size }, { merge: true });
  return { stallId };
});

export const saveAttendeeStall = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "saveAttendeeStall");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "saveEvent", isAnonymousAuth(request));
  const data = (request.data || {}) as SaveAttendeeStallRequest;
  const eventId = String(data.eventId || "").trim();
  const stallId = String(data.stallId || "").trim();
  if (!eventId || !stallId) throw new HttpsError("invalid-argument", "Event and stall are required.");
  const eventSnap = await db.collection("events").doc(eventId).get();
  const stallSnap = await db.collection("events").doc(eventId).collection("stalls").doc(stallId).get();
  const eventName = String(eventSnap.data()?.name || eventId);
  const flavour = String(eventSnap.data()?.flavour || "market");
  const stall = stallSnap.data() || {};
  const now = new Date().toISOString();
  await db.collection("users").doc(uid).collection("savedEvents").doc(eventId).set({
    eventId,
    name: eventName,
    flavour,
    savedAt: now,
  });
  await db
    .collection("users")
    .doc(uid)
    .collection("savedStalls")
    .doc(stallId)
    .set({
      stallId,
      eventId,
      name: String(stall.name || stallId),
      category: String(stall.category || "shops"),
      booth: String(stall.booth || ""),
      offer: stall.offer || null,
      savedAt: now,
    });
  await writeAuthoritativeEvent({
    uid,
    eventName: "event_save",
    contextId: eventId,
    contextType: "event",
    source: "internal",
    anonymous: isAnonymousAuth(request),
    properties: { eventId, contextId: eventId, stallId },
  });
  return { ok: true as const };
});

export const submitVenueRating = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "submitVenueRating");
  const uid = requireAuth(request.auth?.uid);
  const anonymous = isAnonymousAuth(request);
  await enforceRateLimit(uid, "rating", anonymous);
  const data = (request.data || {}) as SubmitVenueRatingRequest;
  const emoji = String(data.emoji || "").trim();
  const mood = String(data.mood || "").trim();
  if (!emoji || !mood) throw new HttpsError("invalid-argument", "Pick a rating.");
  const eventId = String(data.eventId || "").trim();
  const propertyId = String(data.propertyId || "").trim();
  const stallId = String(data.stallId || "").trim();
  const targetKey = ratingTargetKey({
    target: data.target || "event",
    eventId: eventId || undefined,
    stallId: stallId || undefined,
    propertyId: propertyId || undefined,
  });
  const row = {
    uid,
    mood,
    emoji,
    note: String(data.note || "").trim() || null,
    target: data.target || "event",
    eventId: eventId || null,
    stallId: stallId || null,
    stallName: String(data.stallName || "").trim() || null,
    propertyId: propertyId || null,
    at: new Date().toISOString(),
    createdAt: FieldValue.serverTimestamp(),
  };
  const col = eventId
    ? db.collection("events").doc(eventId).collection("feedback")
    : db
        .collection("properties")
        .doc(propertyId || "stay")
        .collection("feedback");
  const ref = col.doc(ratingDocId(uid, targetKey));
  const existing = await ref.get();
  if (existing.exists) {
    throw new HttpsError("already-exists", "You already rated this.");
  }
  await ref.set(row);
  await writeAuthoritativeEvent({
    uid,
    eventName: "rating_submitted",
    contextId: propertyId || eventId || stallId,
    contextType: propertyId ? "property" : eventId ? "event" : "business",
    source: "internal",
    anonymous,
    properties: {
      targetType: data.target || "event",
      targetId: stallId || eventId || propertyId,
      contextId: propertyId || eventId || stallId,
      ratingBucket: mood,
    },
  });
  return { ok: true as const };
});
