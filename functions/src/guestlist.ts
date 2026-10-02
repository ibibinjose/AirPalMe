import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { ticketAdmitCheck, type Booking } from "../../shared/booking";
import type { PlanAttendeeStatus } from "../../shared/plan";
import {
  guestEntryIdForRsvp,
  guestEntryIdForTicket,
  guestScopeCollection,
  isGuestScope,
  isListManager,
  summarizeGuestlist,
  type GuestScope,
  type GuestStatus,
} from "../../shared/guestlist";
import type {
  AccessClaims,
  CheckInGuestRequest,
  CheckInGuestResponse,
  CloseGuestlistRequest,
  CloseGuestlistResponse,
  ListDoorTeamRequest,
  ListDoorTeamResponse,
} from "../../shared/airpal-security";
import { enforceRateLimit, noteAppCheck, writeAudit } from "./abuse";
import { CALLABLE, db, isPlatformAdmin, requireAccount } from "./admin";

/**
 * Guestlist server for events and plans: triggers keep rows in sync with
 * RSVPs and tickets, callables power the door. Every write is idempotent
 * (deterministic ids, status guards) so redeliveries can't duplicate rows.
 *
 * The door team is the owner plus listed co-hosts (events grow coHostUids,
 * plans reuse theirs). Status guards never downgrade a checked-in guest:
 * refunds and RSVP withdrawals after the door stay visible instead of
 * vanishing.
 */

const TERMINAL_KEEP = new Set(["checked-in", "no-show"]);

export interface ScopeHosts {
  ownerUid: string;
  coHostUids: string[];
}

/** Owner + co-hosts for either scope. Null when the event/plan doesn't exist. */
export async function scopeHostUids(scope: GuestScope, id: string): Promise<ScopeHosts | null> {
  if (!id) return null;
  const snap = await db.collection(guestScopeCollection(scope)).doc(id).get();
  if (!snap.exists) return null;
  const data = (snap.data() || {}) as Record<string, unknown>;
  const ownerUid =
    scope === "event"
      ? String(data.organiserUid || "")
      : String((data.creator as Record<string, unknown> | undefined)?.uid || "");
  const coHostUids = Array.isArray(data.coHostUids)
    ? (data.coHostUids as unknown[]).filter((v): v is string => typeof v === "string")
    : [];
  if (!ownerUid) return null;
  return { ownerUid, coHostUids };
}

async function requireHost(scope: GuestScope, id: string, uid: string, claims: AccessClaims | undefined) {
  const hosts = await scopeHostUids(scope, id);
  if (!hosts) throw new HttpsError("not-found", scope === "event" ? "Event not found." : "Plan not found.");
  if (!isListManager(hosts, uid) && !isPlatformAdmin(claims)) {
    throw new HttpsError(
      "permission-denied",
      scope === "event"
        ? "Only the event organiser can manage the guestlist."
        : "Only the plan host can manage the guestlist.",
    );
  }
}

function guestlistCol(scope: GuestScope, id: string) {
  return db.collection(guestScopeCollection(scope)).doc(id).collection("guestlist");
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
export async function refreshGuestCounts(scope: GuestScope, id: string): Promise<void> {
  const snap = await guestlistCol(scope, id).get();
  const counts = summarizeGuestlist(
    snap.docs.map((row) => {
      const d = row.data() as { status?: GuestStatus; partySize?: number };
      return { status: d.status || "going", partySize: Number(d.partySize) || 1 };
    }),
  );
  const now = new Date().toISOString();
  await db
    .collection(guestScopeCollection(scope))
    .doc(id)
    .set({ guestCounts: counts, guestCountsAt: now }, { merge: true });
}

function parseScope(value: unknown): GuestScope {
  if (!isGuestScope(value)) throw new HttpsError("invalid-argument", "scope must be event or plan.");
  return value;
}

/**
 * RSVP → guestlist (events). "going" upserts the account row; anything else
 * (interested, withdrawn, deleted) cancels it unless the door already saw
 * them. Unknown events are skipped, so local calendar saves never orphan.
 */
export const onGuestRsvpWritten = onDocumentWritten("users/{uid}/calendar/{eventId}", async (event) => {
  const uid = String(event.params.uid || "");
  const eventId = String(event.params.eventId || "");
  if (!uid || !eventId) return;
  if ((await scopeHostUids("event", eventId)) === null) return;

  const after = event.data?.after.data() as { status?: string } | undefined;
  const ref = guestlistCol("event", eventId).doc(guestEntryIdForRsvp(uid));

  if (after?.status === "going") {
    const existing = await ref.get();
    if (existing.exists && TERMINAL_KEEP.has(String(existing.data()?.status))) {
      await refreshGuestCounts("event", eventId);
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
  await refreshGuestCounts("event", eventId);
});

/**
 * Plan RSVP → guestlist. Called by rsvpPlan after the attendee array lands:
 * going→going, maybe→invited, declined→cancelled. Terminal rows keep their
 * door state; names come from the RSVP itself.
 */
export async function syncPlanRsvpGuest(
  planId: string,
  uid: string,
  status: PlanAttendeeStatus,
  name: string,
): Promise<void> {
  if (!planId || !uid || (status !== "going" && status !== "maybe" && status !== "declined")) return;
  if ((await scopeHostUids("plan", planId)) === null) return;
  const ref = guestlistCol("plan", planId).doc(guestEntryIdForRsvp(uid));
  const existing = await ref.get();
  const current = existing.exists ? String(existing.data()?.status) : "";
  if (TERMINAL_KEEP.has(current)) {
    await refreshGuestCounts("plan", planId);
    return;
  }
  const now = new Date().toISOString();
  if (status === "declined") {
    if (!existing.exists) return;
    const data = existing.data() as { source?: string };
    if (data.source !== "rsvp") return;
    await ref.set({ status: "cancelled" }, { merge: true });
  } else {
    const display = await guestDisplayFor(uid);
    await ref.set(
      {
        name: (name || display.name).slice(0, 80),
        uid,
        ...(display.handle ? { handle: display.handle } : {}),
        verified: display.verified,
        status: status === "going" ? "going" : "invited",
        partySize: 1,
        source: "rsvp",
        addedBy: uid,
        addedAt: now,
        checkedInAt: null,
      },
      { merge: true },
    );
  }
  await refreshGuestCounts("plan", planId);
}

/**
 * Ticket → guestlist. Admissible bookings (paid or free, still open)
 * upsert the ticket row on the event list, else the plan list;
 * cancelled/refunded/disputed bookings cancel it. Pending-unpaid and
 * completed bookings are skipped.
 */
export const onGuestBookingWritten = onDocumentWritten("bookings/{bookingId}", async (event) => {
  const bookingId = String(event.params.bookingId || "");
  if (!bookingId) return;
  const after = event.data?.after.data() as Omit<Booking, "id"> | undefined;
  if (!after) return;
  const scope: GuestScope | null = after.eventId ? "event" : after.planId ? "plan" : null;
  if (!scope) return;
  const id = String(scope === "event" ? after.eventId : after.planId);
  if (!id || (await scopeHostUids(scope, id)) === null) return;

  const ref = guestlistCol(scope, id).doc(guestEntryIdForTicket(bookingId));
  const check = ticketAdmitCheck(after);
  if (check.valid) {
    const existing = await ref.get();
    if (existing.exists && TERMINAL_KEEP.has(String(existing.data()?.status))) {
      await refreshGuestCounts(scope, id);
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
  await refreshGuestCounts(scope, id);
});

/**
 * Door check-in for one guestlist row. Door team or admin, idempotent:
 * re-scans return already:true instead of double-counting.
 */
export const checkInGuest = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "checkInGuest");
  const uid = requireAccount(request, "Sign in to check guests in.");
  await enforceRateLimit(uid, "gate", false);
  const data = (request.data || {}) as CheckInGuestRequest;
  const scope = parseScope(data.scope);
  const id = String(data.id || "").trim();
  const entryId = String(data.entryId || "").trim();
  if (!id || !entryId) throw new HttpsError("invalid-argument", "id and entryId are required.");
  await requireHost(scope, id, uid, request.auth?.token as AccessClaims | undefined);

  const ref = guestlistCol(scope, id).doc(entryId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Guest not found on this list.");
  const current = String(snap.data()?.status);
  if (current === "checked-in") {
    const already: CheckInGuestResponse = {
      scope,
      id,
      entryId,
      checkedInAt: String(snap.data()?.checkedInAt || ""),
      already: true,
    };
    return already;
  }
  const now = new Date().toISOString();
  await ref.set({ status: "checked-in", checkedInAt: now }, { merge: true });
  await refreshGuestCounts(scope, id);
  await writeAudit({
    collection: `${guestScopeCollection(scope)}/${id}/guestlist`,
    docId: entryId,
    action: "update",
    actorUid: uid,
    note: "door check-in",
  });
  const done: CheckInGuestResponse = { scope, id, entryId, checkedInAt: now, already: false };
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
  const scope = parseScope(data.scope);
  const id = String(data.id || "").trim();
  if (!id) throw new HttpsError("invalid-argument", "id is required.");
  await requireHost(scope, id, uid, request.auth?.token as AccessClaims | undefined);

  const col = guestlistCol(scope, id);
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
  await refreshGuestCounts(scope, id);
  await writeAudit({
    collection: `${guestScopeCollection(scope)}/${id}/guestlist`,
    docId: "-",
    action: "update",
    actorUid: uid,
    note: `close guestlist (${closed} no-shows)`,
  });
  const done: CloseGuestlistResponse = { scope, id, closed };
  return done;
});

/**
 * Door-team roster with display names. users docs are private, so the
 * server resolves them — door team or admin only.
 */
export const listDoorTeam = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "listDoorTeam");
  const uid = requireAccount(request, "Sign in to see the door team.");
  await enforceRateLimit(uid, "gate", false);
  const data = (request.data || {}) as ListDoorTeamRequest;
  const scope = parseScope(data.scope);
  const id = String(data.id || "").trim();
  if (!id) throw new HttpsError("invalid-argument", "id is required.");
  await requireHost(scope, id, uid, request.auth?.token as AccessClaims | undefined);
  const hosts = (await scopeHostUids(scope, id)) as { ownerUid: string; coHostUids: string[] };
  const roster = [hosts.ownerUid, ...hosts.coHostUids.filter((v) => v !== hosts.ownerUid)].slice(0, 6);
  const members = [];
  for (const memberUid of roster) {
    const display = await guestDisplayFor(memberUid);
    members.push({
      uid: memberUid,
      name: display.name,
      ...(display.handle ? { handle: display.handle } : {}),
      owner: memberUid === hosts.ownerUid,
    });
  }
  const done: ListDoorTeamResponse = { scope, id, members };
  return done;
});

/**
 * Called by admitTicket after a successful gate scan: the ticket row (or
 * the guest's RSVP row when no ticket row exists yet) flips to checked-in.
 * Exported for the gate, not a callable.
 */
export async function markTicketCheckedIn(
  scope: GuestScope,
  id: string,
  ticketId: string,
  customerUid: string,
): Promise<void> {
  if (!id || !ticketId) return;
  if ((await scopeHostUids(scope, id)) === null) return;
  const now = new Date().toISOString();
  const col = guestlistCol(scope, id);
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
  await refreshGuestCounts(scope, id);
}
