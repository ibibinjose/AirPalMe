import type { RoomType } from "@shared/airpal-data";

export interface RoomTypeDraft {
  name: string;
  category: RoomType["category"];
  capacity: number;
  bedConfig: string;
  startingPrice?: number;
  sizeSqm?: number;
  features: string[];
  startNumber: string;
  count: number;
}

const ROOM_CATEGORIES: RoomType["category"][] = ["Standard", "Deluxe", "Suite", "Penthouse", "Villa"];

export function roomCategories(): RoomType["category"][] {
  return [...ROOM_CATEGORIES];
}

function cleanNumber(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** All room numbers already claimed across every type, lower-cased for comparison. */
export function claimedRoomNumbers(types: RoomType[]): Set<string> {
  const claimed = new Set<string>();
  for (const t of types || []) {
    for (const n of t.roomNumbers || []) claimed.add(cleanNumber(n).toLowerCase());
  }
  return claimed;
}

/**
 * Suggest free room numbers honouring the host's start number first
 * (201 × 2 → 201, 202), then continuing the highest numeric run already
 * listed (101–102, seed taken → 103…), then suffixing non-numeric seeds
 * (B12 taken → B12-2).
 */
export function suggestRoomNumbers(existing: string[], startSeed: string, count: number): string[] {
  const want = Math.max(1, Math.min(Math.floor(count) || 1, 50));
  const taken = new Set(existing.map((n) => cleanNumber(n).toLowerCase()));
  const out: string[] = [];
  const claim = (candidate: string) => {
    const key = cleanNumber(candidate).toLowerCase();
    if (!key || taken.has(key)) return false;
    taken.add(key);
    out.push(cleanNumber(candidate));
    return true;
  };
  const seed = cleanNumber(startSeed) || "101";
  claim(seed);
  if (/^\d+$/.test(seed) && Number.isSafeInteger(Number(seed))) {
    let next = Number(seed) + 1;
    while (out.length < want && next < 100000) {
      claim(String(next));
      next += 1;
    }
  } else {
    let suffix = 2;
    while (out.length < want && suffix < 1000) {
      claim(`${seed}-${suffix}`);
      suffix += 1;
    }
  }
  const numeric = Array.from(taken)
    .filter((n) => /^\d+$/.test(n))
    .map(Number)
    .filter((n) => Number.isSafeInteger(n));
  let next = (numeric.length > 0 ? Math.max(...numeric) : 100) + 1;
  while (out.length < want && next < 100000) {
    claim(String(next));
    next += 1;
  }
  let suffix = 2;
  while (out.length < want) {
    if (claim(`${seed}-${suffix}`)) {
      suffix += 1;
      continue;
    }
    suffix += 1;
    if (suffix > 10000) break;
  }
  return out;
}

/** Validate a new room-type draft; returns the first problem or null when it can save. */
export function validateRoomTypeDraft(draft: RoomTypeDraft, types: RoomType[]): string | null {
  if (!draft.name.trim()) return "Give the room type a name";
  if (!draft.bedConfig.trim()) return "Add the bed setup (e.g. 1 King Bed)";
  if (!Number.isFinite(draft.capacity) || draft.capacity < 1) return "Sleeps must be at least 1";
  if (draft.startingPrice !== undefined && !(draft.startingPrice > 0)) return "Nightly price must be above $0";
  const numbers = suggestRoomNumbers(types.flatMap((t) => t.roomNumbers || []), draft.startNumber, draft.count);
  if (numbers.length < 1) return "Add at least one room number";
  return null;
}

/** Build a RoomType from a validated draft. */
export function buildRoomType(draft: RoomTypeDraft, types: RoomType[]): RoomType {
  const roomNumbers = suggestRoomNumbers(
    types.flatMap((t) => t.roomNumbers || []),
    draft.startNumber,
    draft.count,
  );
  return {
    id: `rt_${Date.now().toString(36)}`,
    name: draft.name.trim(),
    category: draft.category,
    capacity: Math.max(1, Math.floor(draft.capacity) || 1),
    sizeSqm: draft.sizeSqm && draft.sizeSqm > 0 ? draft.sizeSqm : undefined,
    bedConfig: draft.bedConfig.trim(),
    totalRooms: roomNumbers.length,
    startingPrice: draft.startingPrice && draft.startingPrice > 0 ? draft.startingPrice : undefined,
    features: draft.features.map((f) => f.trim()).filter(Boolean).slice(0, 12),
    roomNumbers,
  };
}

/** Append rooms to one type; returns the updated list (no mutation). */
export function addRoomsToType(types: RoomType[], typeId: string, extra: number): RoomType[] {
  const want = Math.max(1, Math.min(Math.floor(extra) || 1, 50));
  const allNumbers = types.flatMap((t) => t.roomNumbers || []);
  return types.map((t) => {
    if (t.id !== typeId) return t;
    const seed = (t.roomNumbers || [])[0] || t.name;
    const fresh = suggestRoomNumbers(allNumbers, seed, want).filter(
      (n) => !(t.roomNumbers || []).some((e) => cleanNumber(e).toLowerCase() === n.toLowerCase()),
    );
    const roomNumbers = [...(t.roomNumbers || []), ...fresh];
    return { ...t, roomNumbers, totalRooms: roomNumbers.length };
  });
}

/** Remove a single room number from a type; returns the updated list (no mutation). */
export function removeRoomFromType(types: RoomType[], typeId: string, roomNumber: string): RoomType[] {
  const target = cleanNumber(roomNumber).toLowerCase();
  return types.map((t) => {
    if (t.id !== typeId) return t;
    const roomNumbers = (t.roomNumbers || []).filter((n) => cleanNumber(n).toLowerCase() !== target);
    return { ...t, roomNumbers, totalRooms: roomNumbers.length };
  });
}

export type RoomStatus = "occupied" | "vacant" | "maintenance" | "cleaning";

export const ROOM_STATUSES: RoomStatus[] = ["vacant", "occupied", "cleaning", "maintenance"];

export function normalizeRoomStatus(value: unknown): RoomStatus {
  return (ROOM_STATUSES as string[]).includes(String(value)) ? (value as RoomStatus) : "vacant";
}

/** Set one room's status; returns a new record (no mutation). Empty record stays clean. */
export function setRoomStatus(
  statuses: Record<string, RoomStatus> | undefined,
  roomNumber: string,
  status: RoomStatus,
): Record<string, RoomStatus> {
  const next = { ...(statuses || {}) };
  next[roomNumber.trim()] = status;
  return next;
}

/** Drop statuses for rooms that no longer exist. */
export function pruneRoomStatuses(
  statuses: Record<string, RoomStatus> | undefined,
  liveNumbers: string[],
): Record<string, RoomStatus> {
  if (!statuses) return {};
  const live = new Set(liveNumbers.map((n) => n.trim().toLowerCase()));
  const next: Record<string, RoomStatus> = {};
  for (const [number, status] of Object.entries(statuses)) {
    if (live.has(number.trim().toLowerCase())) next[number] = normalizeRoomStatus(status);
  }
  return next;
}

/** Occupancy roll-up for the Today tab. */
export function occupancySummary(statuses: Record<string, RoomStatus> | undefined): {
  occupied: number;
  vacant: number;
  total: number;
} {
  const values = Object.values(statuses || {}).map(normalizeRoomStatus);
  return {
    occupied: values.filter((s) => s === "occupied").length,
    vacant: values.filter((s) => s === "vacant").length,
    total: values.length,
  };
}

/** Find the room type that contains a guest's room number (case-insensitive). */
export function roomTypeForNumber(types: RoomType[] | undefined, roomNumber: string | null | undefined): RoomType | null {
  const target = (roomNumber || "").trim().toLowerCase();
  if (!target || !types) return null;
  for (const t of types) {
    if ((t.roomNumbers || []).some((n) => cleanNumber(n).toLowerCase() === target)) return t;
  }
  return null;
}
