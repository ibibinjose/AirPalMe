import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { ticketAdmitCheck, type Booking } from "../../shared/booking";
import {
  guestEntryIdForRsvp,
  guestEntryIdForTicket,
  summarizeGuestlist,
  type GuestStatus,
} from "../../shared/guestlist";
import type {
  AccessClaims,
  CheckInGuestRequest,
  CheckInGuestResponse,
  CloseGuestlistRequest,
  CloseGuestlistResponse,
} from "../../shared/airpal-security";
import { enforceRateLimit, noteAppCheck, writeAudit } from "./abuse";
import { CALLABLE, db, isPlatformAdmin, requireAccount } from "./admin";

/**
 * Event guestlist server: triggers keep rows in sync with RSVPs and
 * tickets, callables power the door. Every write is idempotent
 * (deterministic ids, status guards) so redeliveries can't duplicate rows.
 *
 * Status guards never downgrade a checked-in guest: refunds and RSVP
 * withdrawals after the door stay visible to the host instead of vanishing.
 */

const TERMINAL_KEEP = new Set(["checked-in", "no-show"]);

async function eventOrganiserUid(eventId: string): Promise<string | null> {
  if (!eventId) return null;
  const snap = await db.collection("events").doc(eventId).get();
  if (!snap.exists) return null;
  return String(snap.data()?.organiserUid || "") || null;
}

async function requireOrganiser(eventId: string, uid: string, claims: AccessClaims | undefined) {
  const organiserUid = await eventOrganiserUid(eventId);
  if (!organiserUid) throw new HttpsError("not-found", "Event not found.");
  if (organiserUid !== uid && !isPlatformAdmin(claims)) {
    throw new HttpsError("permission-denied", "Only the event organiser can manage the guestlist.");
  }
}

async function guestDisplayFor(uid: string): Promise<{ name: string; handle?: string; verified: boolean }> {
  try {
    const snap = await db.collection("users").doc(uid).get();
    const d = (snap.data() || {}) as Record<string, unknown>;
    const rawHandle = typeof d.handle === "string" ? d.handle.replace(/^@/, "").trim() : "";
    const name =
      [d.displayName, d.firstName, rawHandle ? `@${rawHandle}` : ""]
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .find((v) => v.length > 0) || "Guest";
    return {
      name: name.slice(0, 80),
      handle: rawHandle || undefined,
      verified: d.isVerified === true || d.verified === true,
    };
  } catch {
    return { name: "Guest", verified: false };
  }
}

/** Public counts mirror: heads per status, never names. Recomputed from rows. */
export async function refreshGuestCounts(eventId: string): Promise<void> {
  const snap = await db.collection("events").doc(eventId).collection("guestlist").get();
  const counts = summarizeGuestlist(
    snap.docs.map((row) => {
      const d = row.data() as { status?: GuestStatus; partySize?: number };
      return { status: d.status || "going", partySize: Number(d.partySize) || 1 };
    }),
  );
  const now = new Date().toISOString();
  await db.collection("events").doc(eventId).set({ guestCounts: counts, guestCountsAt: now }, { merge: true });
}

/**
 * RSVP → guestlist. "going" upserts the account row; anything else
 * (interested, withdrawn, deleted) cancels it unless the door already saw
 * them. Events that don't exist in Firestore are skipped, so local and
 * curated calendar saves never create orphan rows.
 */
export const onGuestRsvpWritten = onDocumentWritten("users/{uid}/calendar/{eventId}", async (event) => {
  const uid = String(event.params.uid || "");
  const eventId = String(event.params.eventId || "");
  if (!uid || !eventId) return;
  if ((await eventOrganiserUid(eventId)) === null) return;

  const after = event.data?.after.data() as { status?: string } | undefined;
  const ref = db.collection("events").doc(eventId).collection("guestlist").doc(guestEntryIdForRsvp(uid));

  if (after?.status === "going") {
    const existing = await ref.get();
    if (existing.exists && TERMINAL_KEEP.has(String(existing.data()?.status))) {
      await refreshGuestCounts(eventId);
      return;
    }
    const display = await guestDisplayFor(uid);
    const now = new Date().toISOString();
    await ref.set(
      {
        name: display.name,
        uid,
        ...(display.handle ? { handle: display.handle } : {}),
        verified: display.verified,
        status: "going",
        partySize: 1,
        source: "rsvp",
        addedBy: uid,
        addedAt: now,
        checkedInAt: null,
      },
      { merge: true },
    );
  } else {
    const existing = await ref.get();
    if (!existing.exists) return;
    const data = existing.data() as { status?: string; source?: string };
    if (data.source !== "rsvp" || TERMINAL_KEEP.has(String(data.status))) return;
    await ref.set({ status: "cancelled" }, { merge: true });
  }
  await refreshGuestCounts(eventId);
});

/**
 * Ticket → guestlist. Admissible bookings (paid or free, still open)
 * upsert the ticket row; cancelled/refunded/disputed bookings cancel it.
 * Pending-unpaid and completed bookings are skipped: rows appear when
 * money lands, and finished bookings don't resurrect the list.
 */
export const onGuestBookingWritten = onDocumentWritten("bookings/{bookingId}", async (event) => {
  const bookingId = String(event.params.bookingId || "");
  if (!bookingId) return;
  const after = event.data?.after.data() as Omit<Booking, "id"> | undefined;
  if (!after?.eventId) return;
  const eventId = String(after.eventId);
  if ((await eventOrganiserUid(eventId)) === null) return;

  const ref = db.collection("events").doc(eventId).collection("guestlist").doc(guestEntryIdForTicket(bookingId));
  const check = ticketAdmitCheck(after);
  if (check.valid) {
    const existing = await ref.get();
    if (existing.exists && TERMINAL_KEEP.has(String(existing.data()?.status))) {
      await refreshGuestCounts(eventId);
      return;
    }
    const customerUid = String(after.customerUid || "");
    const display = customerUid ? await guestDisplayFor(customerUid) : { name: "Guest", verified: false };
    const partySize = Math.min(20, Math.max(1, Number(after.spots) || 1));
    const now = new Date().toISOString();
    await ref.set(
      {
        name: display.name,
        ...(customerUid ? { uid: customerUid } : {}),
        ...(display.handle ? { handle: display.handle } : {}),
        verified: display.verified,
        status: "going",
        partySize,
        ticketId: bookingId,
        source: "ticket",
        addedBy: customerUid || "system",
        addedAt: now,
        checkedInAt: null,
      },
      { merge: true },
    );
  } else if (check.reason === "cancelled" || check.reason === "refunded" || check.reason === "disputed") {
    const existing = await ref.get();
    if (!existing.exists) return;
    if (TERMINAL_KEEP.has(String(existing.data()?.status))) return;
    await ref.set({ status: "cancelled" }, { merge: true });
  } else {
    return;
  }
  await refreshGuestCounts(eventId);
});

/**
 * Door check-in for one guestlist row. Organiser or admin only,
 * idempotent: re-scans return already:true instead of double-counting.
 */
export const checkInGuest = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "checkInGuest");
  const uid = requireAccount(request, "Sign in to check guests in.");
  await enforceRateLimit(uid, "gate", false);
  const data = (request.data || {}) as CheckInGuestRequest;
  const eventId = String(data.eventId || "").trim();
  const entryId = String(data.entryId || "").trim();
  if (!eventId || !entryId) throw new HttpsError("invalid-argument", "eventId and entryId are required.");
  await requireOrganiser(eventId, uid, request.auth?.token as AccessClaims | undefined);

  const ref = db.collection("events").doc(eventId).collection("guestlist").doc(entryId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Guest not found on this list.");
  const current = String(snap.data()?.status);
  if (current === "checked-in") {
    const already: CheckInGuestResponse = {
      eventId,
      entryId,
      checkedInAt: String(snap.data()?.checkedInAt || ""),
      already: true,
    };
    return already;
  }
  const now = new Date().toISOString();
  await ref.set({ status: "checked-in", checkedInAt: now }, { merge: true });
  await refreshGuestCounts(eventId);
  await writeAudit({
    collection: `events/${eventId}/guestlist`,
    docId: entryId,
    action: "update",
    actorUid: uid,
    note: "door check-in",
  });
  const done: CheckInGuestResponse = { eventId, entryId, checkedInAt: now, already: false };
  return done;
});

/**
 * Close the list after doors: every still-going row becomes a no-show.
 * Checked-in rows are untouched. One tap, batched, with counts back.
 */
export const closeGuestlist = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "closeGuestlist");
  const uid = requireAccount(request, "Sign in to close the guestlist.");
  await enforceRateLimit(uid, "gate", false);
  const data = (request.data || {}) as CloseGuestlistRequest;
  const eventId = String(data.eventId || "").trim();
  if (!eventId) throw new HttpsError("invalid-argument", "eventId is required.");
  await requireOrganiser(eventId, uid, request.auth?.token as AccessClaims | undefined);

  const col = db.collection("events").doc(eventId).collection("guestlist");
  const snap = await col.where("status", "in", ["going", "invited"]).get();
  let closed = 0;
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = db.batch();
    for (const row of snap.docs.slice(i, i + 400)) {
      batch.set(row.ref, { status: "no-show" }, { merge: true });
      closed += 1;
    }
    await batch.commit();
  }
  await refreshGuestCounts(eventId);
  await writeAudit({
    collection: `events/${eventId}/guestlist`,
    docId: "-",
    action: "update",
    actorUid: uid,
    note: `close guestlist (${closed} no-shows)`,
  });
  const done: CloseGuestlistResponse = { eventId, closed };
  return done;
});

/**
 * Called by admitTicket after a successful gate scan: the ticket row (or
 * the guest's RSVP row when no ticket row exists yet) flips to checked-in.
 * Exported for the gate, not a callable.
 */
export async function markTicketCheckedIn(eventId: string, ticketId: string, customerUid: string): Promise<void> {
  if (!eventId || !ticketId) return;
  const now = new Date().toISOString();
  const col = db.collection("events").doc(eventId).collection("guestlist");
  const ticketRef = col.doc(guestEntryIdForTicket(ticketId));
  const ticketSnap = await ticketRef.get();
  if (ticketSnap.exists) {
    if (String(ticketSnap.data()?.status) !== "checked-in") {
      await ticketRef.set({ status: "checked-in", checkedInAt: now }, { merge: true });
    }
  } else if (customerUid) {
    const rsvpRef = col.doc(guestEntryIdForRsvp(customerUid));
    const rsvpSnap = await rsvpRef.get();
    if (rsvpSnap.exists) {
      if (String(rsvpSnap.data()?.status) !== "checked-in") {
        await rsvpRef.set({ status: "checked-in", checkedInAt: now, ticketId }, { merge: true });
      }
    } else {
      const display = await guestDisplayFor(customerUid);
      await ticketRef.set({
        name: display.name,
        uid: customerUid,
        ...(display.handle ? { handle: display.handle } : {}),
        verified: display.verified,
        status: "checked-in",
        partySize: 1,
        ticketId,
        source: "ticket",
        addedBy: customerUid,
        addedAt: now,
        checkedInAt: now,
      });
    }
  }
  await refreshGuestCounts(eventId);
}
