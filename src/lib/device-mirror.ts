import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import { listMemories, replaceMemories, setMemoriesPersistHook, type Memory } from "./memories";
import { listPeople, replacePeople, setPeoplePersistHook, type PersonMet } from "./people";

/**
 * Firebase mirror for device-local lists (people + memories).
 *
 * Photos already upload to Firebase Storage when signed in (see storeMedia),
 * so authed rows carry https URLs that roam. Rows created offline keep
 * `idb:` blob srcs that only resolve on this device — mirrored anyway as
 * metadata backup.
 */

type MirrorDoc = {
  people?: PersonMet[];
  memories?: Memory[];
  updatedAt?: string;
};

/** Union by id, remote wins ties. Pure: unit tested. */
export function unionById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const ids = new Set(local.map((r) => r.id));
  return [...local, ...remote.filter((r) => r.id && !ids.has(r.id))];
}

function sanitize<T>(rows: T[]): T[] {
  try {
    return JSON.parse(JSON.stringify(rows)) as T[];
  } catch {
    return [];
  }
}

function mirrorRef(uid: string) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore is not configured.");
  return doc(db, "users", uid, "device", "mirror");
}

/**
 * Mirror every local write while signed in. Call on login, clear on logout.
 * Guards re-entry: pull → replace → persist would otherwise recurse.
 */
let autoUid: string | null = null;
let pushing = false;

export function wireAutoPush(uid: string | null): void {
  autoUid = uid;
  const push = () => {
    if (autoUid && !pushing) {
      pushing = true;
      void pushDeviceMirror(autoUid).finally(() => {
        pushing = false;
      });
    }
  };
  setPeoplePersistHook(uid ? push : null);
  setMemoriesPersistHook(uid ? push : null);
}

/** Push this device's lists to the account mirror. Best-effort. */
export async function pushDeviceMirror(uid: string): Promise<void> {
  try {
    await setDoc(
      mirrorRef(uid),
      {
        people: sanitize(listPeople()),
        memories: sanitize(listMemories()),
        updatedAt: new Date().toISOString(),
      } satisfies MirrorDoc,
      { merge: true },
    );
  } catch {
    /* offline: local remains source of truth */
  }
}

/**
 * Adopt-then-merge on login: push local rows first (so pre-login device data
 * survives), union with the remote mirror, then persist + push the union.
 */
export async function pullDeviceMirror(uid: string): Promise<void> {
  try {
    await pushDeviceMirror(uid);
    const snap = await getDoc(mirrorRef(uid));
    const remote = (snap.exists() ? (snap.data() as MirrorDoc) : {}) || {};
    const people = unionById(listPeople(), Array.isArray(remote.people) ? remote.people : []);
    const memories = unionById(listMemories(), Array.isArray(remote.memories) ? remote.memories : []);
    replacePeople(people);
    replaceMemories(memories);
    await pushDeviceMirror(uid);
  } catch {
    /* offline: keep local */
  }
}
