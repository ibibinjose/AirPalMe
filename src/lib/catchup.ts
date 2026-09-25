import { collection, doc, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import type { PlanType } from "@shared/plan";
import { getFirebaseDb, isFirebaseConfigured } from "./firebase";

export interface CatchUpItem {
  id: string;
  targetHandle: string;
  targetOwnerUid?: string;
  requesterUid?: string;
  requesterHandle?: string;
  requesterName: string;
  requesterPhoto?: string;
  type: PlanType | "catchup" | "meeting" | "nightout" | "casual" | string;
  date?: string;
  time?: string;
  venue?: string;
  notes?: string;
  planId?: string;
  createdAt: string;
  isReminderOnly?: boolean;
  status: "pending" | "accepted" | "scheduled" | "dismissed";
}

const STORAGE_KEY = "airpal:catchups:v1";
let memory: CatchUpItem[] = [];

function storage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

function omitUndefined<T extends Record<string, unknown>>(row: T): T {
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined)) as T;
}

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, "").toLowerCase();
}

export function listCatchUps(): CatchUpItem[] {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memory = parsed;
        return parsed;
      }
    }
  } catch {
    /* use memory */
  }
  return memory;
}

function persist(items: CatchUpItem[]): void {
  memory = items;
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* private browsing */
  }
}

function syncRemote(item: CatchUpItem) {
  if (!isFirebaseConfigured) return;
  const db = getFirebaseDb();
  if (!db) return;
  void setDoc(doc(db, "catchups", item.id), omitUndefined(item as unknown as Record<string, unknown>), {
    merge: true,
  }).catch(() => undefined);
}

/** Incoming proposals for a public bio (owner inbox). */
export function listCatchUpsForHandle(targetHandle: string): CatchUpItem[] {
  const norm = normalizeHandle(targetHandle);
  return listCatchUps().filter((item) => normalizeHandle(item.targetHandle) === norm && item.status !== "dismissed");
}

export function listMyCatchUpReminders(): CatchUpItem[] {
  return listCatchUps().filter((item) => item.isReminderOnly && item.status !== "dismissed");
}

export function hasCatchUpReminder(targetHandle: string): boolean {
  const norm = normalizeHandle(targetHandle);
  return listCatchUps().some(
    (item) => normalizeHandle(item.targetHandle) === norm && Boolean(item.isReminderOnly) && item.status !== "dismissed",
  );
}

export function toggleCatchUpReminder(target: {
  handle: string;
  name: string;
  photo?: string;
  city?: string;
}): boolean {
  const items = listCatchUps();
  const norm = normalizeHandle(target.handle);
  const existingIdx = items.findIndex(
    (i) => normalizeHandle(i.targetHandle) === norm && Boolean(i.isReminderOnly) && i.status !== "dismissed",
  );

  if (existingIdx >= 0) {
    items.splice(existingIdx, 1);
    persist(items);
    return false;
  }

  const newItem: CatchUpItem = {
    id: `cup-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    targetHandle: norm,
    requesterName: target.name,
    requesterPhoto: target.photo,
    venue: target.city,
    type: "catchup",
    isReminderOnly: true,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  persist([newItem, ...items]);
  return true;
}

export function recordCatchUpInterest(input: {
  targetHandle: string;
  targetOwnerUid?: string;
  requesterUid?: string;
  requesterHandle?: string;
  requesterName: string;
  requesterPhoto?: string;
  type?: PlanType | "catchup" | "meeting" | "nightout" | "casual" | string;
  date?: string;
  time?: string;
  venue?: string;
  notes?: string;
  planId?: string;
}): CatchUpItem {
  const items = listCatchUps();
  const norm = normalizeHandle(input.targetHandle);

  const item: CatchUpItem = {
    id: `cup-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    targetHandle: norm,
    targetOwnerUid: input.targetOwnerUid,
    requesterUid: input.requesterUid,
    requesterHandle: input.requesterHandle ? normalizeHandle(input.requesterHandle) : undefined,
    requesterName: input.requesterName.trim(),
    requesterPhoto: input.requesterPhoto,
    type: input.type || "catchup",
    date: input.date,
    time: input.time,
    venue: input.venue,
    notes: input.notes,
    planId: input.planId,
    createdAt: new Date().toISOString(),
    isReminderOnly: false,
    status: "pending",
  };

  persist([item, ...items]);
  if (input.requesterUid) syncRemote(item);
  return item;
}

export function subscribeCatchUpsForOwner(ownerUid: string, onRows: (rows: CatchUpItem[]) => void): () => void {
  if (!ownerUid || !isFirebaseConfigured) {
    onRows(listCatchUps().filter((i) => i.targetOwnerUid === ownerUid && i.status !== "dismissed"));
    return () => undefined;
  }
  const db = getFirebaseDb();
  if (!db) {
    onRows([]);
    return () => undefined;
  }
  const q = query(collection(db, "catchups"), where("targetOwnerUid", "==", ownerUid));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => d.data() as CatchUpItem).filter((i) => i.status !== "dismissed");
      onRows(rows);
    },
    () => onRows(listCatchUpsForHandle("")),
  );
}

export function updateCatchUpStatus(id: string, status: "pending" | "accepted" | "scheduled" | "dismissed"): void {
  const items = listCatchUps().map((item) => (item.id === id ? { ...item, status } : item));
  persist(items);
  if (!isFirebaseConfigured) return;
  const db = getFirebaseDb();
  if (!db) return;
  void updateDoc(doc(db, "catchups", id), { status }).catch(() => undefined);
}

export function removeCatchUp(id: string): void {
  const items = listCatchUps().filter((item) => item.id !== id);
  persist(items);
}

export interface TimeConflict {
  hasConflict: boolean;
  conflictingTitle?: string;
  conflictingTime?: string;
  conflictingType?: string;
}

/** Check if a date & time slot conflicts with existing plans or scheduled meetups (+/- 60 mins) */
export function checkTimeConflict(
  date: string,
  time: string,
  existingPlans: Array<{ date: string; time?: string; title: string; type?: string }> = [],
  existingCatchups: CatchUpItem[] = [],
): TimeConflict {
  if (!date || !time) return { hasConflict: false };

  const [th, tm] = time.split(":").map(Number);
  const targetMinutes = (th || 0) * 60 + (tm || 0);

  // Check existing user plans
  for (const p of existingPlans) {
    if (p.date === date && p.time) {
      const [ph, pm] = p.time.split(":").map(Number);
      const planMinutes = (ph || 0) * 60 + (pm || 0);
      if (Math.abs(targetMinutes - planMinutes) < 60) {
        return {
          hasConflict: true,
          conflictingTitle: p.title,
          conflictingTime: p.time,
          conflictingType: p.type || "Plan",
        };
      }
    }
  }

  // Check existing catch-ups & meetings
  for (const c of existingCatchups) {
    if (c.date === date && c.time && c.status !== "dismissed") {
      const [ch, cm] = c.time.split(":").map(Number);
      const catchupMinutes = (ch || 0) * 60 + (cm || 0);
      if (Math.abs(targetMinutes - catchupMinutes) < 60) {
        return {
          hasConflict: true,
          conflictingTitle: `Meetup with ${c.requesterName}`,
          conflictingTime: c.time,
          conflictingType: c.type,
        };
      }
    }
  }

  return { hasConflict: false };
}

