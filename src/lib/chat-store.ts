import {
  arrayUnion,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "./firebase";
import { askAirPalRemote } from "./functions";
import type {
  ChatParticipant,
  ConversationType,
  UniversalChatMessage,
  UniversalConversation,
} from "@shared/messaging";
import { MESSAGE_MAX, messageValid } from "@shared/messaging";
import { getCachedProperty } from "./properties";
import { CURRENT_PROPERTY } from "@shared/airpal-data";

const CONV_CACHE_KEY = "airpal.universal_conversations.v1";
const MSG_CACHE_KEY = "airpal.universal_messages.v1";

/** Send failure with a machine-readable code so views show honest errors. */
export class ChatSendError extends Error {
  code: "invalid" | "offline" | "denied" | "unknown";
  constructor(code: "invalid" | "offline" | "denied" | "unknown", message: string) {
    super(message);
    this.code = code;
  }
}

export function sendErrorText(code: ChatSendError["code"]): string {
  switch (code) {
    case "invalid":
      return `Write something first — messages run 1 to ${MESSAGE_MAX} characters.`;
    case "offline":
      return "Couldn't reach AirPal — your message is kept here. Tap to retry.";
    case "denied":
      return "Sign in to sync this chat across devices.";
    case "unknown":
      return "Couldn't send. Check your connection and try again.";
  }
}

function sendErrorCode(err: unknown): ChatSendError["code"] {
  const code = (err as { code?: string } | null)?.code || "";
  if (code === "permission-denied" || code === "functions/permission-denied") return "denied";
  if (code === "unavailable" || code === "functions/unavailable") return "offline";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Guarded storage: validates shapes, self-heals corrupt keys, and falls back
// to memory when localStorage is missing (SSR/tests) or blocked (private mode).
// ---------------------------------------------------------------------------

type StorageBackend = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const memoryBackend = new Map<string, string>();

function backend(): StorageBackend {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.getItem("__airpal_probe");
      return localStorage;
    }
  } catch {
    /* fall through to memory */
  }
  return {
    getItem: (k) => (memoryBackend.has(k) ? memoryBackend.get(k)! : null),
    setItem: (k, v) => {
      memoryBackend.set(k, v);
    },
    removeItem: (k) => {
      memoryBackend.delete(k);
    },
  };
}

/** Test-only: clear the memory fallback so chat tests start clean. */
export function __resetChatMemoryForTests(): void {
  memoryBackend.clear();
}

/** Test-only: seed raw storage to prove corrupt-cache recovery. */
export function __seedChatMemoryForTests(key: string, raw: string): void {
  memoryBackend.set(key, raw);
}

function isMessageLike(value: unknown): value is UniversalChatMessage {
  if (!value || typeof value !== "object") return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    typeof m.conversationId === "string" &&
    typeof m.senderUid === "string" &&
    typeof m.text === "string"
  );
}

/** Coerce unknown JSON to a message list; drops malformed rows, never throws. */
export function asMessageList(value: unknown): UniversalChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isMessageLike);
}

/** Coerce unknown JSON to a conversation map; drops malformed rows. */
export function asConvMap(value: unknown): Record<string, UniversalConversation> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, UniversalConversation> = {};
  for (const [id, conv] of Object.entries(value as Record<string, unknown>)) {
    if (conv && typeof conv === "object" && typeof (conv as { id?: unknown }).id === "string") {
      out[id] = conv as UniversalConversation;
    }
  }
  return out;
}

function readConvs(): Record<string, UniversalConversation> {
  try {
    const raw = backend().getItem(CONV_CACHE_KEY);
    if (!raw) return {};
    return asConvMap(JSON.parse(raw));
  } catch {
    try {
      backend().removeItem(CONV_CACHE_KEY);
    } catch {
      /* ignore */
    }
    return {};
  }
}

function readMsgs(convId: string): UniversalChatMessage[] {
  try {
    const raw = backend().getItem(MSG_CACHE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Record<string, unknown>;
    if (!all || typeof all !== "object" || Array.isArray(all)) return [];
    return asMessageList(all[convId]);
  } catch {
    return [];
  }
}

function writeMsgs(convId: string, list: UniversalChatMessage[]): void {
  try {
    const store = backend();
    let all: Record<string, unknown> = {};
    try {
      const raw = store.getItem(MSG_CACHE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        all = parsed as Record<string, unknown>;
      }
    } catch {
      all = {};
    }
    all[convId] = list;
    store.setItem(MSG_CACHE_KEY, JSON.stringify(all));
  } catch {
    /* quota: session continues in memory listeners */
  }
}

function writeConvs(all: Record<string, UniversalConversation>): void {
  try {
    backend().setItem(CONV_CACHE_KEY, JSON.stringify(all));
  } catch {
    /* ignore storage quota */
  }
}

const convListeners = new Set<() => void>();
const msgListeners = new Map<string, Set<(msgs: UniversalChatMessage[]) => void>>();

function notifyConvListeners() {
  convListeners.forEach((fn) => fn());
}

function notifyMsgListeners(convId: string, msgs: UniversalChatMessage[]) {
  const set = msgListeners.get(convId);
  if (set) {
    set.forEach((fn) => fn(msgs));
  }
}

/** Get default AirPal AI assistant participant */
export const AIRPAL_AI_PARTICIPANT: ChatParticipant = {
  uid: "airpal-ai",
  name: "AirPal AI Assistant",
  handle: "airpal",
  photo: "https://airpal.me/brand/avatar-ai.png",
  role: "ai",
};

/** Deterministic conversation ID generator */
export function buildConversationId(
  type: ConversationType,
  targetId: string,
  userUid: string,
  peerUid?: string,
): string {
  if (type === "ai") return `ai_${userUid || "guest"}`;
  if (type === "stay") return `stay_${targetId || "hotel"}_${userUid || "guest"}`;
  if (type === "business") return `biz_${targetId}_${userUid || "guest"}`;
  if (type === "plan") return `plan_${targetId}`;
  const uids = [userUid, peerUid || "unknown"].sort();
  return `direct_${uids[0]}_${uids[1]}`;
}

/** Predefined initial welcome messages */
function getInitialGreeting(type: ConversationType, title: string, targetId?: string): string {
  if (type === "ai") {
    return "Hi there! I'm AirPal AI, your 24/7 concierge & assistant. How can I help make your day easy? Ask me for local dining spots, events tonight, stay questions, or planning a catch-up!";
  }
  if (type === "stay") {
    const prop = targetId ? getCachedProperty(targetId) || CURRENT_PROPERTY : CURRENT_PROPERTY;
    return `Welcome to ${prop?.name || title}! Our front desk and 24/7 AirPal AI are here to assist with room requests, Wi-Fi, dining, and late check-outs. What can we do for you?`;
  }
  if (type === "business") {
    return `Hello! Thanks for reaching out to ${title} on AirPal. Ask us about reservations, opening hours, deals, or special requests.`;
  }
  return `Connected with ${title} on AirPal. Say hello to get started!`;
}

/** Get all locally stored conversations synchronously */
export function getLocalConversations(): UniversalConversation[] {
  return Object.values(readConvs()).sort((a, b) =>
    (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""),
  );
}

/** Synchronously create or retrieve conversation record */
export function createConversationRecord({
  type,
  targetId = "",
  title,
  subtitle,
  photo,
  userUid = "guest",
  userName = "Guest",
  userPhoto,
  peerUid,
  peerName,
  peerPhoto,
}: {
  type: ConversationType;
  targetId?: string;
  title: string;
  subtitle?: string;
  photo?: string;
  userUid?: string;
  userName?: string;
  userPhoto?: string;
  peerUid?: string;
  peerName?: string;
  peerPhoto?: string;
}): UniversalConversation {
  const convId = buildConversationId(type, targetId, userUid, peerUid);
  const allConvs = readConvs();
  if (allConvs[convId]) return allConvs[convId];

  const participants: ChatParticipant[] = [
    {
      uid: userUid,
      name: userName,
      photo: userPhoto,
      role: "user",
    },
  ];

  if (type === "ai") {
    participants.push(AIRPAL_AI_PARTICIPANT);
  } else if (peerUid) {
    participants.push({
      uid: peerUid,
      name: peerName || title,
      photo: peerPhoto || photo,
      role: type === "business" ? "business" : type === "stay" ? "host" : "mate",
    });
  }

  const now = new Date().toISOString();
  const conv: UniversalConversation = {
    id: convId,
    type,
    participants,
    participantUids: participants.map((p) => p.uid),
    title,
    subtitle,
    photo,
    targetId,
    lastMessage: getInitialGreeting(type, title, targetId),
    lastSenderUid: type === "ai" ? "airpal-ai" : type === "stay" ? "host" : userUid,
    lastMessageAt: now,
    unreadCount: {},
    createdAt: now,
    updatedAt: now,
    isAiEnabled: true,
  };

  allConvs[convId] = conv;
  writeConvs(allConvs);
  notifyConvListeners();

  return conv;
}

/** Get or create a conversation seamlessly */
export async function getOrCreateConversation({
  type,
  targetId,
  title,
  subtitle,
  photo,
  currentUser,
  peerUser,
  isAiEnabled = true,
}: {
  type: ConversationType;
  targetId?: string;
  title: string;
  subtitle?: string;
  photo?: string;
  currentUser: { uid: string; name: string; handle?: string; photo?: string };
  peerUser?: { uid: string; name: string; handle?: string; photo?: string; role?: ChatParticipant["role"] };
  isAiEnabled?: boolean;
}): Promise<UniversalConversation> {
  const convId = buildConversationId(type, targetId || "", currentUser.uid, peerUser?.uid);

  const participants: ChatParticipant[] = [
    {
      uid: currentUser.uid,
      name: currentUser.name,
      handle: currentUser.handle,
      photo: currentUser.photo,
      role: "user",
    },
  ];

  if (type === "ai") {
    participants.push(AIRPAL_AI_PARTICIPANT);
  } else if (peerUser) {
    participants.push({
      uid: peerUser.uid,
      name: peerUser.name,
      handle: peerUser.handle,
      photo: peerUser.photo,
      role: peerUser.role || (type === "business" ? "business" : type === "stay" ? "host" : "mate"),
    });
  }

  const allConvs = readConvs();
  const existing = allConvs[convId];

  const now = new Date().toISOString();
  const conv: UniversalConversation = existing || {
    id: convId,
    type,
    participants,
    participantUids: participants.map((p) => p.uid),
    title,
    subtitle,
    photo,
    targetId,
    lastMessage: getInitialGreeting(type, title, targetId),
    lastSenderUid: type === "ai" ? "airpal-ai" : type === "stay" ? "host" : currentUser.uid,
    lastMessageAt: now,
    unreadCount: {},
    createdAt: now,
    updatedAt: now,
    isAiEnabled,
  };

  allConvs[convId] = conv;
  writeConvs(allConvs);
  notifyConvListeners();

  // If new, seed the first welcome message in message cache
  if (readMsgs(convId).length === 0) {
    const welcomeMsg: UniversalChatMessage = {
      id: `welcome-${Date.now()}`,
      conversationId: convId,
      senderUid: type === "ai" ? "airpal-ai" : peerUser?.uid || "airpal-ai",
      senderName: type === "ai" ? "AirPal AI" : title,
      senderPhoto: photo || (type === "ai" ? AIRPAL_AI_PARTICIPANT.photo : undefined),
      text: getInitialGreeting(type, title, targetId),
      isAi: type === "ai",
      suggestedActions:
        type === "stay"
          ? [
              { label: "📶 Copy Wi-Fi", action: "wifi" },
              { label: "🍽️ In-Room Dining", action: "dining" },
              { label: "🧺 Extra Towels", action: "towels" },
              { label: "🕒 Late Checkout", action: "checkout" },
            ]
          : type === "ai"
            ? [
                { label: "🍸 Best Rooftop Bars", action: "ask_bars" },
                { label: "☕ Specialty Coffee Nearby", action: "ask_coffee" },
                { label: "🎭 What's on Tonight", action: "ask_tonight" },
              ]
            : undefined,
      readBy: [currentUser.uid],
      createdAt: now,
      sync: "local",
    };
    writeMsgs(convId, [welcomeMsg]);
    notifyMsgListeners(convId, [welcomeMsg]);
  }

  // Sync to Firestore in background (best effort — guests stay local-only).
  const db = getFirebaseDb();
  if (db && isFirebaseConfigured) {
    void setDoc(
      doc(db, "conversations", convId),
      {
        ...conv,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ).catch(() => undefined);
  }

  return conv;
}

function newMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function updateConvSummary(
  conversationId: string,
  patch: Partial<UniversalConversation>,
): UniversalConversation | null {
  const allConvs = readConvs();
  const conv = allConvs[conversationId];
  if (!conv) return null;
  const next = { ...conv, ...patch };
  allConvs[conversationId] = next;
  writeConvs(allConvs);
  notifyConvListeners();
  return next;
}

function upsertLocalMessage(msg: UniversalChatMessage): UniversalChatMessage[] {
  const list = readMsgs(msg.conversationId);
  const idx = list.findIndex((m) => m.id === msg.id);
  const next = idx >= 0 ? list.map((m, i) => (i === idx ? msg : m)) : [...list, msg];
  next.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  writeMsgs(msg.conversationId, next);
  notifyMsgListeners(msg.conversationId, next);
  return next;
}

/**
 * Send a message. The local echo always lands first (when valid) so the UI
 * never eats input; Firestore sync is awaited for signed-in members and its
 * outcome is stamped on the message (sent / failed) instead of vanishing.
 * Guests stay local-only — no doomed writes, no fake errors.
 */
export async function sendUniversalMessage(
  conversationId: string,
  text: string,
  sender: { uid: string; name: string; photo?: string },
  options?: {
    isAi?: boolean;
    /** Signed-in members sync; guests stay local-only. Defaults to true. */
    sync?: boolean;
  },
): Promise<UniversalChatMessage> {
  if (!messageValid(sender.uid, text)) {
    throw new ChatSendError("invalid", sendErrorText("invalid"));
  }

  const now = new Date().toISOString();
  const msg: UniversalChatMessage = {
    id: newMessageId(),
    conversationId,
    senderUid: sender.uid,
    senderName: sender.name,
    senderPhoto: sender.photo,
    text: text.trim(),
    isAi: options?.isAi || false,
    readBy: [sender.uid],
    createdAt: now,
    sync: "local",
  };
  upsertLocalMessage(msg);
  {
    const conv = readConvs()[conversationId];
    const unreadCount = { ...(conv?.unreadCount || {}) };
    for (const uid of conv?.participantUids || []) {
      if (uid !== sender.uid && uid !== "airpal-ai") unreadCount[uid] = (unreadCount[uid] || 0) + 1;
    }
    updateConvSummary(conversationId, {
      lastMessage: msg.text,
      lastSenderUid: sender.uid,
      lastMessageAt: now,
      updatedAt: now,
      unreadCount,
    });
  }

  const db = getFirebaseDb();
  if (!db || !isFirebaseConfigured || options?.sync === false) return msg;

  try {
    await setDoc(doc(db, "conversations", conversationId, "messages", msg.id), {
      id: msg.id,
      conversationId,
      senderUid: sender.uid,
      senderName: sender.name,
      senderPhoto: sender.photo || null,
      text: msg.text,
      isAi: false,
      readBy: [sender.uid],
      createdAt: now,
    });
    const summary = readConvs()[conversationId];
    try {
      await updateDoc(doc(db, "conversations", conversationId), {
        lastMessage: msg.text,
        lastSenderUid: sender.uid,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(summary?.unreadCount ? { unreadCount: summary.unreadCount } : {}),
      });
    } catch {
      // Shell may not exist remotely yet — recreate it from the cached shape.
      const conv = readConvs()[conversationId];
      if (conv) {
        await setDoc(
          doc(db, "conversations", conversationId),
          {
            ...conv,
            lastMessage: msg.text,
            lastSenderUid: sender.uid,
            lastMessageAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
    }
  } catch (err) {
    const code = sendErrorCode(err);
    upsertLocalMessage({ ...msg, sync: "failed" });
    throw new ChatSendError(code, sendErrorText(code));
  }
  const sent = { ...msg, sync: "sent" as const };
  upsertLocalMessage(sent);
  return sent;
}

/** Retry a failed message. No-op for anything already sent or local-only. */
export async function retryMessage(conversationId: string, messageId: string): Promise<void> {
  const msg = readMsgs(conversationId).find((m) => m.id === messageId);
  if (!msg || msg.sync !== "failed") return;
  const db = getFirebaseDb();
  if (!db || !isFirebaseConfigured) {
    throw new ChatSendError("offline", sendErrorText("offline"));
  }
  try {
    await setDoc(doc(db, "conversations", conversationId, "messages", msg.id), {
      id: msg.id,
      conversationId,
      senderUid: msg.senderUid,
      senderName: msg.senderName,
      senderPhoto: msg.senderPhoto || null,
      text: msg.text,
      isAi: false,
      readBy: msg.readBy,
      createdAt: msg.createdAt,
    });
    upsertLocalMessage({ ...msg, sync: "sent" });
  } catch (err) {
    const code = sendErrorCode(err);
    throw new ChatSendError(code, sendErrorText(code));
  }
}

/**
 * Mark a conversation read by uid: local state plus best-effort remote
 * readBy unions (rules allow readBy-only updates). Never throws — read
 * state must not break the chat.
 */
export function markConversationRead(conversationId: string, uid: string): void {
  if (!uid) return;
  const list = readMsgs(conversationId);
  let changed = false;
  const next = list.map((m) => {
    if (m.senderUid !== uid && !m.readBy.includes(uid)) {
      changed = true;
      return { ...m, readBy: [...m.readBy, uid] };
    }
    return m;
  });
  if (changed) {
    writeMsgs(conversationId, next);
    notifyMsgListeners(conversationId, next);
  }
  const db = getFirebaseDb();
  if (!db || !isFirebaseConfigured) return;
  for (const m of list) {
    if (m.senderUid !== uid && !m.readBy.includes(uid) && !m.id.startsWith("welcome-")) {
      void updateDoc(doc(db, "conversations", conversationId, "messages", m.id), {
        readBy: arrayUnion(uid),
      }).catch(() => undefined);
    }
  }
  const allConvs = readConvs();
  const conv = allConvs[conversationId];
  if (conv?.unreadCount?.[uid]) {
    updateConvSummary(conversationId, { unreadCount: { ...conv.unreadCount, [uid]: 0 } });
  }
}

/**
 * Merge remote snapshots over local state. Union by id (remote wins ties),
 * legacy local echoes that match a server copy by content collapse into it,
 * local-only and failed rows always survive. Sorted oldest-first.
 */
export function mergeMessages(
  local: UniversalChatMessage[],
  remote: UniversalChatMessage[],
): UniversalChatMessage[] {
  const byId: Record<string, UniversalChatMessage> = {};
  for (const m of local) {
    if (m && m.id) byId[m.id] = m;
  }
  const remoteKeys: Record<string, boolean> = {};
  for (const m of remote) {
    if (m && m.id) remoteKeys[`${m.senderUid}|${m.text}|${m.createdAt}`] = true;
  }
  // Legacy echoes (client random ids) collapse into their server copies.
  for (const id of Object.keys(byId)) {
    const m = byId[id];
    if (m.sync !== "failed" && remoteKeys[`${m.senderUid}|${m.text}|${m.createdAt}`]) {
      const serverCopy = remote.find(
        (r) => r.senderUid === m.senderUid && r.text === m.text && r.createdAt === m.createdAt,
      );
      if (serverCopy && serverCopy.id !== id) delete byId[id];
    }
  }
  for (const m of remote) {
    if (m && m.id) byId[m.id] = m;
  }
  return Object.keys(byId)
    .map((id) => byId[id])
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
}

function appendAiMessage(
  conversationId: string,
  text: string,
  suggestedActions?: UniversalChatMessage["suggestedActions"],
): UniversalChatMessage {
  // Rules pin senderUid to the caller, so assistant replies are local-only by
  // necessity — merge keeps them across snapshots.
  const now = new Date().toISOString();
  const msg: UniversalChatMessage = {
    id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    conversationId,
    senderUid: "airpal-ai",
    senderName: "AirPal AI",
    senderPhoto: AIRPAL_AI_PARTICIPANT.photo,
    text,
    isAi: true,
    suggestedActions,
    readBy: [],
    createdAt: now,
    sync: "local",
  };
  upsertLocalMessage(msg);
  updateConvSummary(conversationId, {
    lastMessage: text,
    lastSenderUid: "airpal-ai",
    lastMessageAt: now,
    updatedAt: now,
  });
  return msg;
}

/**
 * Assistant reply for a user message. Stay chats ask the live property
 * endpoint; anything else gets honest local guidance (never invented facts).
 * Returns null for chats the assistant should stay out of. Never throws —
 * endpoint failures become an honest assistant message.
 */
export async function requestAiReply(
  conv: UniversalConversation,
  userText: string,
): Promise<UniversalChatMessage | null> {
  const wantsAi = conv.type === "ai" || conv.type === "stay" || userText.toLowerCase().includes("@airpal");
  if (!wantsAi) return null;
  await new Promise((resolve) => setTimeout(resolve, 350));

  const propertyId = conv.type === "stay" ? (conv.targetId || "").trim() : "";
  if (propertyId) {
    try {
      const res = await askAirPalRemote({ propertyId, question: userText.trim().slice(0, 1000) });
      const title = String(res.title || "").trim();
      const body = String(res.body || "").trim();
      return appendAiMessage(conv.id, [title, body].filter(Boolean).join("\n\n") || body, [
        { label: "🛎️ Contact Front Desk", action: "contact_desk" },
      ]);
    } catch {
      return appendAiMessage(
        conv.id,
        "I couldn't reach live answers right now. Try again in a bit — or ask the front desk and they'll sort you out.",
        [{ label: "🛎️ Contact Front Desk", action: "contact_desk" }],
      );
    }
  }

  if (conv.type === "stay") {
    return appendAiMessage(
      conv.id,
      "I'm AirPal AI. This stay chat isn't linked to live hotel answers right now — the front desk can help with anything urgent.",
      [{ label: "🛎️ Contact Front Desk", action: "contact_desk" }],
    );
  }
  if (conv.type === "ai" || userText.toLowerCase().includes("@airpal")) {
    return appendAiMessage(
      conv.id,
      "I'm AirPal AI. Open your stay chat and I can answer from live hotel knowledge — rooms, Wi-Fi, dining, facilities. Here, I can point you at the good stuff.",
      [
        { label: "🗺️ Explore Near Me", action: "guide" },
        { label: "🤝 Find an AirPal Mate", action: "mate" },
      ],
    );
  }
  return null;
}

/** Subscribe to all active conversations for a user */
export function subscribeConversations(
  userUid: string,
  callback: (convs: UniversalConversation[]) => void,
): () => void {
  const getList = () => {
    const allConvs = readConvs();
    const list = Object.values(allConvs)
      .filter((c) => !userUid || c.participantUids.includes(userUid) || c.type === "ai" || c.type === "stay")
      .sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""));
    return list;
  };

  callback(getList());

  const listener = () => callback(getList());
  convListeners.add(listener);

  let unsubFirestore: (() => void) | undefined;
  const db = getFirebaseDb();
  if (db && isFirebaseConfigured && userUid) {
    const q = query(
      collection(db, "conversations"),
      where("participantUids", "array-contains", userUid),
      orderBy("lastMessageAt", "desc"),
      limit(50),
    );
    unsubFirestore = onSnapshot(
      q,
      (snap) => {
        const remoteConvs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UniversalConversation, "id">) }));
        const allConvs = readConvs();
        remoteConvs.forEach((rc) => {
          allConvs[rc.id] = rc;
        });
        writeConvs(allConvs);
        callback(getList());
      },
      () => {
        /* index/permission hiccup: local cache keeps the inbox alive */
      },
    );
  }

  return () => {
    convListeners.delete(listener);
    if (unsubFirestore) unsubFirestore();
  };
}

/** Subscribe to messages for a specific conversation */
export function subscribeMessages(
  conversationId: string,
  callback: (msgs: UniversalChatMessage[]) => void,
): () => void {
  const getMsgs = () => {
    const list = readMsgs(conversationId);
    return [...list].sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  };

  callback(getMsgs());

  if (!msgListeners.has(conversationId)) {
    msgListeners.set(conversationId, new Set());
  }
  const set = msgListeners.get(conversationId)!;
  const listener = (msgs: UniversalChatMessage[]) => callback(msgs);
  set.add(listener);

  let unsubFirestore: (() => void) | undefined;
  const db = getFirebaseDb();
  if (db && isFirebaseConfigured && conversationId) {
    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "asc"),
      limit(100),
    );
    unsubFirestore = onSnapshot(
      q,
      (snap) => {
        const remoteMsgs = asMessageList(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UniversalChatMessage, "id">) })),
        );
        const merged = mergeMessages(readMsgs(conversationId), remoteMsgs);
        writeMsgs(conversationId, merged);
        callback(merged);
      },
      () => {
        /* offline/denied: local messages keep the thread alive */
      },
    );
  }

  return () => {
    set.delete(listener);
    if (set.size === 0) msgListeners.delete(conversationId);
    if (unsubFirestore) unsubFirestore();
  };
}
