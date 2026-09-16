import { nanoid } from "nanoid";
import { AIRPAL_CLUB_ID, normalizeEmail, type ClubInvite, type ClubMember, type GuestEntry } from "@shared/club";

const MEMBERS_KEY = "airpal.club.members.v1";
const GUESTS_KEY = "airpal.club.guests.v1";
const INVITES_KEY = "airpal.club.invites.v1";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

const listeners = new Set<() => void>();

export function subscribeClub(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function bump() {
  listeners.forEach((fn) => fn());
}

export function loadMembers(): ClubMember[] {
  return readJson<ClubMember[]>(MEMBERS_KEY, []);
}

export function loadGuests(): Record<string, GuestEntry[]> {
  return readJson<Record<string, GuestEntry[]>>(GUESTS_KEY, {});
}

export function loadInvites(): ClubInvite[] {
  return readJson<ClubInvite[]>(INVITES_KEY, []);
}

export function guestsFor(clubId: string) {
  return loadGuests()[clubId] || [];
}

export function upsertMember(input: Omit<ClubMember, "id" | "joinedAt"> & { id?: string; joinedAt?: string }) {
  const email = normalizeEmail(input.email);
  const rows = loadMembers();
  const existing = rows.find((row) => row.email === email);
  const member: ClubMember = {
    id: existing?.id || input.id || nanoid(8),
    email,
    name: input.name.trim(),
    city: input.city.trim() || "Sydney",
    invites: input.invites,
    offers: input.offers,
    joinedAt: existing?.joinedAt || input.joinedAt || new Date().toISOString(),
  };
  writeJson(MEMBERS_KEY, [member, ...rows.filter((row) => row.email !== email)]);
  bump();
  return member;
}

export function removeMember(email: string) {
  writeJson(MEMBERS_KEY, loadMembers().filter((row) => row.email !== normalizeEmail(email)));
  bump();
}

export function addGuest(clubId: string, input: Omit<GuestEntry, "id" | "addedAt"> & { id?: string }) {
  const email = normalizeEmail(input.email);
  const all = loadGuests();
  const rows = all[clubId] || [];
  const existing = rows.find((row) => row.email === email);
  const guest: GuestEntry = {
    id: existing?.id || input.id || nanoid(8),
    email,
    name: input.name.trim(),
    note: input.note.trim(),
    source: input.source,
    addedAt: existing?.addedAt || new Date().toISOString(),
  };
  all[clubId] = [guest, ...rows.filter((row) => row.email !== email)];
  writeJson(GUESTS_KEY, all);
  bump();
  return guest;
}

export function removeGuest(clubId: string, email: string) {
  const all = loadGuests();
  all[clubId] = (all[clubId] || []).filter((row) => row.email !== normalizeEmail(email));
  writeJson(GUESTS_KEY, all);
  bump();
}

export function recordInvite(row: Omit<ClubInvite, "id" | "sentAt"> & { id?: string }) {
  const invite: ClubInvite = {
    id: row.id || nanoid(8),
    clubId: row.clubId,
    subject: row.subject,
    body: row.body,
    emails: row.emails,
    sentAt: new Date().toISOString(),
  };
  writeJson(INVITES_KEY, [invite, ...loadInvites()].slice(0, 50));
  bump();
  return invite;
}

export { AIRPAL_CLUB_ID };
