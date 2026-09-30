import { safeSessionStorage } from "./safe-storage";

export type PendingIntentKind =
  | "like-event"
  | "going-event"
  | "interested-event"
  | "follow-handle"
  | "like-handle"
  | "enter-promotion"
  | "redeem-promotion";

export interface PendingIntent {
  kind: PendingIntentKind;
  id: string;
}

const KEY = "airpal:pending-intent:v1";

const KINDS: PendingIntentKind[] = [
  "like-event",
  "going-event",
  "interested-event",
  "follow-handle",
  "like-handle",
  "enter-promotion",
  "redeem-promotion",
];

function valid(intent: unknown): intent is PendingIntent {
  if (!intent || typeof intent !== "object") return false;
  const row = intent as { kind?: unknown; id?: unknown };
  return (
    typeof row.id === "string" &&
    row.id.length > 0 &&
    typeof row.kind === "string" &&
    (KINDS as string[]).includes(row.kind)
  );
}

export function savePendingIntent(intent: PendingIntent): void {
  try {
    safeSessionStorage()?.setItem(KEY, JSON.stringify(intent));
  } catch {
    /* private mode: intent is best-effort */
  }
}

export function peekPendingIntent(): PendingIntent | null {
  try {
    const raw = safeSessionStorage()?.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return valid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPendingIntent(): void {
  try {
    safeSessionStorage()?.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
