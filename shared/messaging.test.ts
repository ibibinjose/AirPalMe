import { describe, expect, it } from "vitest";
import { isChatParticipant, matchChatActions, messageValid, unreadCount } from "./messaging";

describe("match messaging", () => {
  it("validates message bodies", () => {
    expect(messageValid("u1", "See you at 7 by the stairs")).toBe(true);
    expect(messageValid("u1", "  ")).toBe(false);
    expect(messageValid("", "hello")).toBe(false);
    expect(messageValid("u1", "x".repeat(1001))).toBe(false);
  });

  it("restricts chats to the match parties", () => {
    expect(isChatParticipant("u1", "u1", "u2")).toBe(true);
    expect(isChatParticipant("u2", "u1", "u2")).toBe(true);
    expect(isChatParticipant("u3", "u1", "u2")).toBe(false);
    expect(isChatParticipant("", "u1", "u2")).toBe(false);
  });

  it("counts unread for read state", () => {
    const msgs = [
      { senderUid: "u2", readBy: [] as string[] },
      { senderUid: "u2", readBy: ["u1"] },
      { senderUid: "u1", readBy: [] as string[] },
    ];
    expect(unreadCount(msgs, "u1")).toBe(1);
  });

  it("offers book + plan chips to the customer on a fresh match", () => {
    expect(matchChatActions({ viewerIsCustomer: true, matched: true, booked: false, budget: 80 })).toEqual([
      { id: "book", label: "Book · about $80" },
      { id: "plan", label: "Make a Plan" },
    ]);
    expect(matchChatActions({ viewerIsCustomer: true, matched: true, booked: false, budget: 0 })).toEqual([
      { id: "book", label: "Book · free" },
      { id: "plan", label: "Make a Plan" },
    ]);
  });

  it("drops the book chip once booked, and stays silent off the match", () => {
    expect(matchChatActions({ viewerIsCustomer: true, matched: true, booked: true, budget: 80 })).toEqual([
      { id: "plan", label: "Make a Plan" },
    ]);
    expect(matchChatActions({ viewerIsCustomer: true, matched: false, booked: false, budget: 80 })).toEqual([]);
    expect(matchChatActions({ viewerIsCustomer: false, matched: true, booked: false, budget: 80 })).toEqual([]);
  });
});
