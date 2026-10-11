import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  catchUpNotice,
  catchUpThreadText,
  catchUpTypeLabel,
  proposeCatchUpSlots,
  type CatchUpSlot,
} from "../../shared/catchup-agent";
import { CALLABLE, db, requireAccount } from "./admin";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import { fanOut } from "./notifications";

const AGENT_UID = "airpal-catchup";
const AGENT_NAME = "AirPal";

interface CatchUpDoc {
  id: string;
  requesterUid?: string;
  requesterName?: string;
  targetOwnerUid?: string;
  targetHandle?: string;
  type?: string;
  date?: string;
  time?: string;
  venue?: string;
  status?: string;
  proposals?: CatchUpSlot[];
  conversationId?: string;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function conversationIdFor(catchupId: string): string {
  return `catchup-${catchupId}`;
}

async function displayName(uid: string, fallback: string): Promise<string> {
  if (!uid) return fallback;
  const snap = await db.collection("users").doc(uid).get();
  const name = str(snap.data()?.displayName) || str(snap.data()?.name);
  return name || fallback;
}

async function writeThread(input: {
  catchupId: string;
  participantUids: string[];
  names: Record<string, string>;
  title: string;
  text: string;
  messageId: string;
  unreadUid?: string;
}): Promise<string> {
  const now = new Date().toISOString();
  const conversationId = conversationIdFor(input.catchupId);
  const unreadCount: Record<string, number> = {};
  if (input.unreadUid) unreadCount[input.unreadUid] = 1;
  const ref = db.collection("conversations").doc(conversationId);
  const existing = await ref.get();
  await ref.set(
    {
      id: conversationId,
      type: "direct",
      participantUids: input.participantUids,
      participants: input.participantUids.map((uid) => ({
        uid,
        name: input.names[uid] || "AirPal",
        role: "user",
      })),
      title: input.title,
      targetId: input.catchupId,
      lastMessage: input.text,
      lastSenderUid: AGENT_UID,
      lastMessageAt: now,
      unreadCount,
      updatedAt: now,
      ...(existing.exists ? {} : { createdAt: now }),
      isAiEnabled: false,
    },
    { merge: true },
  );
  await ref
    .collection("messages")
    .doc(input.messageId)
    .set({
      id: input.messageId,
      conversationId,
      senderUid: AGENT_UID,
      senderName: AGENT_NAME,
      text: input.text,
      isAi: true,
      readBy: [] as string[],
      createdAt: now,
    });
  return conversationId;
}

export const scheduleCatchUp = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "scheduleCatchUp");
  const uid = requireAccount(request, "Sign in to schedule a catch-up.");
  await enforceRateLimit(uid, "planWrite", isAnonymousAuth(request));

  const data = (request.data || {}) as { catchupId?: string; action?: string; slotId?: string };
  const catchupId = str(data.catchupId);
  const action = str(data.action);
  if (!catchupId) throw new HttpsError("invalid-argument", "catchupId is required.");
  if (action !== "open" && action !== "accept") {
    throw new HttpsError("invalid-argument", "Choose open or accept.");
  }

  const ref = db.collection("catchups").doc(catchupId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "That catch-up is no longer available.");
  const row = { id: snap.id, ...(snap.data() as Omit<CatchUpDoc, "id">) };
  const requesterUid = str(row.requesterUid);
  const ownerUid = str(row.targetOwnerUid);
  if (uid !== requesterUid && uid !== ownerUid) {
    throw new HttpsError("permission-denied", "Only the two people on this catch-up can schedule it.");
  }

  const participantUids = Array.from(new Set([requesterUid, ownerUid].filter(Boolean)));
  const typeLabel = catchUpTypeLabel(row.type);
  const who = str(row.requesterName) || (await displayName(requesterUid, "Someone"));
  const ownerName = ownerUid ? await displayName(ownerUid, "them") : "them";
  const title = `${typeLabel[0]?.toUpperCase() || ""}${typeLabel.slice(1)} · ${who} & ${ownerName}`;

  if (action === "open") {
    if (row.conversationId && Array.isArray(row.proposals) && row.proposals.length > 0) {
      return {
        ok: true,
        conversationId: row.conversationId,
        proposals: row.proposals,
        status: row.status || "pending",
      };
    }
    const proposals =
      Array.isArray(row.proposals) && row.proposals.length > 0
        ? row.proposals
        : proposeCatchUpSlots({
            now: new Date(),
            requestedDate: str(row.date) || undefined,
            requestedTime: str(row.time) || undefined,
          });
    if (proposals.length === 0) {
      throw new HttpsError("failed-precondition", "No open times in the next few days. Pick a later date.");
    }
    const text = catchUpThreadText({
      phase: "proposed",
      who,
      typeLabel,
      slots: proposals,
      venue: str(row.venue) || undefined,
    });
    const conversationId = await writeThread({
      catchupId,
      participantUids,
      names: { [requesterUid]: who, [ownerUid]: ownerName },
      title,
      text,
      messageId: "proposed",
      unreadUid: ownerUid && ownerUid !== uid ? ownerUid : undefined,
    });
    await ref.set({ proposals, conversationId, status: row.status || "pending" }, { merge: true });
    if (ownerUid && ownerUid !== uid) {
      const notice = catchUpNotice({
        phase: "proposed",
        who,
        typeLabel,
        slot: proposals[0],
        conversationId,
      });
      await fanOut({
        uids: [ownerUid],
        kind: notice.kind,
        title: notice.title,
        body: notice.body,
        promotionId: "",
        href: notice.href,
      });
    }
    return { ok: true, conversationId, proposals, status: row.status || "pending" };
  }

  const proposals =
    Array.isArray(row.proposals) && row.proposals.length > 0
      ? row.proposals
      : proposeCatchUpSlots({
          now: new Date(),
          requestedDate: str(row.date) || undefined,
          requestedTime: str(row.time) || undefined,
        });
  const slotId = str(data.slotId) || proposals[0]?.id || "";
  const chosen = proposals.find((slot) => slot.id === slotId);
  if (!chosen) throw new HttpsError("invalid-argument", "Pick one of the suggested times.");
  if (
    row.status === "scheduled" &&
    row.conversationId &&
    str(row.date) === chosen.date &&
    str(row.time) === chosen.time
  ) {
    return { ok: true, conversationId: row.conversationId, proposals, status: "scheduled", slot: chosen };
  }
  const text = catchUpThreadText({
    phase: "scheduled",
    who,
    typeLabel,
    slots: [chosen],
    venue: str(row.venue) || undefined,
  });
  const conversationId = await writeThread({
    catchupId,
    participantUids,
    names: { [requesterUid]: who, [ownerUid]: ownerName },
    title,
    text,
    messageId: `locked-${chosen.id}`,
    unreadUid: uid === requesterUid ? ownerUid : requesterUid,
  });
  await ref.set(
    {
      proposals,
      conversationId,
      status: "scheduled",
      date: chosen.date,
      time: chosen.time,
    },
    { merge: true },
  );
  const other = uid === requesterUid ? ownerUid : requesterUid;
  if (other) {
    const notice = catchUpNotice({
      phase: "scheduled",
      who: uid === requesterUid ? who : ownerName,
      typeLabel,
      slot: chosen,
      conversationId,
    });
    await fanOut({
      uids: [other],
      kind: notice.kind,
      title: notice.title,
      body: notice.body,
      promotionId: "",
      href: notice.href,
    });
  }
  return { ok: true, conversationId, proposals, status: "scheduled", slot: chosen };
});
