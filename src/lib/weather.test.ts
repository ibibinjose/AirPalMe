import { describe, expect, it } from "vitest";
import { weekdayShort } from "./weather";

describe("weekdayShort", () => {
  it("returns a short weekday for a valid date", () => {
    expect(weekdayShort("2026-09-18", "Australia/Sydney")).toBe("Fri");
  });

  it("returns empty string for invalid input instead of throwing", () => {
    expect(weekdayShort("not-a-date", "Australia/Sydney")).toBe("");
    expect(weekdayShort("", "Nope/Nowhere")).toBe("");
  });
});
