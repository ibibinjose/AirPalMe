import type { PropertyInfo } from "@shared/airpal-data";
import { HARBOUR_COLLEGE as CAMPUS } from "@shared/campus";

export type ChecklistItem = {
  id: string;
  label: string;
  hint?: string;
  done: boolean;
  custom?: boolean;
};

type StayKind = "none" | "stay" | "marker" | "campus";

export function checklistKey(propertyId?: string, room?: string | null) {
  return `airpal.checklist.v1:${propertyId || "stay"}:${room || "room"}`;
}

export function defaultChecklist(property: PropertyInfo, kind: StayKind, room: string | null): ChecklistItem[] {
  if (kind === "campus") {
    return [
      { id: "id", label: "Student ID / passport", done: false },
      { id: "swipe", label: "College swipe card", done: false },
      { id: "chargers", label: "Phone & chargers", done: false },
      { id: "keys", label: room ? `Room ${room} clear` : "Room clear", done: false },
      { id: "out", label: "Move-out by 10:00 AM", hint: CAMPUS.name, done: false },
      { id: "laundry", label: "Laundry collected", done: false },
      { id: "desk", label: "Sign out at the office", done: false },
    ];
  }

  const facilities = property.facilities || [];
  const pool = facilities.some((f) => f && f.name && /pool/i.test(f.name));
  const laundry = facilities.some((f) => f && f.name && /laundry/i.test(f.name));
  const luggage = facilities.find((f) => f && f.name && /luggage/i.test(f.name));

  const items: ChecklistItem[] = [
    { id: "id", label: "Passport / ID", done: false },
    { id: "chargers", label: "Phone, chargers, adapters", done: false },
    { id: "meds", label: "Medications", done: false },
    { id: "keys", label: room ? `Room ${room} keys / stay QR` : "Keys / stay QR", done: false },
    {
      id: "out",
      label: `Checkout by ${property.checkOut || "10:00 AM"}`,
      hint: property.name || "your stay",
      done: false,
    },
    { id: "bags", label: "Bags at the desk", hint: luggage?.details, done: false },
    { id: "minibar", label: "Minibar & extras settled", done: false },
  ];
  if (pool) items.push({ id: "swim", label: "Swimwear & towel", done: false });
  if (laundry) items.push({ id: "laundry", label: "Laundry collected", done: false });
  items.push({ id: "late", label: "Late checkout asked — if you need it", done: false });
  return items;
}

export function readChecklist(key: string, fallback: ChecklistItem[]): ChecklistItem[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as ChecklistItem[];
    if (!Array.isArray(saved)) return fallback;
    const byId = new Map(saved.map((item) => [item.id, item]));
    const merged = fallback.map((item) => {
      const prev = byId.get(item.id);
      return prev ? { ...item, done: Boolean(prev.done) } : item;
    });
    const extras = saved.filter((item) => item.custom && !fallback.some((row) => row.id === item.id));
    return [...merged, ...extras];
  } catch {
    return fallback;
  }
}

export function writeChecklist(key: string, items: ChecklistItem[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}
