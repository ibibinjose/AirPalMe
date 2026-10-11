import { describe, expect, it } from "vitest";
import { relativeAgo, smartChatTime } from "./time-ago";

// Fixed local noon so day boundaries are unambiguous in any timezone.
const NOW = new Date(2026, 8, 30, 12, 0, 0).getTime();
const iso = (ms: number) => new Date(ms).toISOString();

describe("inbox timestamps", () => {
  it("ages notes compactly", () => {
    expect(relativeAgo(iso(NOW - 30_000), NOW)).toBe("Just now");
    expect(relativeAgo(iso(NOW - 5 * 60_000), NOW)).toBe("5m");
    expect(relativeAgo(iso(NOW - 3 * 60 * 60_000), NOW)).toBe("3h");
  });

  it("names days after that", () => {
    expect(relativeAgo(iso(NOW - 26 * 60 * 60_000), NOW)).toBe("Yesterday");
    const threeDays = NOW - 3 * 24 * 60 * 60_000;
    expect(relativeAgo(iso(threeDays), NOW)).toBe(new Date(threeDays).toLocaleDateString([], { weekday: "short" }));
    const fortyDays = NOW - 40 * 24 * 60 * 60_000;
    expect(relativeAgo(iso(fortyDays), NOW)).toBe(
      new Date(fortyDays).toLocaleDateString([], { day: "numeric", month: "short" }),
    );
  });

  it("keeps clock time for today's chats", () => {
    const morning = new Date(2026, 8, 30, 9, 41, 0).getTime();
    expect(smartChatTime(iso(morning), NOW)).toBe(
      new Date(morning).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    );
    expect(smartChatTime(iso(NOW - 26 * 60 * 60_000), NOW)).toBe("Yesterday");
  });

  it("hides the stamp on bad input instead of lying", () => {
    expect(relativeAgo("", NOW)).toBe("");
    expect(relativeAgo("not-a-date", NOW)).toBe("");
    expect(relativeAgo(iso(NOW + 60_000), NOW)).toBe("");
    expect(smartChatTime("", NOW)).toBe("");
  });
});
