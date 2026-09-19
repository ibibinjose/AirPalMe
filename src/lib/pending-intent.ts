export type PendingIntentKind = "like-event" | "going-event" | "interested-event" | "follow-handle" | "like-handle";

export interface PendingIntent {
  kind: PendingIntentKind;
  id: string;
}

const KEY = "airpal:pending-intent:v1";

function storage(): Storage | null {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage : null;
  } catch {
    return null;
  }
}

const KINDS: PendingIntentKind[] = ["like-event", "going-event", "interested-event", "follow-handle", "like-handle"];

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
    storage()?.setItem(KEY, JSON.stringify(intent));
  } catch {
    /* private mode: intent is best-effort */
  }
}

export function peekPendingIntent(): PendingIntent | null {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return valid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPendingIntent(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
