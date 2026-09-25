import {
  addDoc,
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
import type {
  ChatParticipant,
  ConversationType,
  UniversalChatMessage,
  UniversalConversation,
} from "@shared/messaging";
import { messageValid } from "@shared/messaging";
import { getCachedProperty } from "./properties";
import { CURRENT_PROPERTY } from "@shared/airpal-data";

const CONV_CACHE_KEY = "airpal.universal_conversations.v1";
const MSG_CACHE_KEY = "airpal.universal_messages.v1";

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
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
  const allConvs = readLocal<Record<string, UniversalConversation>>(CONV_CACHE_KEY, {});
  return Object.values(allConvs).sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""));
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
  const allConvs = readLocal<Record<string, UniversalConversation>>(CONV_CACHE_KEY, {});
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
  writeLocal(CONV_CACHE_KEY, allConvs);
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

  const allConvs = readLocal<Record<string, UniversalConversation>>(CONV_CACHE_KEY, {});
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
  writeLocal(CONV_CACHE_KEY, allConvs);
  notifyConvListeners();

  // If new, seed the first welcome message in message cache
  const allMsgs = readLocal<Record<string, UniversalChatMessage[]>>(MSG_CACHE_KEY, {});
  if (!allMsgs[convId] || allMsgs[convId].length === 0) {
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
    };
    allMsgs[convId] = [welcomeMsg];
    writeLocal(MSG_CACHE_KEY, allMsgs);
    notifyMsgListeners(convId, allMsgs[convId]);
  }

  // Sync to Firestore in background
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

/** Send a universal chat message with optional AI auto-response */
export async function sendUniversalMessage(
  conversationId: string,
  text: string,
  sender: { uid: string; name: string; photo?: string },
  options?: {
    isAi?: boolean;
    propertyContext?: any;
  },
): Promise<UniversalChatMessage> {
  if (!messageValid(sender.uid, text)) {
    throw new Error("Invalid message content");
  }

  const now = new Date().toISOString();
  const newMsg: UniversalChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    conversationId,
    senderUid: sender.uid,
    senderName: sender.name,
    senderPhoto: sender.photo,
    text: text.trim(),
    isAi: options?.isAi || false,
    readBy: [sender.uid],
    createdAt: now,
  };

  // 1. Update local messages cache
  const allMsgs = readLocal<Record<string, UniversalChatMessage[]>>(MSG_CACHE_KEY, {});
  const currentList = allMsgs[conversationId] || [];
  const updatedList = [...currentList, newMsg];
  allMsgs[conversationId] = updatedList;
  writeLocal(MSG_CACHE_KEY, allMsgs);
  notifyMsgListeners(conversationId, updatedList);

  // 2. Update local conversation summary
  const allConvs = readLocal<Record<string, UniversalConversation>>(CONV_CACHE_KEY, {});
  const conv = allConvs[conversationId];
  if (conv) {
    conv.lastMessage = newMsg.text;
    conv.lastSenderUid = sender.uid;
    conv.lastMessageAt = now;
    conv.updatedAt = now;
    allConvs[conversationId] = conv;
    writeLocal(CONV_CACHE_KEY, allConvs);
    notifyConvListeners();
  }

  // 3. Firestore persistence
  const db = getFirebaseDb();
  if (db && isFirebaseConfigured) {
    void addDoc(collection(db, "conversations", conversationId, "messages"), {
      ...newMsg,
      createdAt: now,
      serverTime: serverTimestamp(),
    }).catch(() => undefined);

    void updateDoc(doc(db, "conversations", conversationId), {
      lastMessage: newMsg.text,
      lastSenderUid: sender.uid,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch(() => undefined);
  }

  // 4. Trigger AirPal AI intelligent reply if applicable
  if (conv && (conv.type === "ai" || conv.isAiEnabled || conv.type === "stay")) {
    const isAiTarget = conv.type === "ai" || text.toLowerCase().includes("@airpal") || conv.type === "stay";
    if (isAiTarget && sender.uid !== "airpal-ai") {
      void triggerAirPalAiReply(conversationId, text, options?.propertyContext);
    }
  }

  return newMsg;
}

/** AirPal AI intelligent response generator */
async function triggerAirPalAiReply(conversationId: string, userText: string, propertyContext?: any) {
  // Realistic instant AI typing delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  const lower = userText.toLowerCase();
  let aiText = "";
  let suggestedActions: UniversalChatMessage["suggestedActions"] = undefined;

  const prop = propertyContext || CURRENT_PROPERTY;

  if (lower.includes("wifi") || lower.includes("wi-fi") || lower.includes("password") || lower.includes("internet")) {
    aiText = `Here are the Wi-Fi details for ${prop.name}:\n• Network: ${prop.wifi?.network || "Guest_HighSpeed"}\n• Speed: ${prop.wifi?.speed || "250 Mbps Fibre"}\n• Password: Tap below to copy or connect automatically!`;
    suggestedActions = [
      { label: "📋 Copy Wi-Fi Details", action: "copy_wifi" },
      { label: "🛎️ Contact Front Desk", action: "contact_desk" },
    ];
  } else if (lower.includes("towel") || lower.includes("pillow") || lower.includes("clean") || lower.includes("housekeep")) {
    aiText = `I've noted your request for housekeeping! I'll dispatch a priority ticket directly to our housekeeping team right away.`;
    suggestedActions = [
      { label: "✅ Confirm Request", action: "confirm_towels" },
      { label: "📦 In-Room Dining", action: "open_dining" },
    ];
  } else if (lower.includes("food") || lower.includes("dinner") || lower.includes("eat") || lower.includes("menu") || lower.includes("breakfast") || lower.includes("hungry")) {
    aiText = `You can order directly to your room from our In-Room Dining menu, or explore curated restaurants in The Rocks & Sydney Harbour! Breakfast is served daily from 6:30 AM – 10:30 AM in the Ground Floor Atrium.`;
    suggestedActions = [
      { label: "🍽️ View Dining Menu", action: "open_dining" },
      { label: "☕ Specialty Cafés Nearby", action: "nearby_coffee" },
    ];
  } else if (lower.includes("pool") || lower.includes("gym") || lower.includes("sauna") || lower.includes("facility") || lower.includes("facilities")) {
    aiText = `Here are our main amenities at ${prop.name}:\n• Rooftop Plunge Pool: Level 7 (6:00 AM – 10:00 PM)\n• Fitness Centre & Sauna: Level 2 (24 Hours with Keycard)\n• The Rocks Cellar Bar: Ground Floor (4:00 PM – 11:30 PM)\n• Luggage Storage: Lobby (24/7 Front Desk)`;
    suggestedActions = [
      { label: "🏊 View Pool Details", action: "pool" },
      { label: "🏋️ View Gym Details", action: "gym" },
    ];
  } else if (lower.includes("checkout") || lower.includes("check out") || lower.includes("leave")) {
    aiText = `Standard check-out is at 10:00 AM. You can use our Express Check-Out in the digital compendium to review your folio, book a taxi, and store your luggage complimentary at the lobby front desk!`;
    suggestedActions = [
      { label: "🕒 Request Late Checkout", action: "late_checkout" },
      { label: "🧳 Luggage Storage", action: "luggage" },
    ];
  } else {
    aiText = `Got it! I'm on it. Whether you need in-room assistance, curated recommendations around Sydney, or want to connect with a local AirPal mate, I'm here 24/7 to make it easy.`;
    suggestedActions = [
      { label: "📖 Digital Compendium", action: "compendium" },
      { label: "🗺️ Explore Guide", action: "guide" },
      { label: "🤝 Find an AirPal Mate", action: "mate" },
    ];
  }

  const now = new Date().toISOString();
  const aiMsg: UniversalChatMessage = {
    id: `ai-${Date.now()}`,
    conversationId,
    senderUid: "airpal-ai",
    senderName: "AirPal AI",
    senderPhoto: AIRPAL_AI_PARTICIPANT.photo,
    text: aiText,
    isAi: true,
    suggestedActions,
    readBy: [],
    createdAt: now,
  };

  const allMsgs = readLocal<Record<string, UniversalChatMessage[]>>(MSG_CACHE_KEY, {});
  const currentList = allMsgs[conversationId] || [];
  const updatedList = [...currentList, aiMsg];
  allMsgs[conversationId] = updatedList;
  writeLocal(MSG_CACHE_KEY, allMsgs);
  notifyMsgListeners(conversationId, updatedList);

  const allConvs = readLocal<Record<string, UniversalConversation>>(CONV_CACHE_KEY, {});
  const conv = allConvs[conversationId];
  if (conv) {
    conv.lastMessage = aiMsg.text;
    conv.lastSenderUid = "airpal-ai";
    conv.lastMessageAt = now;
    conv.updatedAt = now;
    allConvs[conversationId] = conv;
    writeLocal(CONV_CACHE_KEY, allConvs);
    notifyConvListeners();
  }
}

/** Subscribe to all active conversations for a user */
export function subscribeConversations(
  userUid: string,
  callback: (convs: UniversalConversation[]) => void,
): () => void {
  const getList = () => {
    const allConvs = readLocal<Record<string, UniversalConversation>>(CONV_CACHE_KEY, {});
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
    try {
      const q = query(
        collection(db, "conversations"),
        where("participantUids", "array-contains", userUid),
        orderBy("lastMessageAt", "desc"),
        limit(50),
      );
      unsubFirestore = onSnapshot(q, (snap) => {
        const remoteConvs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UniversalConversation, "id">) }));
        const allConvs = readLocal<Record<string, UniversalConversation>>(CONV_CACHE_KEY, {});
        remoteConvs.forEach((rc) => {
          allConvs[rc.id] = rc;
        });
        writeLocal(CONV_CACHE_KEY, allConvs);
        callback(getList());
      });
    } catch {
      /* fallback to local listener */
    }
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
    const allMsgs = readLocal<Record<string, UniversalChatMessage[]>>(MSG_CACHE_KEY, {});
    return (allMsgs[conversationId] || []).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
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
    try {
      const q = query(
        collection(db, "conversations", conversationId, "messages"),
        orderBy("createdAt", "asc"),
        limit(100),
      );
      unsubFirestore = onSnapshot(q, (snap) => {
        const remoteMsgs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UniversalChatMessage, "id">) }));
        if (remoteMsgs.length > 0) {
          const allMsgs = readLocal<Record<string, UniversalChatMessage[]>>(MSG_CACHE_KEY, {});
          allMsgs[conversationId] = remoteMsgs;
          writeLocal(MSG_CACHE_KEY, allMsgs);
          callback(remoteMsgs);
        }
      });
    } catch {
      /* fallback */
    }
  }

  return () => {
    set.delete(listener);
    if (set.size === 0) msgListeners.delete(conversationId);
    if (unsubFirestore) unsubFirestore();
  };
}
