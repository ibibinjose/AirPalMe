import { describe, expect, it } from "vitest";
import { arrivalPhase, countdownLabel, parseCheckInClock } from "./arrival";

describe("arrival", () => {
  it("parses check-in clocks", () => {
    expect(parseCheckInClock("2:00 PM")).toEqual({ hours: 14, minutes: 0 });
    expect(parseCheckInClock("10:30 AM")).toEqual({ hours: 10, minutes: 30 });
    expect(parseCheckInClock("14:00")).toEqual({ hours: 14, minutes: 0 });
  });

  it("labels countdown", () => {
    expect(countdownLabel(90 * 1000)).toBe("2 min");
    expect(countdownLabel(2 * 3600 * 1000)).toBe("2h");
  });

  it("phases from time to check-in", () => {
    const checkIn = new Date("2026-09-10T14:00:00+10:00");
    expect(arrivalPhase(new Date("2026-09-09T10:00:00+10:00"), checkIn, false)).toBe("later");
    expect(arrivalPhase(new Date("2026-09-10T10:00:00+10:00"), checkIn, false)).toBe("today");
    expect(arrivalPhase(new Date("2026-09-10T13:00:00+10:00"), checkIn, false)).toBe("soon");
    expect(arrivalPhase(new Date("2026-09-10T14:30:00+10:00"), checkIn, false)).toBe("early");
    expect(arrivalPhase(new Date("2026-09-10T14:30:00+10:00"), checkIn, true)).toBe("open");
    expect(arrivalPhase(new Date("2026-09-10T20:00:00+10:00"), checkIn, true)).toBe("in");
  });
});
