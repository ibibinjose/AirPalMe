import { afterEach, describe, expect, it } from "vitest";
import {
  __resetChatMemoryForTests,
  __seedChatMemoryForTests,
  asConvMap,
  asMessageList,
  ChatSendError,
  createConversationRecord,
  markConversationRead,
  mergeMessages,
  requestAiReply,
  retryMessage,
  sendErrorText,
  sendUniversalMessage,
  subscribeMessages,
} from "./chat-store";
import type { UniversalChatMessage, UniversalConversation } from "@shared/messaging";

const ME = { uid: "u-me", name: "Me" };
const PEER = { uid: "u-peer", name: "Peer" };

function msg(partial: Partial<UniversalChatMessage> & { id: string }): UniversalChatMessage {
  return {
    conversationId: "c1",
    senderUid: ME.uid,
    senderName: ME.name,
    text: "hi",
    readBy: [ME.uid],
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

function conv(partial: Partial<UniversalConversation> = {}): UniversalConversation {
  return {
    id: "c1",
    type: "direct",
    participants: [],
    participantUids: [ME.uid, PEER.uid],
    title: "Chat",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

describe("chat store", () => {
  afterEach(() => {
    __resetChatMemoryForTests();
  });

  it("sends locally when the backend is unreachable (never eats input)", async () => {
    const sent = await sendUniversalMessage("c1", "hello", ME, { sync: false });
    expect(sent.text).toBe("hello");
    expect(sent.sync).toBe("local");
  });

  it("rejects empty and overlong messages with a typed error", async () => {
    await expect(sendUniversalMessage("c1", "  ", ME)).rejects.toMatchObject({
      code: "invalid",
    });
    await expect(sendUniversalMessage("c1", "a".repeat(1001), ME)).rejects.toMatchObject({
      code: "invalid",
    });
    expect(sendErrorText("invalid")).toContain("1000");
    expect(sendErrorText("denied")).toContain("Sign in");
    expect(sendErrorText("offline")).toContain("retry");
  });

  it("notifies subscribers of the echo", async () => {
    const seen: UniversalChatMessage[][] = [];
    const unsub = subscribeMessages("c1", (list) => seen.push(list));
    await sendUniversalMessage("c1", "hello", ME, { sync: false });
    unsub();
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen[seen.length - 1]!.map((m) => m.text)).toContain("hello");
  });

  it("self-heals corrupt caches instead of crashing sends", async () => {
    __seedChatMemoryForTests("airpal.universal_messages.v1", "not-json{{{");
    __seedChatMemoryForTests("airpal.universal_conversations.v1", "[1,2,3]");
    const sent = await sendUniversalMessage("c1", "still works", ME, { sync: false });
    expect(sent.text).toBe("still works");
    expect(asMessageList("garbage")).toEqual([]);
    expect(asMessageList([{ id: 1 }])).toEqual([]);
    expect(asConvMap([1, 2])).toEqual({});
    expect(asConvMap({ c1: { id: "c1" } })).toEqual({ c1: { id: "c1" } });
  });

  it("merges snapshots: union by id, remote wins, failed survives", () => {
    const localEcho = msg({ id: "msg-local", text: "echo", sync: "local" });
    const failed = msg({ id: "msg-failed", text: "doomed", sync: "failed" });
    const serverCopy = msg({ id: "srv-1", text: "echo", sync: "sent" });
    const merged = mergeMessages([localEcho, failed], [serverCopy]);
    expect(merged.map((m) => m.id).sort()).toEqual(["msg-failed", "srv-1"]);
  });

  it("merges snapshots in time order", () => {
    const a = msg({ id: "a", createdAt: "2026-01-01T00:00:00Z" });
    const b = msg({ id: "b", createdAt: "2026-01-02T00:00:00Z" });
    expect(mergeMessages([b], [a]).map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("marks conversations read locally without throwing", () => {
    createConversationRecord({ type: "direct", title: "Chat", userUid: ME.uid, peerUid: PEER.uid });
    expect(() => markConversationRead("direct_u-me_u-peer", ME.uid)).not.toThrow();
  });

  it("retry is a no-op unless the message failed", async () => {
    await sendUniversalMessage("c1", "hello", ME, { sync: false });
    await expect(retryMessage("c1", "missing")).resolves.toBeUndefined();
  });

  it("answers from the live endpoint on stay chats, honestly on failure", async () => {
    // No backend in tests: the endpoint throws, the assistant says so.
    const reply = await requestAiReply(conv({ type: "stay", targetId: "prop-1" }), "wifi password?");
    expect(reply?.isAi).toBe(true);
    expect(reply?.text).toContain("couldn't reach live answers");
    expect(reply?.sync).toBe("local");
  }, 15000);

  it("guides without inventing facts off-property, stays out of mate chats", async () => {
    const ai = await requestAiReply(conv({ type: "ai" }), "best bars?");
    expect(ai?.text).toContain("stay chat");
    const stayBare = await requestAiReply(conv({ type: "stay" }), "hello?");
    expect(stayBare?.text).toContain("front desk");
    const mate = await requestAiReply(conv({ type: "direct" }), "see you at 7");
    expect(mate).toBeNull();
    const tagged = await requestAiReply(conv({ type: "direct" }), "@airpal find coffee");
    expect(tagged?.isAi).toBe(true);
  }, 15000);

  it("ChatSendError carries codes views can render", () => {
    const err = new ChatSendError("denied", sendErrorText("denied"));
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("denied");
  });
});
