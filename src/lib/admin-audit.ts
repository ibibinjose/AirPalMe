import { addDoc, collection } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

/** §20: every admin action writes an audit entry. Best-effort — never blocks the action. */

export interface AuditEntry {
  actorUid: string;
  action: string;
  collection: string;
  docId: string;
  from: string;
  to: string;
  note: string;
  createdAt: string;
}

export function buildAuditEntry(input: {
  actorUid: string;
  action: string;
  collection: string;
  docId: string;
  from?: string;
  to?: string;
  note?: string;
  at?: string;
}): AuditEntry {
  return {
    actorUid: input.actorUid,
    action: input.action,
    collection: input.collection,
    docId: input.docId,
    from: input.from ?? "",
    to: input.to ?? "",
    note: (input.note ?? "").slice(0, 500),
    createdAt: input.at ?? new Date().toISOString(),
  };
}

export async function logAdminAction(
  actorUid: string,
  action: string,
  collectionName: string,
  docId: string,
  from?: string,
  to?: string,
  note?: string,
): Promise<void> {
  try {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured || !actorUid) return;
    await addDoc(
      collection(db, "admin_audits"),
      buildAuditEntry({ actorUid, action, collection: collectionName, docId, from, to, note }),
    );
  } catch {
    // Audit is best-effort by design.
  }
}
