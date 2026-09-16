import type { PlanType } from "@shared/plan";

export interface CatchUpItem {
  id: string;
  targetHandle: string;
  requesterHandle?: string;
  requesterName: string;
  requesterPhoto?: string;
  type: PlanType | "catchup" | "meeting" | "nightout" | "casual" | string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm
  venue?: string;
  notes?: string;
  createdAt: string;
  isReminderOnly?: boolean;
  status: "pending" | "accepted" | "scheduled" | "dismissed";
}

const STORAGE_KEY = "airpal:catchups:v1";

function storage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, "").toLowerCase();
}

export function listCatchUps(): CatchUpItem[] {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function persist(items: CatchUpItem[]): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* private browsing */
  }
}

/** Get all incoming catch-up requests/interests for a target handle */
export function listCatchUpsForHandle(targetHandle: string): CatchUpItem[] {
  const norm = normalizeHandle(targetHandle);
  return listCatchUps().filter((item) => normalizeHandle(item.targetHandle) === norm && item.status !== "dismissed");
}

/** Get all reminders saved by the current user to catch up with others */
export function listMyCatchUpReminders(): CatchUpItem[] {
  return listCatchUps().filter((item) => item.isReminderOnly && item.status !== "dismissed");
}

export function hasCatchUpReminder(targetHandle: string): boolean {
  const norm = normalizeHandle(targetHandle);
  return listCatchUps().some((item) => normalizeHandle(item.targetHandle) === norm && item.status !== "dismissed");
}

export function toggleCatchUpReminder(target: {
  handle: string;
  name: string;
  photo?: string;
  city?: string;
}): boolean {
  const items = listCatchUps();
  const norm = normalizeHandle(target.handle);
  const existingIdx = items.findIndex((i) => normalizeHandle(i.targetHandle) === norm && i.isReminderOnly);

  if (existingIdx >= 0) {
    items.splice(existingIdx, 1);
    persist(items);
    return false; // Removed
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
  return true; // Added
}

export function recordCatchUpInterest(input: {
  targetHandle: string;
  requesterHandle?: string;
  requesterName: string;
  requesterPhoto?: string;
  type?: PlanType | "catchup" | "meeting" | "nightout" | "casual" | string;
  date?: string;
  time?: string;
  venue?: string;
  notes?: string;
}): CatchUpItem {
  const items = listCatchUps();
  const norm = normalizeHandle(input.targetHandle);

  const item: CatchUpItem = {
    id: `cup-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    targetHandle: norm,
    requesterHandle: input.requesterHandle ? normalizeHandle(input.requesterHandle) : undefined,
    requesterName: input.requesterName.trim(),
    requesterPhoto: input.requesterPhoto,
    type: input.type || "catchup",
    date: input.date,
    time: input.time,
    venue: input.venue,
    notes: input.notes,
    createdAt: new Date().toISOString(),
    isReminderOnly: false,
    status: "pending",
  };

  persist([item, ...items]);
  return item;
}

export function updateCatchUpStatus(id: string, status: "pending" | "accepted" | "scheduled" | "dismissed"): void {
  const items = listCatchUps().map((item) => (item.id === id ? { ...item, status } : item));
  persist(items);
}

export function removeCatchUp(id: string): void {
  const items = listCatchUps().filter((item) => item.id !== id);
  persist(items);
}
