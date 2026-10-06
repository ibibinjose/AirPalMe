import { collection, doc, onSnapshot, serverTimestamp, setDoc, type Timestamp } from "firebase/firestore";
import type { StaffTicket, TicketPriority } from "@shared/airpal-data";
export type { StaffTicket } from "@shared/airpal-data";
import { ensureAnonymousSession, getFirebaseAuth, getFirebaseDb } from "./firebase";
import { createStaffTicketRemote, liveBackendEnabled, resolveStaffTicketRemote } from "./functions";

const LOCAL_PREFIX = "airpal.tickets.";

/** Priority rules for staff tickets (sole home — kept here so `@shared/airpal-data` stays out of the initial bundle). */
export function resolveTicketPriority(ticket: {
  priority?: TicketPriority;
  urgency?: "normal" | "urgent";
  category?: StaffTicket["category"] | string;
  details?: string;
}): TicketPriority {
  if (ticket.priority) return ticket.priority;
  if (ticket.urgency === "urgent") return "urgent";
  if (ticket.category === "maintenance") return "high";
  if (ticket.category === "late_checkout" || ticket.category === "dining") return "medium";
  if (ticket.category === "reception") return "medium";
  return "low";
}

function asIso(value: unknown): string {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && "toDate" in value && typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate().toISOString();
  }
  return "";
}

export function ticketFromDoc(id: string, data: Record<string, unknown>): StaffTicket | null {
  const details = typeof data.details === "string" ? data.details.trim() : "";
  if (!details) return null;
  const category = data.category;
  const allowed = ["reception", "housekeeping", "maintenance", "dining", "late_checkout"] as const;
  const cat = allowed.includes(category as (typeof allowed)[number])
    ? (category as StaffTicket["category"])
    : "reception";
  const urgency = data.urgency === "urgent" ? "urgent" : "normal";
  const status = data.status === "resolved" || data.status === "in_progress" ? data.status : "pending";
  const ticket: StaffTicket = {
    id,
    propertyId: typeof data.propertyId === "string" ? data.propertyId : undefined,
    roomNumber: typeof data.roomNumber === "string" ? data.roomNumber : "Guest",
    guestName: typeof data.guestName === "string" ? data.guestName : "Guest",
    category: cat,
    details,
    status,
    createdAt: asIso(data.createdAt) || asIso(data.createdAtIso) || new Date().toISOString(),
    urgency,
    resolvedBy: typeof data.resolvedBy === "string" ? data.resolvedBy : undefined,
    resolvedAt: asIso(data.resolvedAt) || undefined,
  };
  ticket.priority = resolveTicketPriority(ticket);
  return ticket;
}

export function categoryFromGuestText(text: string): StaffTicket["category"] {
  const q = text.toLowerCase();
  if (/late\s*(out|checkout|check-out)/.test(q)) return "late_checkout";
  if (/towel|pillow|blanket|housekeep|clean|linen/.test(q)) return "housekeeping";
  if (/ac|air.?con|plumb|leak|broken|maintenance|light|tv/.test(q)) return "maintenance";
  if (/breakfast|dinner|menu|hungry|dining/.test(q)) return "dining";
  return "reception";
}

function readLocal(propertyId: string): StaffTicket[] {
  try {
    const raw = localStorage.getItem(LOCAL_PREFIX + propertyId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((row) => row && typeof row.details === "string") : [];
  } catch {
    return [];
  }
}

function writeLocal(propertyId: string, tickets: StaffTicket[]) {
  try {
    localStorage.setItem(LOCAL_PREFIX + propertyId, JSON.stringify(tickets.slice(0, 40)));
  } catch {
    /* ignore */
  }
}

export function cacheLocalTicket(propertyId: string, ticket: StaffTicket) {
  writeLocal(propertyId, [ticket, ...readLocal(propertyId).filter((row) => row.id !== ticket.id)]);
}

export type SubmitTicketInput = {
  propertyId: string;
  details: string;
  roomNumber?: string;
  category?: StaffTicket["category"];
  urgency?: StaffTicket["urgency"];
};

export async function submitStaffTicket(input: SubmitTicketInput): Promise<StaffTicket> {
  const details = input.details.trim();
  if (!details) throw new Error("Describe the request");
  const propertyId = input.propertyId.trim();
  if (!propertyId || propertyId === "unknown") throw new Error("This stay isn’t listed yet. Ask the desk.");
  const roomNumber = (input.roomNumber || "Guest").trim() || "Guest";
  const category = input.category || categoryFromGuestText(details);
  const urgency = input.urgency || (/urgent|asap|now|emergency/i.test(details) ? "urgent" : "normal");
  const ticket: StaffTicket = {
    id: `tick_${propertyId}_${Date.now()}`,
    propertyId,
    roomNumber,
    guestName: roomNumber === "Guest" ? "Guest" : `Room ${roomNumber}`,
    category,
    details,
    status: "pending",
    createdAt: new Date().toISOString(),
    urgency,
  };
  ticket.priority = resolveTicketPriority(ticket);
  cacheLocalTicket(propertyId, ticket);

  const uid = await ensureAnonymousSession();
  if (liveBackendEnabled()) {
    try {
      const remote = await createStaffTicketRemote({
        propertyId,
        details,
        roomNumber,
        category,
        urgency,
      });
      if (remote.ticketId && remote.ticketId !== ticket.id) {
        const saved = { ...ticket, id: remote.ticketId };
        cacheLocalTicket(propertyId, saved);
        return saved;
      }
    } catch {
      const db = getFirebaseDb();
      if (db && uid) {
        await setDoc(doc(db, "properties", propertyId, "tickets", ticket.id), {
          ...ticket,
          uid,
          createdAt: serverTimestamp(),
          createdAtIso: ticket.createdAt,
        });
      }
    }
  }
  return ticket;
}

export async function resolveStaffTicket(propertyId: string, ticketId: string): Promise<void> {
  const resolvedAt = new Date().toISOString();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  const next = readLocal(propertyId).map((row) =>
    row.id === ticketId ? { ...row, status: "resolved" as const, resolvedAt, resolvedBy: uid } : row,
  );
  writeLocal(propertyId, next);

  if (liveBackendEnabled()) {
    try {
      await resolveStaffTicketRemote({ propertyId, ticketId });
      return;
    } catch {
      const db = getFirebaseDb();
      if (!db) return;
      await setDoc(
        doc(db, "properties", propertyId, "tickets", ticketId),
        { status: "resolved", resolvedAt, resolvedBy: uid || null },
        { merge: true },
      );
    }
  }
}

/** Live host inbox. Remote snapshot replaces local cache when Firebase is up. */
export function subscribePropertyTickets(propertyId: string, onChange: (tickets: StaffTicket[]) => void): () => void {
  if (!propertyId || propertyId === "unknown") {
    onChange([]);
    return () => undefined;
  }
  const db = getFirebaseDb();
  if (!db || !liveBackendEnabled()) {
    onChange(readLocal(propertyId));
    return () => undefined;
  }
  return onSnapshot(
    collection(db, "properties", propertyId, "tickets"),
    (snap) => {
      const rows: StaffTicket[] = [];
      for (const row of snap.docs) {
        const ticket = ticketFromDoc(row.id, row.data() as Record<string, unknown>);
        if (ticket) rows.push(ticket);
      }
      rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      writeLocal(propertyId, rows);
      onChange(rows);
    },
    () => {
      onChange(readLocal(propertyId));
    },
  );
}

export function openTicketCount(tickets: StaffTicket[]) {
  return tickets.filter((t) => t.status !== "resolved").length;
}
