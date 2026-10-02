import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import {
  EVENT_COHOSTS_MAX,
  guestEntryValid,
  guestScopeCollection,
  isListManager,
  type GuestEntry,
  type GuestScope,
  type GuestStatus,
} from "@shared/guestlist";

export interface GuestRow extends GuestEntry {
  id: string;
}

export interface ListHeader {
  scope: GuestScope;
  id: string;
  title: string;
  ownerUid: string;
  coHostUids: string[];
  capacity: number | null;
  backHref: string;
}

/** Door-team gate: the owner, a co-host, or a platform admin. Pure: safe to unit test. */
export function canManageGuestlist(
  header: Pick<ListHeader, "ownerUid" | "coHostUids"> | null | undefined,
  uid?: string,
  isAdmin = false,
): boolean {
  if (isAdmin && uid) return true;
  return isListManager(header, uid);
}

export function guestStatusLabel(status: GuestStatus): string {
  switch (status) {
    case "going":
      return "Going";
    case "invited":
      return "Invited";
    case "checked-in":
      return "Checked in";
    case "no-show":
      return "No-show";
    case "cancelled":
      return "Cancelled";
  }
}

/** Header for either scope: title, owner, co-hosts, capacity. Throws when missing. */
export async function fetchListHeader(scope: GuestScope, id: string): Promise<ListHeader> {
  const db = getFirebaseDb();
  if (!db || !id) throw new Error("Guestlist is unavailable right now.");
  const snap = await getDoc(doc(db, guestScopeCollection(scope), id));
  if (!snap.exists()) throw new Error("Not found.");
  const d = snap.data() as Record<string, unknown>;
  const ownerUid =
    scope === "event"
      ? String(d.organiserUid || "")
      : String((d.creator as Record<string, unknown> | undefined)?.uid || "");
  const coHostUids = Array.isArray(d.coHostUids)
    ? (d.coHostUids as unknown[]).filter((v): v is string => typeof v === "string")
    : [];
  const capacity = typeof d.capacity === "number" && Number.isInteger(d.capacity) && d.capacity > 0 ? d.capacity : null;
  const title = String(d.name || d.title || (scope === "event" ? "Event" : "Plan"));
  return {
    scope,
    id,
    title,
    ownerUid,
    coHostUids,
    capacity,
    backHref: scope === "event" ? `/e/${id}` : `/plan/${id}`,
  };
}

/** Live rows for the door screen. Door-team-only per Firestore rules. */
export function subscribeGuestlist(
  scope: GuestScope,
  id: string,
  onRows: (rows: GuestRow[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  if (!db || !id) {
    onError?.(new Error("Guestlist is unavailable right now."));
    return () => undefined;
  }
  return onSnapshot(
    collection(db, guestScopeCollection(scope), id, "guestlist"),
    (snap) => {
      onRows(
        snap.docs.map((row) => {
          const d = row.data() as Partial<GuestEntry>;
          return {
            id: row.id,
            name: typeof d.name === "string" ? d.name : "Guest",
            uid: typeof d.uid === "string" ? d.uid : undefined,
            handle: typeof d.handle === "string" ? d.handle : undefined,
            verified: d.verified === true,
            status: (d.status || "going") as GuestStatus,
            partySize: Number.isInteger(d.partySize) && (d.partySize as number) > 0 ? (d.partySize as number) : 1,
            ticketId: typeof d.ticketId === "string" ? d.ticketId : undefined,
            source: (d.source || "door") as GuestEntry["source"],
            addedBy: typeof d.addedBy === "string" ? d.addedBy : "",
            addedAt: typeof d.addedAt === "string" ? d.addedAt : "",
            checkedInAt: typeof d.checkedInAt === "string" ? d.checkedInAt : null,
            note: typeof d.note === "string" ? d.note : undefined,
          };
        }),
      );
    },
    (err) => onError?.(err as Error),
  );
}

/** Walk-in at the door: name + party size, on the list immediately. */
export async function addDoorGuest(
  scope: GuestScope,
  id: string,
  uid: string,
  input: { name: string; partySize: number; note?: string },
): Promise<string> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Guestlist is unavailable right now.");
  const entry: GuestEntry = {
    name: input.name.trim().slice(0, 80),
    status: "going",
    partySize: Math.min(20, Math.max(1, Math.floor(input.partySize) || 1)),
    source: "door",
    addedBy: uid,
    addedAt: new Date().toISOString(),
    checkedInAt: null,
    ...(input.note?.trim() ? { note: input.note.trim().slice(0, 200) } : {}),
  };
  if (!guestEntryValid(entry)) throw new Error("Add a guest name to put them on the list.");
  const ref = await addDoc(collection(db, guestScopeCollection(scope), id, "guestlist"), entry);
  return ref.id;
}

/** Host-set capacity for the going bar (events): 1..100000, whole heads only. */
export async function setEventCapacity(eventId: string, capacity: number): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Event is unavailable right now.");
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) {
    throw new Error("Capacity must be between 1 and 100,000.");
  }
  await updateDoc(doc(db, "events", eventId), { capacity, updatedAt: new Date().toISOString() });
}

/** @handle → account uid via the public handles index. Throws when unknown. */
export async function resolveHandleOwner(handle: string): Promise<{ uid: string; handle: string }> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Directory is unavailable right now.");
  const clean = handle.trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]{2,30}$/.test(clean)) throw new Error("Enter a valid @handle.");
  const snap = await getDoc(doc(db, "handles", clean));
  const ownerUid = String((snap.data() as { ownerUid?: unknown } | undefined)?.ownerUid || "");
  if (!snap.exists() || !ownerUid) throw new Error(`No account found for @${clean}.`);
  return { uid: ownerUid, handle: clean };
}

/** Add a co-host to an event. Owner-only per rules; roster capped at 5. */
export async function addEventCoHost(eventId: string, uid: string, knownCoHosts: string[]): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Event is unavailable right now.");
  if (knownCoHosts.length >= EVENT_COHOSTS_MAX) {
    throw new Error(`Events hold ${EVENT_COHOSTS_MAX} co-hosts — remove one first.`);
  }
  await updateDoc(doc(db, "events", eventId), {
    coHostUids: arrayUnion(uid),
    updatedAt: new Date().toISOString(),
  });
}

/** Remove an event co-host. Owner-only per rules. */
export async function removeEventCoHost(eventId: string, uid: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Event is unavailable right now.");
  await updateDoc(doc(db, "events", eventId), {
    coHostUids: arrayRemove(uid),
    updatedAt: new Date().toISOString(),
  });
}
