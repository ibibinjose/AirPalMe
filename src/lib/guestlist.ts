import { addDoc, collection, doc, onSnapshot, updateDoc, type Unsubscribe } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { guestEntryValid, type GuestEntry, type GuestStatus } from "@shared/guestlist";

export interface GuestRow extends GuestEntry {
  id: string;
}

/** Host-side gate: the organiser, or a platform admin. Pure: safe to unit test. */
export function canManageGuestlist(
  event: { organiserUid?: string } | null | undefined,
  uid?: string,
  isAdmin = false,
): boolean {
  if (!event || !uid) return false;
  return isAdmin || event.organiserUid === uid;
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

/** Live rows for the door screen. Organiser-only per Firestore rules. */
export function subscribeGuestlist(
  eventId: string,
  onRows: (rows: GuestRow[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  if (!db || !eventId) {
    onError?.(new Error("Guestlist is unavailable right now."));
    return () => undefined;
  }
  return onSnapshot(
    collection(db, "events", eventId, "guestlist"),
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
  eventId: string,
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
  const ref = await addDoc(collection(db, "events", eventId, "guestlist"), entry);
  return ref.id;
}

/** Host-set capacity for the going bar: 1..100000, whole heads only. */
export async function setEventCapacity(eventId: string, capacity: number): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Event is unavailable right now.");
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) {
    throw new Error("Capacity must be between 1 and 100,000.");
  }
  await updateDoc(doc(db, "events", eventId), { capacity, updatedAt: new Date().toISOString() });
}
