import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { normalizeHandle } from "@shared/bio";
import { getFirebaseDb } from "./firebase";
import { fetchPublicBio } from "./bio-store";
import { publicSiteOrigin, toPublicUrl } from "./public-origin";

const REF_KEY = "airpal:invite-ref:v1";

export interface AppReferral {
  inviterUid: string;
  inviterHandle: string;
  inviteeUid: string;
  inviteeLabel: string;
  createdAt: string;
}

/** Keep the inviter's handle across the signup flow (redirects can drop query params). */
export function stashInviteRef(raw: string | null): void {
  const code = normalizeInviteCode(raw);
  if (!code || typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(REF_KEY, code);
  } catch {
    /* private mode */
  }
}

/** Read-and-clear the stashed invite code after signup. */
export function takeInviteRef(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const code = sessionStorage.getItem(REF_KEY);
    sessionStorage.removeItem(REF_KEY);
    return normalizeInviteCode(code);
  } catch {
    return null;
  }
}

/** Invite codes are @handles: memorable, unique, already public. */
export function normalizeInviteCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const handle = normalizeHandle(raw.replace(/^@/, ""));
  return handle || null;
}

/** Shareable join link for an @handle. Always https://airpal.me — never capacitor://. */
export function inviteLinkFor(handle: string, origin?: string): string {
  const code = normalizeHandle(handle);
  const base = toPublicUrl(`${(origin || publicSiteOrigin()).replace(/\/$/, "")}/`).replace(/\/$/, "");
  return `${base}/start?tab=signup&ref=${encodeURIComponent(code)}`;
}

/** Resolve an invite code to the inviter (public reads only). */
export async function resolveInviter(code: string): Promise<{ uid: string; handle: string } | null> {
  const handle = normalizeInviteCode(code);
  if (!handle) return null;
  const bio = await fetchPublicBio(handle).catch(() => null);
  if (!bio?.ownerUid) return null;
  return { uid: bio.ownerUid, handle: bio.handle || handle };
}

export type RecordResult = "recorded" | "skipped-self" | "skipped-existing" | "no-backend" | "failed";

/**
 * Attribute a new account to its inviter. One inviter per joiner: the doc id
 * is the invitee uid, so a second invite can never overwrite the first.
 */
export async function recordAppInvite(input: {
  inviterUid: string;
  inviterHandle: string;
  inviteeUid: string;
  inviteeLabel: string;
}): Promise<RecordResult> {
  const db = getFirebaseDb();
  if (!db) return "no-backend";
  if (!input.inviterUid || input.inviterUid === input.inviteeUid) return "skipped-self";
  const ref = doc(db, "referrals", input.inviteeUid);
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) return "skipped-existing";
    const row: AppReferral = {
      inviterUid: input.inviterUid,
      inviterHandle: normalizeHandle(input.inviterHandle) || "member",
      inviteeUid: input.inviteeUid,
      inviteeLabel: input.inviteeLabel.trim().slice(0, 80) || "New member",
      createdAt: new Date().toISOString(),
    };
    await setDoc(ref, row);
    return "recorded";
  } catch {
    return "failed";
  }
}

export interface InviteOverview {
  invitedBy: AppReferral | null;
  joined: AppReferral[];
}

/** Who invited me, and who joined with my code (newest first). */
export async function fetchInviteOverview(myUid: string): Promise<InviteOverview> {
  const db = getFirebaseDb();
  const empty: InviteOverview = { invitedBy: null, joined: [] };
  if (!db || !myUid) return empty;
  try {
    const [mine, kids] = await Promise.all([
      getDoc(doc(db, "referrals", myUid)),
      getDocs(query(collection(db, "referrals"), where("inviterUid", "==", myUid))),
    ]);
    const joined = kids.docs
      .map((d) => d.data() as AppReferral)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return {
      invitedBy: mine.exists() ? (mine.data() as AppReferral) : null,
      joined,
    };
  } catch {
    return empty;
  }
}
