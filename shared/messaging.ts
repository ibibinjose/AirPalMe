/**
 * Universal messaging system for AirPal:
 * - Direct mate & peer conversations
 * - Business & Venue inquiries
 * - Stay & Hotel Front Desk guest communications
 * - AirPal AI Copilot assistant
 */

export interface ChatMessageInput {
  senderUid: string;
  text: string;
}

export interface ChatMessage extends ChatMessageInput {
  id: string;
  createdAt: string;
  readBy: string[];
}

export type ConversationType = "direct" | "business" | "stay" | "plan" | "ai";

export interface ChatParticipant {
  uid: string;
  name: string;
  handle?: string;
  photo?: string;
  role?: "user" | "host" | "business" | "mate" | "ai";
}

export interface UniversalConversation {
  id: string;
  type: ConversationType;
  participants: ChatParticipant[];
  participantUids: string[];
  title: string;
  subtitle?: string;
  photo?: string;
  targetId?: string; // propertyId, handle, planId, etc.
  lastMessage?: string;
  lastSenderUid?: string;
  lastMessageAt?: string;
  unreadCount?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  isAiEnabled?: boolean;
}

export interface UniversalChatMessage {
  id: string;
  conversationId: string;
  senderUid: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  isAi?: boolean;
  suggestedActions?: Array<{ label: string; action: string; payload?: string }>;
  readBy: string[];
  createdAt: string;
  updatedAt?: string;
}

export const MESSAGE_MAX = 1000;

export function messageValid(senderUid: string, text: string): boolean {
  const clean = text.trim();
  return senderUid.trim().length > 0 && clean.length >= 1 && clean.length <= MESSAGE_MAX;
}

export function isChatParticipant(uid: string, ownerUid?: string, mateUid?: string): boolean {
  if (!uid) return false;
  return uid === ownerUid || uid === mateUid;
}

export function unreadCount(messages: Pick<ChatMessage, "senderUid" | "readBy">[], uid: string): number {
  return messages.filter((m) => m.senderUid !== uid && !m.readBy.includes(uid)).length;
}

export type MatchChatActionId = "book" | "plan";

export interface MatchChatAction {
  id: MatchChatActionId;
  label: string;
}

/**
 * Match → book handoff chips inside the request_chats thread. Customer-only:
 * book while unbooked (label mirrors the Mate page Book button), then plan.
 */
export function matchChatActions(opts: {
  viewerIsCustomer: boolean;
  matched: boolean;
  booked: boolean;
  budget: number;
}): MatchChatAction[] {
  if (!opts.viewerIsCustomer || !opts.matched) return [];
  const actions: MatchChatAction[] = [];
  if (!opts.booked) {
    const amount = Number.isFinite(opts.budget) ? Math.max(0, Math.floor(opts.budget)) : 0;
    actions.push({ id: "book", label: amount > 0 ? `Book · about $${amount}` : "Book · free" });
  }
  actions.push({ id: "plan", label: "Make a Plan" });
  return actions;
}
