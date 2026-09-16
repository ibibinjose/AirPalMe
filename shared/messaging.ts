/**
 * §8 messaging: every conversation is tied to a mate_request match.
 * Participants = request owner + assigned mate (+ admins read for moderation).
 * No phone/email exposure — identity stays inside the chat.
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
