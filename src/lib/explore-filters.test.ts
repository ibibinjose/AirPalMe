import { describe, expect, it } from "vitest";
import {
  filterEventsByWhen,
  filterPlacesByPrice,
  nextWeekDates,
  weekendDates,
} from "./explore-filters";

describe("explore filters", () => {
  it("matches today exactly", () => {
    const events = [{ date: "2026-09-24" }, { date: "2026-09-25" }];
    expect(filterEventsByWhen(events, "today", "2026-09-24")).toEqual([{ date: "2026-09-24" }]);
    expect(filterEventsByWhen(events, "any", "2026-09-24")).toEqual(events);
  });

  it("resolves the weekend from a weekday", () => {
    // 2026-09-24 is a Thursday → weekend is Sat 26 + Sun 27.
    expect(weekendDates("2026-09-24")).toEqual(["2026-09-26", "2026-09-27"]);
    const events = [{ date: "2026-09-25" }, { date: "2026-09-26" }, { date: "2026-09-27" }];
    expect(filterEventsByWhen(events, "weekend", "2026-09-24")).toEqual([
      { date: "2026-09-26" },
      { date: "2026-09-27" },
    ]);
  });

  it("keeps Sunday inside its own weekend", () => {
    expect(weekendDates("2026-09-27")).toEqual(["2026-09-26", "2026-09-27"]);
  });

  it("covers the next seven days", () => {
    expect(nextWeekDates("2026-09-24")).toHaveLength(7);
    expect(nextWeekDates("2026-09-24")[0]).toBe("2026-09-25");
    const events = [{ date: "2026-09-24" }, { date: "2026-09-30" }, { date: "2026-10-05" }];
    expect(filterEventsByWhen(events, "next-week", "2026-09-24")).toEqual([{ date: "2026-09-30" }]);
  });

  it("returns empty honestly for a bad today", () => {
    expect(filterEventsByWhen([{ date: "2026-09-24" }], "weekend", "soon")).toEqual([]);
  });

  it("filters places only on declared price levels", () => {
    const places = [
      { id: "a", priceLevel: "Free" },
      { id: "b", priceLevel: "$$" },
      { id: "c" },
    ];
    expect(filterPlacesByPrice(places, "any")).toEqual(places);
    expect(filterPlacesByPrice(places, "Free").map((p) => p.id)).toEqual(["a"]);
    expect(filterPlacesByPrice(places, "$$").map((p) => p.id)).toEqual(["b"]);
    expect(filterPlacesByPrice(places, "$$$")).toEqual([]);
  });
});
