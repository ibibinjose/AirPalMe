import { describe, expect, it } from "vitest";
import { minutesOfDay, toZonedDateStr, zonedWeekdayIndex } from "./local-time";

describe("toZonedDateStr", () => {
  it("uses the zoned calendar date, not UTC", () => {
    // 14 Sep 2026 14:30 in US Pacific is already 15 Sep morning in Sydney.
    const instant = new Date("2026-09-14T14:30:00-07:00");
    expect(instant.toISOString().slice(0, 10)).toBe("2026-09-14");
    expect(toZonedDateStr(instant, "Australia/Sydney")).toBe("2026-09-15");
    expect(toZonedDateStr(instant, "America/Los_Angeles")).toBe("2026-09-14");
  });

  it("keeps the Sydney date in the evening", () => {
    const evening = new Date("2026-09-14T21:00:00+10:00");
    expect(toZonedDateStr(evening, "Australia/Sydney")).toBe("2026-09-14");
  });
});

describe("zonedWeekdayIndex", () => {
  it("returns Monday for 14 Sep 2026 in Sydney", () => {
    const d = new Date("2026-09-14T09:00:00+10:00");
    expect(zonedWeekdayIndex(d, "Australia/Sydney")).toBe(1);
  });
});

describe("minutesOfDay", () => {
  it("reads 17:30 in the given zone", () => {
    const d = new Date("2026-09-14T17:30:00+10:00");
    expect(minutesOfDay(d, "Australia/Sydney")).toBe(17 * 60 + 30);
  });
});
