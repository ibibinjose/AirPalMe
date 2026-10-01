import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  bookingDisplayPaid,
  ticketAdmitCheck,
  ticketAdmitReasonLabel,
  type Booking,
} from "../../shared/booking";
import {
  type AccessClaims,
  type AdmitTicketRequest,
  type AdmitTicketResponse,
  type VerifyTicketRequest,
  type VerifyTicketResponse,
} from "../../shared/airpal-security";
import { enforceRateLimit, noteAppCheck, writeAudit } from "./abuse";
import { CALLABLE, db, isPlatformAdmin, requireAccount } from "./admin";

/**
 * Gate scan: load a ticket the caller is entitled to verify. Organisers
 * (event bookings carry providerUid = organiserUid, with an explicit
 * organiser fallback for legacy rows), providers, and platform admins.
 * Everyone else — including the ticket owner — is denied: owners read
 * their own pass from the wallet, they never self-admit.
 */
async function loadEntitledTicket(ticketId: string, uid: string, claims: AccessClaims | undefined) {
  const ref = db.collection("bookings").doc(ticketId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Ticket not found.");
  const booking = { id: snap.id, ...(snap.data() as Omit<Booking, "id">) };
  const entitled =
    isPlatformAdmin(claims) ||
    booking.providerUid === uid ||
    (await isEventOrganiser(booking.eventId, uid));
  if (!entitled) {
    throw new HttpsError("permission-denied", "Only the event organiser can verify tickets.");
  }
  let eventName = "";
  if (booking.eventId) {
    const eventSnap = await db.collection("events").doc(booking.eventId).get();
    if (eventSnap.exists) eventName = String(eventSnap.data()?.name || "");
  }
  return { ref, booking, eventName };
}

async function isEventOrganiser(eventId: string | undefined, uid: string): Promise<boolean> {
  if (!eventId) return false;
  const snap = await db.collection("events").doc(eventId).get();
  return snap.exists && String(snap.data()?.organiserUid || "") === uid;
}

function ticketIdFromRequest(data: VerifyTicketRequest | AdmitTicketRequest | undefined): string {
  const ticketId = String(data?.ticketId || "").trim();
  if (!ticketId) throw new HttpsError("invalid-argument", "ticketId is required.");
  return ticketId;
}

/**
 * Read-only ticket check for gate staff. Returns everything the gate needs
 * to match the ticket — and nothing identifying the holder.
 */
export const verifyTicket = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "verifyTicket");
  const uid = requireAccount(request, "Sign in to verify tickets.");
  await enforceRateLimit(uid, "gate", false);
  const ticketId = ticketIdFromRequest(request.data as VerifyTicketRequest | undefined);
  const { booking, eventName } = await loadEntitledTicket(
    ticketId,
    uid,
    request.auth?.token as AccessClaims | undefined,
  );
  const check = ticketAdmitCheck(booking);
  const response: VerifyTicketResponse = {
    ticketId,
    eventId: booking.eventId || "",
    eventName,
    title: booking.title || "",
    date: booking.date || "",
    time: booking.time || "",
    spots: Number(booking.spots || 1),
    paymentStatus: booking.paymentStatus,
    displayPaid: bookingDisplayPaid(booking),
    status: booking.status,
    valid: check.valid,
    reason: check.valid ? null : check.reason,
    admittedAt: booking.admittedAt || null,
  };
  return response;
});

/**
 * Admit a verified ticket. Idempotent: double scans return the first
 * admission instead of erroring, so a shaky gate connection never
 * double-admits or strands a guest.
 */
export const admitTicket = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "admitTicket");
  const uid = requireAccount(request, "Sign in to admit tickets.");
  await enforceRateLimit(uid, "gate", false);
  const ticketId = ticketIdFromRequest(request.data as AdmitTicketRequest | undefined);
  const { ref, booking } = await loadEntitledTicket(
    ticketId,
    uid,
    request.auth?.token as AccessClaims | undefined,
  );
  if (booking.admittedAt) {
    const already: AdmitTicketResponse = { ticketId, admittedAt: booking.admittedAt, already: true };
    return already;
  }
  const check = ticketAdmitCheck(booking);
  if (!check.valid) {
    throw new HttpsError("failed-precondition", ticketAdmitReasonLabel(check.reason));
  }
  const now = new Date().toISOString();
  await ref.set({ admittedAt: now, admittedByUid: uid, updatedAt: now }, { merge: true });
  await writeAudit({
    collection: "bookings",
    docId: ticketId,
    action: "update",
    actorUid: uid,
    note: "gate admit",
  });
  const admitted: AdmitTicketResponse = { ticketId, admittedAt: now, already: false };
  return admitted;
});
