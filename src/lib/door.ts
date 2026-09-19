/** First-run job: What's on / Plan / Stay. Tabs are these three doors. */
export type DoorId = "explore" | "plan" | "stay";

const KEY = "airpal.door.v1";

export function loadDoor(): DoorId | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === "explore" || raw === "plan" || raw === "stay") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveDoor(door: DoorId) {
  try {
    localStorage.setItem(KEY, door);
  } catch {
    /* ignore */
  }
}

export function hrefForDoor(door: DoorId): string {
  if (door === "plan") return "/plan";
  if (door === "stay") return "/concierge";
  return "/";
}
