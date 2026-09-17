import { httpsCallable } from "firebase/functions";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import type { BioProfile } from "@shared/bio";
import { getFirebaseDb, getFirebaseFunctions } from "./firebase";

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Mirror this account's profiles to its private cloud shelf. Fire-and-forget safe. */
export async function mirrorProfilesToCloud(uid: string, profiles: BioProfile[]): Promise<void> {
  const db = getFirebaseDb();
  if (!db || !uid) return;
  const owned = profiles.filter((p) => p.ownerUid === uid);
  await Promise.all(
    owned.map((p) =>
      setDoc(doc(db, "users", uid, "profiles", p.id), clean({ ...p, ownerUid: uid }), { merge: true }),
    ),
  );
}

/** Pull the account cloud shelf (empty when offline, signed out, or never saved). */
export async function pullRemoteProfiles(uid: string): Promise<BioProfile[]> {
  const db = getFirebaseDb();
  if (!db || !uid) return [];
  const snap = await getDocs(collection(db, "users", uid, "profiles"));
  return snap.docs.map((d) => ({ ...(d.data() as BioProfile), id: d.id }));
}

/**
 * Claim profiles left on other sign-ins under this verified email.
 * Copies them onto this account and marks the orphans — never deletes.
 */
export function adoptProfilesByEmailRemote() {
  return (async () => {
    const functions = getFirebaseFunctions();
    if (!functions) throw new Error("Firebase is not configured.");
    const callable = httpsCallable<Record<string, never>, { ok: boolean; adopted: number }>(
      functions,
      "adoptProfilesByEmail",
    );
    const result = await callable({});
    return result.data;
  })();
}
