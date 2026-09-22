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
    const open = new Date("2026-09-14T12:00:00+10:00"); // Monday
    const closed = new Date("2026-09-14T18:00:00+10:00");
    expect(isOpenAt("8am–5pm", open, tz)).toBe(true);
    expect(isOpenAt("8am–5pm", closed, tz)).toBe(false);
  });

  it("keeps weekend-only hours shut on Monday", () => {
    const monday = new Date("2026-09-14T12:00:00+10:00");
    expect(isOpenAt("Sat–Sun 10am–5pm", monday, tz)).toBe(false);
  });

  it("evaluates multi-day 7-day schedule strings correctly for Monday and Saturday", () => {
    const multiDay = "Mon–Fri 7:00 AM – 4:00 PM, Sat 8:00 AM – 2:00 PM, Sun Closed";
    const mondayOpen = new Date("2026-09-14T10:00:00+10:00"); // Mon 10am -> open
    const mondayLate = new Date("2026-09-14T17:00:00+10:00"); // Mon 5pm -> closed
    const saturdayOpen = new Date("2026-09-19T09:00:00+10:00"); // Sat 9am -> open
    const saturdayLate = new Date("2026-09-19T15:00:00+10:00"); // Sat 3pm -> closed
    const sunday = new Date("2026-09-20T12:00:00+10:00"); // Sun 12pm -> closed

    expect(isOpenAt(multiDay, mondayOpen, tz)).toBe(true);
    expect(isOpenAt(multiDay, mondayLate, tz)).toBe(false);
    expect(isOpenAt(multiDay, saturdayOpen, tz)).toBe(true);
    expect(isOpenAt(multiDay, saturdayLate, tz)).toBe(false);
    expect(isOpenAt(multiDay, sunday, tz)).toBe(false);
  });

  it("evaluates Google Places weekdayDescriptions format", () => {
    const googlePlaceHours =
      "Monday: 7:00 AM - 4:00 PM; Tuesday: 7:00 AM - 4:00 PM; Wednesday: 7:00 AM - 4:00 PM; Thursday: 7:00 AM - 4:00 PM; Friday: 7:00 AM - 4:00 PM; Saturday: 8:00 AM - 2:00 PM; Sunday: Closed";
    const mon10am = new Date("2026-09-14T10:00:00+10:00");
    const sun10am = new Date("2026-09-20T10:00:00+10:00");
    expect(isOpenAt(googlePlaceHours, mon10am, tz)).toBe(true);
    expect(isOpenAt(googlePlaceHours, sun10am, tz)).toBe(false);
  });

  it("returns null when hours cannot be read", () => {
    expect(isOpenAt("Ask reception", new Date(), tz)).toBe(null);
  });
});
