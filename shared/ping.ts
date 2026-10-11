/**
 * AirPal Ping — a lightweight "are you around / want to hang out" nudge
 * between two people. Heavier intent becomes a mate request or a plan;
 * a ping is just the tap on the shoulder.
 *
 * Lifecycle: sent → pinged_back → hanging_out, with dismissed/cancelled
 * as terminal states from either side. Only the recipient moves a sent
 * ping forward; only the sender cancels their own sent ping.
 */

export const PING_STATUSES = ["sent", "pinged_back", "hanging_out", "dismissed", "cancelled"] as const;

export type PingStatus = (typeof PING_STATUSES)[number];

export type PingActor = "sender" | "recipient" | "admin";

export interface AirPalPing {
  id: string;
  fromUid: string;
  fromName: string;
  fromHandle?: string;
  toUid: string;
  toHandle: string;
  status: PingStatus;
  createdAt: string;
  updatedAt: string;
  respondedAt?: string;
}

const TERMINAL: PingStatus[] = ["dismissed", "cancelled"];

/**
 * Whether `actor` may move a ping from `current` to `next`.
 * Mirrors the Firestore rules on `pings` — keep the two in sync.
 */
export function canTransitionPing(current: PingStatus, next: PingStatus, actor: PingActor): boolean {
  if (actor === "admin") return current !== next;
  if (current === next || TERMINAL.includes(current)) return false;
  if (actor === "sender") {
    if (current === "sent") return next === "cancelled";
    // Either party closes a live thread (matches the Firestore rules).
    return (current === "pinged_back" || current === "hanging_out") && (next === "hanging_out" || next === "dismissed");
  }
  // recipient
  if (current === "sent") return next === "pinged_back" || next === "hanging_out" || next === "dismissed";
  if (current === "pinged_back") return next === "hanging_out" || next === "dismissed";
  return current === "hanging_out" && next === "dismissed";
}

/** A ping still awaiting a response (counts as "waiting on you / on them"). */
export function isOpenPing(status: PingStatus): boolean {
  return status === "sent" || status === "pinged_back";
}
