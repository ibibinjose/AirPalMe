import { FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import type { AccessClaims } from "../../shared/airpal-security";
import {
  buildPulsePublicPath,
  categoryFromPulseAnswers,
  createPublicToken,
  createPulseTemplate,
  isPulsePublicToken,
  isValidClientKey,
  issueSummaryFromAnswers,
  pulseImageUrlOk,
  PULSE_TEMPLATES,
  resolvePulseStatusTransition,
  scoreBucket,
  validatePulseFollowup,
  validatePulseSubmitPayload,
  type Pulse,
  type PulseAnswer,
  type PulseIssue,
  type PulsePublicDto,
  type PulseResponse,
  type PulseStatus,
  type PulseTemplate,
} from "../../shared/pulse";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import { CALLABLE, db, isPlatformAdmin, requireAuth } from "./admin";
import { writeAuthoritativeEvent } from "./analytics";

function hostUids(prop: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  const owner = String(prop.ownerId || "");
  if (owner) ids.add(owner);
  const members = prop.members && typeof prop.members === "object" ? (prop.members as Record<string, unknown>) : {};
  for (const uid of Object.keys(members)) {
    if (uid) ids.add(uid);
  }
  return Array.from(ids);
}

function callerFlags(
  request: { auth?: { uid?: string; token?: Record<string, unknown> } },
  propertyId: string,
  prop: Record<string, unknown>,
) {
  const uid = request.auth?.uid || "";
  const caller = (request.auth?.token || {}) as AccessClaims;
  const role = caller.properties?.[propertyId];
  const isPersonalWorkspace = propertyId === uid || propertyId === `usr_${uid}` || propertyId === `prop_${uid}`;
  const isHostAdmin = isPlatformAdmin(caller) || prop.ownerId === uid || role === "host_admin" || isPersonalWorkspace;
  const isStaff = isHostAdmin || role === "staff";
  return { uid, isHostAdmin, isStaff };
}

async function loadProperty(propertyId: string, callerUid?: string): Promise<Record<string, unknown>> {
  const snap = await db.collection("properties").doc(propertyId).get();
  if (!snap.exists) {
    // If this is a personal/business workspace for a signed-in user, auto-initialize
    if (callerUid && (propertyId === callerUid || propertyId === `usr_${callerUid}` || propertyId === `prop_${callerUid}`)) {
      const initial: Record<string, unknown> = {
        id: propertyId,
        ownerId: callerUid,
        name: "My Pulse",
        status: "active",
        createdAt: FieldValue.serverTimestamp(),
      };
      await db.collection("properties").doc(propertyId).set(initial, { merge: true });
      return initial;
    }
    throw new HttpsError("not-found", "Property not found.");
  }
  return snap.data() || {};
}

/** Public read by opaque token — safe DTO only. */
export const getPulseByToken = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "getPulseByToken");
  const publicToken = String((request.data || {}).publicToken || "").trim();
  if (!isPulsePublicToken(publicToken)) throw new HttpsError("invalid-argument", "Invalid Pulse link.");

  // Scan throttle: per-device when signed in, per-link otherwise. Enumeration
  // is already infeasible (119-bit tokens); this stops scan/analytics spam.
  await enforceRateLimit(
    request.auth?.uid || `token:${publicToken}`,
    "pulse_scan",
    !request.auth?.uid || isAnonymousAuth(request),
  );

  const tokenSnap = await db.collection("pulseTokens").doc(publicToken).get();
  if (!tokenSnap.exists) throw new HttpsError("not-found", "This Pulse link is not active.");
  const token = tokenSnap.data() || {};
  if (token.active !== true) throw new HttpsError("not-found", "This Pulse link is not active.");
  const propertyId = String(token.propertyId || "");
  const deploymentId = String(token.deploymentId || "");
  const pulseId = String(token.pulseId || "");
  if (!propertyId || !deploymentId || !pulseId) throw new HttpsError("not-found", "This Pulse link is not active.");

  const [propSnap, depSnap, pulseSnap] = await Promise.all([
    db.collection("properties").doc(propertyId).get(),
    db.collection("properties").doc(propertyId).collection("pulseDeployments").doc(deploymentId).get(),
    db.collection("properties").doc(propertyId).collection("pulses").doc(pulseId).get(),
  ]);
  if (!depSnap.exists || !pulseSnap.exists) throw new HttpsError("not-found", "This Pulse link is not active.");
  const dep = depSnap.data() || {};
  const pulse = pulseSnap.data() || {};
  if (dep.active !== true || pulse.status !== "live") {
    throw new HttpsError("failed-precondition", "This Pulse is not accepting responses right now.");
  }

  const dto: PulsePublicDto = {
    propertyId,
    propertyName: String(propSnap.data()?.name || "AirPal stay"),
    propertyHeroImage: String(propSnap.data()?.heroImage || ""),
    pulseId,
    deploymentId,
    publicToken,
    name: String(pulse.name || "Pulse"),
    title: String((pulse.branding as { title?: string } | undefined)?.title || pulse.name || "How is your stay?"),
    imageUrl: String((pulse.branding as { imageUrl?: string } | undefined)?.imageUrl || ""),
    questions: Array.isArray(pulse.questions) ? pulse.questions : [],
    logic: Array.isArray(pulse.logic) ? pulse.logic : [],
    status: "live",
  };

  const uid = request.auth?.uid || "anonymous";
  await writeAuthoritativeEvent({
    uid,
    eventName: "pulse_viewed",
    contextId: propertyId,
    contextType: "property",
    source: "qr",
    anonymous: !request.auth?.uid || isAnonymousAuth(request),
    properties: {
      contextId: propertyId,
      pulseId,
      deploymentId,
      template: String(pulse.template || "stay_during"),
    },
  });

  return dto;
});

/**
 * Bio-page rate card: resolve the property's currently live Pulse. Anonymous
 * OK — the token is the same capability the printed QR carries, and misses
 * are indistinguishable from inactive so the endpoint is not an oracle.
 */
export const getBioPulse = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "getBioPulse");
  const propertyId = String((request.data || {}).propertyId || "").trim();
  if (!propertyId) throw new HttpsError("invalid-argument", "propertyId is required.");
  await enforceRateLimit(
    request.auth?.uid || `bio:${propertyId}`,
    "pulse_scan",
    !request.auth?.uid || isAnonymousAuth(request),
  );

  const depSnap = await db
    .collection("properties")
    .doc(propertyId)
    .collection("pulseDeployments")
    .where("active", "==", true)
    .limit(1)
    .get();
  if (depSnap.empty) return { found: false as const };
  const dep = depSnap.docs[0]!.data() || {};
  const publicToken = String(dep.publicToken || "");
  const pulseId = String(dep.pulseId || "");
  if (!publicToken || !isPulsePublicToken(publicToken) || !pulseId) return { found: false as const };
  const [propSnap, pulseSnap] = await Promise.all([
    db.collection("properties").doc(propertyId).get(),
    db.collection("properties").doc(propertyId).collection("pulses").doc(pulseId).get(),
  ]);
  if (!pulseSnap.exists || pulseSnap.data()?.status !== "live") return { found: false as const };
  const pulse = pulseSnap.data() || {};
  return {
    found: true as const,
    publicToken,
    title: String(
      (pulse.branding as { title?: string } | undefined)?.title || pulse.name || "How is your stay?",
    ).slice(0, 80),
    propertyName: String(propSnap.data()?.name || "AirPal stay"),
  };
});

/** Anonymous OK — rate-limited. Writes response (+ issue when rules say so). */
export const submitPulseResponse = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "submitPulseResponse");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "pulse_response", isAnonymousAuth(request));

  const data = (request.data || {}) as Record<string, unknown>;
  const publicToken = String(data.publicToken || "").trim();
  if (!isPulsePublicToken(publicToken)) throw new HttpsError("invalid-argument", "Invalid Pulse link.");

  const tokenSnap = await db.collection("pulseTokens").doc(publicToken).get();
  if (!tokenSnap.exists) throw new HttpsError("not-found", "This Pulse link is not active.");
  const token = tokenSnap.data() || {};
  if (token.active !== true) throw new HttpsError("not-found", "This Pulse link is not active.");
  const propertyId = String(token.propertyId || "");
  const deploymentId = String(token.deploymentId || "");
  const pulseId = String(token.pulseId || "");

  const [depSnap, pulseSnap] = await Promise.all([
    db.collection("properties").doc(propertyId).collection("pulseDeployments").doc(deploymentId).get(),
    db.collection("properties").doc(propertyId).collection("pulses").doc(pulseId).get(),
  ]);
  if (!depSnap.exists || !pulseSnap.exists) throw new HttpsError("not-found", "This Pulse link is not active.");
  const dep = depSnap.data() || {};
  const pulseData = pulseSnap.data() || {};
  if (dep.active !== true || pulseData.status !== "live") {
    throw new HttpsError("failed-precondition", "This Pulse is not accepting responses right now.");
  }

  const pulse = {
    questions: Array.isArray(pulseData.questions) ? pulseData.questions : [],
    logic: Array.isArray(pulseData.logic) ? pulseData.logic : [],
  } as Pick<Pulse, "questions" | "logic">;

  const roomNumber = data.roomNumber ? String(data.roomNumber).trim().slice(0, 40) : undefined;
  const contactName = data.contactName ? String(data.contactName).trim().slice(0, 80) : undefined;
  const contactMethod = data.contactMethod ? String(data.contactMethod).trim().slice(0, 120) : undefined;

  const validated = validatePulseSubmitPayload(pulse, {
    publicToken,
    answers: Array.isArray(data.answers) ? (data.answers as PulseAnswer[]) : [],
    contactRequested: data.contactRequested === true,
    contactName,
    contactMethod,
    roomNumber,
  });
  if (!validated.ok) throw new HttpsError("invalid-argument", `Could not accept answers (${validated.reason}).`);

  const nowIso = new Date().toISOString();
  // Idempotency: one clientKey per form instance. Replays return the original
  // response instead of duplicating it (and its issue + staff alert).
  const clientKey = isValidClientKey(data.clientKey) ? (data.clientKey as string) : undefined;

  const responsesCol = db.collection("properties").doc(propertyId).collection("pulseResponses");
  const issuesCol = db.collection("properties").doc(propertyId).collection("pulseIssues");

  // Atomic: response + issue land together, so a crash can never orphan an
  // issue without its response (or alert staff about nothing).
  const written = await db.runTransaction(async (tx) => {
    if (clientKey) {
      const prior = await tx.get(responsesCol.doc(`presp_${clientKey}`));
      if (prior.exists) {
        const row = prior.data() || {};
        return {
          responseId: String(row.id || prior.id),
          issueId: row.issueId ? String(row.issueId) : null,
          createIssue: false,
          duplicate: true,
        };
      }
    }
    const responseId = clientKey
      ? `presp_${clientKey}`
      : `presp_${Date.now().toString(36)}_${createPublicToken().slice(-6)}`;
    let issueId: string | undefined;

    if (validated.createIssue) {
      issueId = `pissue_${Date.now().toString(36)}_${createPublicToken().slice(-6)}`;
      const category = categoryFromPulseAnswers(validated.answers);
      const issue: PulseIssue = {
        id: issueId,
        propertyId,
        pulseId,
        responseId,
        deploymentId,
        status: "open",
        category,
        summary: issueSummaryFromAnswers(validated.answers, validated.primaryScore),
        primaryScore: validated.primaryScore,
        roomNumber,
        contactRequested: validated.askContact || data.contactRequested === true,
        contactName,
        contactMethod,
        createdAt: nowIso,
      };
      tx.set(issuesCol.doc(issueId), {
        ...issue,
        createdAt: FieldValue.serverTimestamp(),
        createdAtIso: nowIso,
      });
    }

    const response: PulseResponse = {
      id: responseId,
      propertyId,
      pulseId,
      deploymentId,
      publicToken,
      answers: validated.answers,
      primaryScore: validated.primaryScore,
      contactRequested: validated.askContact || data.contactRequested === true,
      contactName,
      contactMethod,
      roomNumber,
      issueId,
      clientKey,
      createdAt: nowIso,
      uid,
      anonymous: isAnonymousAuth(request),
    };
    tx.set(responsesCol.doc(responseId), {
      ...response,
      createdAt: FieldValue.serverTimestamp(),
      createdAtIso: nowIso,
    });
    return { responseId, issueId: issueId || null, createIssue: Boolean(issueId), duplicate: false };
  });

  if (written.duplicate) return written;

  const responseId = written.responseId;
  const issueId = written.issueId;

  await writeAuthoritativeEvent({
    uid,
    eventName: "pulse_response_completed",
    contextId: propertyId,
    contextType: "property",
    source: "qr",
    anonymous: isAnonymousAuth(request),
    properties: {
      contextId: propertyId,
      pulseId,
      responseId,
      scoreBucket: scoreBucket(validated.primaryScore) || null,
      issueCreated: Boolean(issueId),
    },
  });

  if (issueId) {
    await writeAuthoritativeEvent({
      uid,
      eventName: "pulse_issue_created",
      contextId: propertyId,
      contextType: "property",
      source: "internal",
      anonymous: isAnonymousAuth(request),
      properties: {
        contextId: propertyId,
        pulseId,
        issueId,
        responseId,
        category: categoryFromPulseAnswers(validated.answers),
      },
    });
  }

  return { responseId, issueId: issueId || null, createIssue: Boolean(issueId) };
});

/** host_admin / business / creator — create Pulse (draft). */
export const createPulse = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "createPulse");
  const uid = requireAuth(request.auth?.uid);
  if (isAnonymousAuth(request)) throw new HttpsError("failed-precondition", "Sign in to create a Pulse.");

  const data = (request.data || {}) as Record<string, unknown>;
  const propertyId = String(data.propertyId || `usr_${uid}`).trim();
  if (!propertyId) throw new HttpsError("invalid-argument", "propertyId is required.");

  const prop = await loadProperty(propertyId, uid);
  const { isHostAdmin } = callerFlags(request, propertyId, prop);
  if (!isHostAdmin) throw new HttpsError("permission-denied", "You do not have permission to manage this Pulse.");

  const template = String(data.template || "general_csat") as PulseTemplate;
  if (!PULSE_TEMPLATES.includes(template)) {
    throw new HttpsError("invalid-argument", `Unsupported template: ${template}`);
  }

  const nowIso = new Date().toISOString();
  const pulseId = `pulse_${Date.now().toString(36)}_${createPublicToken().slice(-6)}`;
  const draftName = typeof data.name === "string" && data.name.trim() ? data.name.trim().slice(0, 80) : undefined;
  const draft = createPulseTemplate(template, propertyId, uid, draftName);
  const customTitle = typeof data.title === "string" && data.title.trim() ? data.title.trim().slice(0, 80) : "";
  const customImage = typeof data.imageUrl === "string" ? data.imageUrl.trim() : "";
  if (customImage && !pulseImageUrlOk(customImage)) {
    throw new HttpsError("invalid-argument", "Cover image must be an https URL.");
  }
  if (customTitle || customImage) {
    draft.branding = {
      title: customTitle || draft.branding?.title,
      ...(customImage ? { imageUrl: customImage } : {}),
    };
  }

  await db
    .collection("properties")
    .doc(propertyId)
    .collection("pulses")
    .doc(pulseId)
    .set({
      ...draft,
      id: pulseId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    });

  return { pulseId, status: "draft" as const };
});

/** host_admin / business / creator — publish Pulse + create deployment token. */
export const publishPulse = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "publishPulse");
  const uid = requireAuth(request.auth?.uid);
  if (isAnonymousAuth(request)) throw new HttpsError("failed-precondition", "Sign in to publish a Pulse.");

  const data = (request.data || {}) as Record<string, unknown>;
  const propertyId = String(data.propertyId || `usr_${uid}`).trim();
  const pulseId = String(data.pulseId || "").trim();
  if (!propertyId || !pulseId) throw new HttpsError("invalid-argument", "propertyId and pulseId are required.");

  const prop = await loadProperty(propertyId, uid);
  const { isHostAdmin } = callerFlags(request, propertyId, prop);
  if (!isHostAdmin) throw new HttpsError("permission-denied", "You do not have permission to publish this Pulse.");

  const pulseRef = db.collection("properties").doc(propertyId).collection("pulses").doc(pulseId);
  const pulseSnap = await pulseRef.get();
  if (!pulseSnap.exists) throw new HttpsError("not-found", "Pulse not found.");

  const publicToken = createPublicToken();
  const deploymentId = `pdep_${Date.now().toString(36)}_${createPublicToken().slice(-6)}`;
  const nowIso = new Date().toISOString();
  const placement = data.placement === "lobby" || data.placement === "other" ? data.placement : "room";

  await db
    .collection("properties")
    .doc(propertyId)
    .collection("pulseDeployments")
    .doc(deploymentId)
    .set({
      id: deploymentId,
      propertyId,
      pulseId,
      publicToken,
      placement,
      label: typeof data.label === "string" ? data.label.trim().slice(0, 80) : "Room card",
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      createdAtIso: nowIso,
      createdBy: uid,
    });

  await db.collection("pulseTokens").doc(publicToken).set({
    propertyId,
    pulseId,
    deploymentId,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  await pulseRef.set(
    {
      status: "live",
      publishedAt: nowIso,
      updatedAt: FieldValue.serverTimestamp(),
      updatedAtIso: nowIso,
      activeDeploymentId: deploymentId,
      activePublicToken: publicToken,
    },
    { merge: true },
  );

  await db.collection("properties").doc(propertyId).set(
    {
      activePulsePublicToken: publicToken,
      activePulseId: pulseId,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { deploymentId, publicToken, path: buildPulsePublicPath(publicToken) };
});

export const acknowledgePulseIssue = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "acknowledgePulseIssue");
  const uid = requireAuth(request.auth?.uid);
  if (isAnonymousAuth(request)) throw new HttpsError("failed-precondition", "Sign in required.");

  const data = (request.data || {}) as Record<string, unknown>;
  const propertyId = String(data.propertyId || "").trim();
  const issueId = String(data.issueId || "").trim();
  if (!propertyId || !issueId) throw new HttpsError("invalid-argument", "propertyId and issueId are required.");

  const prop = await loadProperty(propertyId, uid);
  const { isStaff } = callerFlags(request, propertyId, prop);
  if (!isStaff) throw new HttpsError("permission-denied", "Only host staff can acknowledge issues.");

  const ref = db.collection("properties").doc(propertyId).collection("pulseIssues").doc(issueId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Issue not found.");
  const row = snap.data() || {};
  if (row.status === "resolved") throw new HttpsError("failed-precondition", "Issue already resolved.");

  const assignee =
    typeof data.assigneeUid === "string" && data.assigneeUid ? data.assigneeUid : uid;
  if (assignee !== uid) {
    const members =
      prop.members && typeof prop.members === "object" ? (prop.members as Record<string, unknown>) : {};
    if (assignee !== prop.ownerId && !members[assignee]) {
      throw new HttpsError("invalid-argument", "Assignee is not on this property team.");
    }
  }

  const nowIso = new Date().toISOString();
  await ref.set(
    {
      status: "acknowledged",
      acknowledgedAt: nowIso,
      acknowledgedBy: uid,
      assigneeUid: assignee,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await writeAuthoritativeEvent({
    uid,
    eventName: "pulse_issue_acknowledged",
    contextId: propertyId,
    contextType: "property",
    source: "internal",
    properties: {
      contextId: propertyId,
      issueId,
      pulseId: String(row.pulseId || ""),
    },
  });

  return { ok: true as const };
});

export const resolvePulseIssue = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "resolvePulseIssue");
  const uid = requireAuth(request.auth?.uid);
  if (isAnonymousAuth(request)) throw new HttpsError("failed-precondition", "Sign in required.");

  const data = (request.data || {}) as Record<string, unknown>;
  const propertyId = String(data.propertyId || "").trim();
  const issueId = String(data.issueId || "").trim();
  const resolutionNote = String(data.resolutionNote || "").trim().slice(0, 500);
  if (!propertyId || !issueId) throw new HttpsError("invalid-argument", "propertyId and issueId are required.");

  const prop = await loadProperty(propertyId, uid);
  const { isStaff } = callerFlags(request, propertyId, prop);
  if (!isStaff) throw new HttpsError("permission-denied", "Only host staff can resolve issues.");

  const ref = db.collection("properties").doc(propertyId).collection("pulseIssues").doc(issueId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Issue not found.");
  const row = snap.data() || {};

  const nowIso = new Date().toISOString();
  const createdMs = Date.parse(String(row.createdAtIso || row.createdAt || nowIso));
  const resolutionTimeMs = Number.isFinite(createdMs) ? Math.max(0, Date.now() - createdMs) : undefined;

  await ref.set(
    {
      status: "resolved",
      resolvedAt: nowIso,
      resolvedBy: uid,
      resolutionNote: resolutionNote || null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await writeAuthoritativeEvent({
    uid,
    eventName: "pulse_issue_resolved",
    contextId: propertyId,
    contextType: "property",
    source: "internal",
    properties: {
      contextId: propertyId,
      issueId,
      pulseId: String(row.pulseId || ""),
      resolutionTimeMs: resolutionTimeMs ?? null,
    },
  });

  return { ok: true as const };
});

/** host_admin — pause / resume / archive a Pulse. Pausing and archiving revoke the public token. */
export const setPulseStatus = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "setPulseStatus");
  const uid = requireAuth(request.auth?.uid);
  if (isAnonymousAuth(request)) throw new HttpsError("failed-precondition", "Sign in with a host account.");

  const data = (request.data || {}) as Record<string, unknown>;
  const propertyId = String(data.propertyId || "").trim();
  const pulseId = String(data.pulseId || "").trim();
  const status = String(data.status || "").trim() as PulseStatus;
  if (!propertyId || !pulseId) throw new HttpsError("invalid-argument", "propertyId and pulseId are required.");
  if (status !== "live" && status !== "paused" && status !== "archived") {
    throw new HttpsError("invalid-argument", "status must be live, paused, or archived.");
  }

  const prop = await loadProperty(propertyId, uid);
  const { isHostAdmin } = callerFlags(request, propertyId, prop);
  if (!isHostAdmin) throw new HttpsError("permission-denied", "Only a host admin can change Pulse status.");

  const pulseRef = db.collection("properties").doc(propertyId).collection("pulses").doc(pulseId);
  const snap = await pulseRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Pulse not found.");
  const row = snap.data() || {};
  const current = String(row.status || "draft") as PulseStatus;
  if (!resolvePulseStatusTransition(current, status)) {
    throw new HttpsError("failed-precondition", `Cannot move a Pulse from ${current} to ${status}.`);
  }

  const deploymentId = String(row.activeDeploymentId || "");
  const publicToken = String(row.activePublicToken || "");
  const nowIso = new Date().toISOString();
  const batch = db.batch();
  batch.set(
    pulseRef,
    { status, updatedAt: FieldValue.serverTimestamp(), updatedAtIso: nowIso },
    { merge: true },
  );
  const active = status === "live";
  if (deploymentId) {
    batch.set(
      db.collection("properties").doc(propertyId).collection("pulseDeployments").doc(deploymentId),
      { active, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  }
  if (publicToken) {
    batch.set(db.collection("pulseTokens").doc(publicToken), { active }, { merge: true });
  }
  if (status === "archived" && prop.activePulseId === pulseId) {
    batch.set(
      db.collection("properties").doc(propertyId),
      { activePulsePublicToken: null, activePulseId: null, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  }
  await batch.commit();

  await writeAuthoritativeEvent({
    uid,
    eventName: "pulse_status_changed",
    contextId: propertyId,
    contextType: "property",
    source: "internal",
    properties: {
      contextId: propertyId,
      pulseId,
      from: current,
      to: status,
    },
  });

  return { status };
});

/**
 * Staff-recorded guest follow-up on a resolved issue (score 1–5 + note).
 * Guest-initiated SMS follow-up needs a messaging vendor and is not built.
 */
export const recordPulseFollowup = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "recordPulseFollowup");
  const uid = requireAuth(request.auth?.uid);
  if (isAnonymousAuth(request)) throw new HttpsError("failed-precondition", "Sign in required.");

  const data = (request.data || {}) as Record<string, unknown>;
  const propertyId = String(data.propertyId || "").trim();
  const issueId = String(data.issueId || "").trim();
  if (!propertyId || !issueId) throw new HttpsError("invalid-argument", "propertyId and issueId are required.");

  const checked = validatePulseFollowup(data.score, data.note);
  if (!checked.ok) throw new HttpsError("invalid-argument", `Invalid follow-up (${checked.reason}).`);

  const prop = await loadProperty(propertyId, uid);
  const { isStaff } = callerFlags(request, propertyId, prop);
  if (!isStaff) throw new HttpsError("permission-denied", "Only host staff can record a follow-up.");

  const ref = db.collection("properties").doc(propertyId).collection("pulseIssues").doc(issueId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Issue not found.");
  const row = snap.data() || {};
  if (row.status !== "resolved") {
    throw new HttpsError("failed-precondition", "Follow-up is recorded after resolution.");
  }

  const nowIso = new Date().toISOString();
  await ref.set(
    {
      followupScore: checked.score,
      followupAt: nowIso,
      followupNote: checked.note ?? null,
      followupBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await writeAuthoritativeEvent({
    uid,
    eventName: "pulse_followup_completed",
    contextId: propertyId,
    contextType: "property",
    source: "internal",
    properties: {
      contextId: propertyId,
      issueId,
      scoreBucket: scoreBucket(checked.score) || null,
    },
  });

  return { ok: true as const };
});

/** Mirror tickets: hostAlerts + FCM when a Pulse issue is created. */
export const onPulseIssueCreated = onDocumentCreated(
  { document: "properties/{propertyId}/pulseIssues/{issueId}", retry: true },
  async (event) => {
    const propertyId = String(event.params.propertyId || "");
    const issueId = String(event.params.issueId || "");
    const data = event.data?.data() || {};
    if (!propertyId || data.status === "resolved") return;

    const propSnap = await db.collection("properties").doc(propertyId).get();
    const prop = (propSnap.data() || {}) as Record<string, unknown>;
    const place = String(prop.name || "AirPal stay");
    const room = String(data.roomNumber || "Guest");
    const summary = String(data.summary || "New Pulse issue");
    const title = `${place} · Pulse issue`;
    const body = (room !== "Guest" ? `Room ${room} · ` : "") + summary.slice(0, 140);
    const uids = hostUids(prop);
    const tokens: string[] = [];

    for (const hostUid of uids) {
      await db.collection("users").doc(hostUid).collection("hostAlerts").doc(issueId).set({
        type: "pulse_issue",
        propertyId,
        issueId,
        pulseId: String(data.pulseId || ""),
        title,
        body,
        createdAt: FieldValue.serverTimestamp(),
        read: false,
      });
      const tokSnap = await db.collection("users").doc(hostUid).collection("fcmTokens").get();
      for (const row of tokSnap.docs) {
        const token = String(row.data().token || "");
        if (token) tokens.push(token);
      }
    }

    if (!tokens.length) return;
    try {
      await getMessaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: {
          type: "pulse_issue",
          propertyId,
          issueId,
        },
        webpush: {
          fcmOptions: { link: "https://airpal.me/host/pulse" },
        },
      });
    } catch {
      /* push must not fail issue create */
    }
  },
);
