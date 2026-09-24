import { getMessaging } from "firebase-admin/messaging";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { db } from "./admin";

/**
 * Pure routing decision for ping pushes. Unit-tested; the triggers below
 * only fetch names/tokens and send. Rules:
 * - a new `sent` ping notifies the recipient
 * - a transition into `pinged_back` notifies the original sender
 * - everything else is silent
 */
export function pingPushTarget(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): { toUid: string; event: "pinged" | "pinged_back" } | null {
  if (!after) return null;
  if (!before) {
    if (after.status !== "sent") return null;
    const toUid = String(after.toUid || "");
    return toUid ? { toUid, event: "pinged" } : null;
  }
  if (after.status === "pinged_back" && before.status !== "pinged_back") {
    const fromUid = String(after.fromUid || "");
    return fromUid ? { toUid: fromUid, event: "pinged_back" } : null;
  }
  return null;
}

async function displayName(uid: string): Promise<string> {
  try {
    const snap = await db.collection("users").doc(uid).get();
    const data = (snap.data() || {}) as Record<string, unknown>;
    return String(data.displayName || data.firstName || "Someone");
  } catch {
    return "Someone";
  }
}

/** Best-effort push. The pings row is the record; push never blocks it. */
async function pushPing(toUid: string, title: string, body: string, pingId: string): Promise<void> {
  try {
    if (!toUid) return;
    const tokensSnap = await db.collection("users").doc(toUid).collection("fcmTokens").get();
    const tokens = [...new Set(tokensSnap.docs.map((d) => String(d.data()?.token || "")).filter(Boolean))];
    if (!tokens.length) return;
    await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: { type: "ping", pingId },
      webpush: { fcmOptions: { link: "https://airpal.me/me/inbox" } },
    });
  } catch {
    /* push unavailable (emulator, no keys) — inbox remains the source of truth */
  }
}

async function handlePingWrite(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  pingId: string,
): Promise<void> {
  const target = pingPushTarget(before, after);
  if (!target || !after) return;
  const otherUid = target.event === "pinged" ? String(after.fromUid || "") : String(after.toUid || "");
  const storedName =
    target.event === "pinged" ? String(after.fromName || "") : String(after.toName || "");
  const name = storedName || (await displayName(otherUid));
  if (target.event === "pinged") {
    await pushPing(target.toUid, `${name} pinged you`, "See who's around and ping back.", pingId);
  } else {
    await pushPing(target.toUid, `${name} pinged you back`, "Say hi — plan something together.", pingId);
  }
}

export const onPingCreated = onDocumentCreated("pings/{pingId}", async (event) => {
  await handlePingWrite(null, (event.data?.data() || {}) as Record<string, unknown>, String(event.params.pingId || ""));
});

export const onPingUpdated = onDocumentUpdated("pings/{pingId}", async (event) => {
  await handlePingWrite(
    (event.data?.before?.data() || {}) as Record<string, unknown>,
    (event.data?.after?.data() || {}) as Record<string, unknown>,
    String(event.params.pingId || ""),
  );
});
