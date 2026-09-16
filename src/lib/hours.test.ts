import { describe, expect, it } from "vitest";
import { isOpenAt, parseHoursWindow } from "./hours";

describe("parseHoursWindow", () => {
  it("parses am/pm ranges", () => {
    expect(parseHoursWindow("8am–5pm")).toEqual({ start: 8 * 60, end: 17 * 60, days: undefined });
  });

  it("parses 24h tonight windows", () => {
    expect(parseHoursWindow("Tonight 17:30–19:00")).toEqual({
      start: 17 * 60 + 30,
      end: 19 * 60,
      days: undefined,
    });
  });

  it("parses weekend markets", () => {
    expect(parseHoursWindow("Sat–Sun 10:00–17:00")).toEqual({
      start: 10 * 60,
      end: 17 * 60,
      days: [6, 0],
    });
  });

  it("treats late as past midnight", () => {
    const w = parseHoursWindow("11am–late");
    expect(w).not.toBe("unknown");
    expect(w).not.toBe("always");
    if (typeof w === "object") {
      expect(w.start).toBe(11 * 60);
      expect(w.end).toBeGreaterThan(24 * 60);
    }
  });
});

describe("isOpenAt", () => {
  const tz = "Australia/Sydney";

  it("is open mid-window and closed after", () => {
    const open = new Date("2026-09-14T12:00:00+10:00");
    const closed = new Date("2026-09-14T18:00:00+10:00");
    expect(isOpenAt("8am–5pm", open, tz)).toBe(true);
    expect(isOpenAt("8am–5pm", closed, tz)).toBe(false);
  });

  it("keeps weekend-only hours shut on Monday", () => {
    const monday = new Date("2026-09-14T12:00:00+10:00");
    expect(isOpenAt("Sat–Sun 10am–5pm", monday, tz)).toBe(false);
  });

  it("returns null when hours cannot be read", () => {
    expect(isOpenAt("Ask reception", new Date(), tz)).toBe(null);
  });
});
