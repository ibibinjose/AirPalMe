import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  DEMO_TEARDOWN_COLLECTIONS,
  DEMO_TEARDOWN_SUBCOLLECTIONS,
} from "../../shared/demo-business";
import type { AccessClaims } from "../../shared/airpal-security";
import { CALLABLE, db, isPlatformAdmin, requireAccount } from "./admin";
import { writeAudit } from "./abuse";

/**
 * One-click demo-business teardown (platform admins only). Deletes every
 * `demo == true` doc across the demo-writing collections plus known
 * subcollections (property menu/private/qrCodes, event stalls).
 */
export const teardownDemoBusiness = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  if (!isPlatformAdmin((request.auth?.token || {}) as AccessClaims)) {
    throw new HttpsError("permission-denied", "Platform admins only.");
  }
  const deleted: Record<string, number> = {};
  for (const col of DEMO_TEARDOWN_COLLECTIONS) {
    const snap = await db.collection(col).where("demo", "==", true).get();
    let count = 0;
    for (const docSnap of snap.docs) {
      const subs = DEMO_TEARDOWN_SUBCOLLECTIONS[col] || [];
      for (const sub of subs) {
        const subSnap = await docSnap.ref.collection(sub).get();
        if (!subSnap.empty) {
          const sb = db.batch();
          subSnap.docs.forEach((d) => {
            sb.delete(d.ref);
          });
          await sb.commit();
        }
      }
      await docSnap.ref.delete();
      count += 1;
    }
    deleted[col] = count;
    await writeAudit({
      collection: col,
      docId: "demo:*",
      action: "delete",
      actorUid: uid,
      note: `demo teardown removed ${count}`,
    });
  }
  return { deleted };
});
