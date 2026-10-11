import { describe, expect, it } from "vitest";
import {
  isStayDay,
  nightsBetween,
  quoteStayNights,
  stayBlockId,
  stayDateList,
  stayRangeFree,
  stayRangesOverlap,
} from "./stay-booking";

describe("stay nights", () => {
  it("counts whole nights and rejects inverted ranges", () => {
    expect(nightsBetween("2026-10-03", "2026-10-05")).toBe(2);
    expect(nightsBetween("2026-10-03", "2026-10-03")).toBe(0);
    expect(nightsBetween("2026-10-05", "2026-10-03")).toBe(0);
    expect(nightsBetween("soon", "2026-10-05")).toBe(0);
    expect(isStayDay("2026-10-03")).toBe(true);
    expect(isStayDay("03/10/2026")).toBe(false);
  });

  it("lists each night in the range", () => {
    expect(stayDateList("2026-10-03", "2026-10-05")).toEqual(["2026-10-03", "2026-10-04"]);
    expect(stayDateList("2026-10-03", "2026-10-03")).toEqual([]);
  });

  it("quotes from the nightly price in cents", () => {
    expect(
      quoteStayNights({ checkIn: "2026-10-03", checkOut: "2026-10-05", nightlyDollars: 320, guests: 2, capacity: 2 }),
    ).toEqual({
      nights: 2,
      nightlyCents: 32000,
      totalCents: 64000,
      guests: 2,
    });
    expect(
      quoteStayNights({ checkIn: "2026-10-05", checkOut: "2026-10-03", nightlyDollars: 320, guests: 1, capacity: 2 }),
    ).toBe("Check-out must be after check-in.");
    expect(
      quoteStayNights({ checkIn: "2026-10-03", checkOut: "2026-10-05", nightlyDollars: 0, guests: 1, capacity: 2 }),
    ).toBe("This room has no nightly price yet.");
    expect(
      quoteStayNights({ checkIn: "2026-10-03", checkOut: "2026-10-05", nightlyDollars: 320, guests: 5, capacity: 2 }),
    ).toBe("Too many guests for this room.");
  });

  it("detects blocked nights and overlapping stays", () => {
    expect(stayRangeFree(["2026-10-03", "2026-10-04"], new Set(["2026-10-04"]))).toBe(false);
    expect(stayRangeFree(["2026-10-03"], new Set(["2026-10-04"]))).toBe(true);
    expect(stayRangesOverlap("2026-10-03", "2026-10-05", "2026-10-04", "2026-10-06")).toBe(true);
    expect(stayRangesOverlap("2026-10-03", "2026-10-04", "2026-10-04", "2026-10-06")).toBe(false);
    expect(stayRangesOverlap("soon", "2026-10-05", "2026-10-04", "2026-10-06")).toBe(false);
  });

  it("keys block docs by property night", () => {
    expect(stayBlockId(" harbour ", "2026-10-03")).toBe("harbour_2026-10-03");
  });
});
