import { FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { AccessClaims, TICKET_CATEGORIES } from "../../shared/airpal-security";
import { resolveTicketPriority, type StaffTicket } from "../../shared/airpal-data";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import { CALLABLE, db, isPlatformAdmin, requireAuth } from "./admin";

const CATEGORIES = new Set<string>(TICKET_CATEGORIES);

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

export const createStaffTicket = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "createStaffTicket");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "ticket", isAnonymousAuth(request));
  const data = (request.data || {}) as Record<string, unknown>;
  const propertyId = String(data.propertyId || "").trim();
  const details = String(data.details || "").trim();
  const roomNumber = String(data.roomNumber || "Guest").trim() || "Guest";
  const category = String(data.category || "reception");
  const urgency = data.urgency === "urgent" ? "urgent" : "normal";
  if (!propertyId) throw new HttpsError("invalid-argument", "propertyId is required.");
  if (details.length < 1 || details.length > 500) throw new HttpsError("invalid-argument", "Describe the request.");
  if (!CATEGORIES.has(category)) throw new HttpsError("invalid-argument", "Unknown category.");

  const propSnap = await db.collection("properties").doc(propertyId).get();
  if (!propSnap.exists) throw new HttpsError("not-found", "This stay isn’t listed yet.");

  const ticketId = `tick_${propertyId}_${Date.now()}`;
  const ticket: StaffTicket = {
    id: ticketId,
    propertyId,
    roomNumber,
    guestName: roomNumber === "Guest" ? "Guest" : `Room ${roomNumber}`,
    category: category as StaffTicket["category"],
    details,
    status: "pending",
    createdAt: new Date().toISOString(),
    urgency,
  };
  ticket.priority = resolveTicketPriority(ticket);

  await db.collection("properties").doc(propertyId).collection("tickets").doc(ticketId).set({
    ...ticket,
    uid,
    createdAt: FieldValue.serverTimestamp(),
    createdAtIso: ticket.createdAt,
  });

  return { ticketId };
});

export const resolveStaffTicket = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "resolveStaffTicket");
  const uid = requireAuth(request.auth?.uid);
  const data = (request.data || {}) as Record<string, unknown>;
  const propertyId = String(data.propertyId || "").trim();
  const ticketId = String(data.ticketId || "").trim();
  if (!propertyId || !ticketId) throw new HttpsError("invalid-argument", "propertyId and ticketId are required.");

  const propSnap = await db.collection("properties").doc(propertyId).get();
  if (!propSnap.exists) throw new HttpsError("not-found", "Property not found.");
  const prop = propSnap.data() || {};
  const caller = (request.auth?.token || {}) as AccessClaims;
  const role = caller.properties?.[propertyId];
  const allowed =
    isPlatformAdmin(caller) || prop.ownerId === uid || role === "host_admin" || role === "staff";
  if (!allowed) throw new HttpsError("permission-denied", "Only the host can close this request.");

  const ref = db.collection("properties").doc(propertyId).collection("tickets").doc(ticketId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Ticket not found.");
  await ref.set(
    {
      status: "resolved",
      resolvedAt: new Date().toISOString(),
      resolvedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { ok: true as const };
});

export const onStaffTicketCreated = onDocumentCreated(
  "properties/{propertyId}/tickets/{ticketId}",
  async (event) => {
    const propertyId = String(event.params.propertyId || "");
    const ticketId = String(event.params.ticketId || "");
    const data = event.data?.data() || {};
    if (!propertyId || data.status === "resolved") return;

    const propSnap = await db.collection("properties").doc(propertyId).get();
    const prop = (propSnap.data() || {}) as Record<string, unknown>;
    const place = String(prop.name || "AirPal stay");
    const room = String(data.roomNumber || "Guest");
    const details = String(data.details || "New guest request");
    const title = `${place} · Room ${room}`;
    const body = details.slice(0, 140);
    const uids = hostUids(prop);
    const tokens: string[] = [];

    for (const hostUid of uids) {
      await db.collection("users").doc(hostUid).collection("hostAlerts").doc(ticketId).set({
        type: "staff_ticket",
        propertyId,
        ticketId,
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
      const res = await getMessaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: {
          type: "staff_ticket",
          propertyId,
          ticketId,
        },
        webpush: {
          fcmOptions: { link: "https://airpal.me/host" },
        },
      });
      res.responses.forEach((row) => {
        if (row.success) return;
        /* Invalid tokens are dropped the next time the host re-enables alerts. */
      });
    } catch {
      /* push must not fail ticket create */
    }
  },
);
