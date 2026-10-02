/**
 * Event guestlist — the one list that turns "I'm interested" into "I showed
 * up". Lives at `events/{eventId}/guestlist/{entryId}`; hosts read and
 * manage it, guests can only read their own row. Counts (never names) are
 * mirrored onto the event doc for the public "going" figure.
 *
 * Entry ids are deterministic per source so re-deliveries cannot duplicate
 * rows: `rsvp_{uid}` for account RSVPs, `t_{ticketId}` for paid/free
 * tickets. Door adds and imports use random ids.
 */

export const GUEST_STATUSES = ["invited", "going", "checked-in", "no-show", "cancelled"] as const;
export type GuestStatus = (typeof GUEST_STATUSES)[number];

export const GUEST_SOURCES = ["rsvp", "ticket", "door", "invite", "import"] as const;
export type GuestSource = (typeof GUEST_SOURCES)[number];

export const GUESTLIST_MAX_PARTY = 20;
export const GUESTLIST_MAX_NAME = 80;

export interface GuestEntry {
  /** Display name — guest-provided, profile-derived, or host-entered. */
  name: string;
  /** Linked account when known. Drives the guest's own-row read rule. */
  uid?: string;
  handle?: string;
  /** Verification snapshot at add time. Never a guarantee, just a badge. */
  verified?: boolean;
  status: GuestStatus;
  /** Heads this entry covers: 1 + plus-ones. */
  partySize: number;
  ticketId?: string;
  source: GuestSource;
  addedBy: string;
  addedAt: string;
  checkedInAt?: string | null;
  /** Host-only note, e.g. "VIP" or access needs. Never public. */
  note?: string;
}

export interface GuestCounts {
  goingHeads: number;
  checkedInHeads: number;
  noshowHeads: number;
  /** Every non-cancelled head on the list. */
  listedHeads: number;
  entries: number;
}

export function guestEntryIdForRsvp(uid: string): string {
  return `rsvp_${uid}`;
}

export function guestEntryIdForTicket(ticketId: string): string {
  return `t_${ticketId}`;
}

export function isGuestStatus(value: unknown): value is GuestStatus {
  return typeof value === "string" && (GUEST_STATUSES as readonly string[]).includes(value);
}

export function isGuestSource(value: unknown): value is GuestSource {
  return typeof value === "string" && (GUEST_SOURCES as readonly string[]).includes(value);
}

/** Client + test guard. The server and Firestore rules re-check. */
export function guestEntryValid(entry: Partial<GuestEntry>): boolean {
  if (typeof entry.name !== "string") return false;
  const name = entry.name.trim();
  if (name.length < 1 || name.length > GUESTLIST_MAX_NAME) return false;
  if (!isGuestStatus(entry.status)) return false;
  if (!isGuestSource(entry.source)) return false;
  if (!Number.isInteger(entry.partySize) || entry.partySize! < 1 || entry.partySize! > GUESTLIST_MAX_PARTY)
    return false;
  if (typeof entry.addedBy !== "string" || !entry.addedBy) return false;
  if (typeof entry.addedAt !== "string" || !entry.addedAt) return false;
  return true;
}

/** Head counts per status. Cancelled rows are excluded from every head total. */
export function summarizeGuestlist(entries: Pick<GuestEntry, "status" | "partySize">[]): GuestCounts {
  let goingHeads = 0;
  let checkedInHeads = 0;
  let noshowHeads = 0;
  for (const e of entries) {
    const heads = Number.isInteger(e.partySize) && e.partySize > 0 ? e.partySize : 0;
    if (e.status === "going" || e.status === "invited") goingHeads += heads;
    else if (e.status === "checked-in") checkedInHeads += heads;
    else if (e.status === "no-show") noshowHeads += heads;
  }
  return {
    goingHeads,
    checkedInHeads,
    noshowHeads,
    listedHeads: goingHeads + checkedInHeads + noshowHeads,
    entries: entries.length,
  };
}

/** Statuses a guest-facing "you're on the list" state accepts. */
export function guestEntryIsActive(status: GuestStatus): boolean {
  return status === "invited" || status === "going" || status === "checked-in";
}
