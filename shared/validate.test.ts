import { describe, expect, it } from "vitest";
import { isAdultBirthDate } from "./validate";

describe("isAdultBirthDate", () => {
  it("admits exactly 18 and rejects a day younger", () => {
    expect(isAdultBirthDate("2008-09-20", "2026-09-20")).toBe(true);
    expect(isAdultBirthDate("2008-09-21", "2026-09-20")).toBe(false);
  });

  it("rejects malformed and impossible dates", () => {
    expect(isAdultBirthDate("", "2026-09-20")).toBe(false);
    expect(isAdultBirthDate("20-09-2008", "2026-09-20")).toBe(false);
    expect(isAdultBirthDate("2008-02-30", "2026-09-20")).toBe(false);
    expect(isAdultBirthDate("2008-13-01", "2026-09-20")).toBe(false);
    expect(isAdultBirthDate("2030-01-01", "2026-09-20")).toBe(false);
  });
});
