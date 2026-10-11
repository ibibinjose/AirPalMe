import { describe, expect, it } from "vitest";
import {
  checkSessionAttach,
  festivalDays,
  groupSessionsByDay,
  isValidFestivalDate,
  isValidFestivalSlug,
  slugifyFestivalName,
  validateFestival,
  zonedDateStr,
  zonedTimeToIso,
} from "./festival";

describe("festival slugs", () => {
  it("accepts clean slugs and rejects reserved and malformed ones", () => {
    expect(isValidFestivalSlug("spark-festival-2026")).toBe(true);
    expect(isValidFestivalSlug("new")).toBe(false);
    expect(isValidFestivalSlug("Spark2026")).toBe(false);
    expect(isValidFestivalSlug("ab")).toBe(false);
    expect(isValidFestivalSlug("-spark-")).toBe(false);
    expect(isValidFestivalSlug("spark--fest")).toBe(false);
  });

  it("slugifies names", () => {
    expect(slugifyFestivalName("Spark Festival 2026")).toBe("spark-festival-2026");
  });
});

describe("festival dates", () => {
  it("validates calendar dates", () => {
    expect(isValidFestivalDate("2026-09-21")).toBe(true);
    expect(isValidFestivalDate("2026-02-30")).toBe(false);
    expect(isValidFestivalDate("21-09-2026")).toBe(false);
  });

  it("builds Spark week with Spark-style anchors", () => {
    const days = festivalDays({ startDate: "2026-09-21", endDate: "2026-09-27", timeZone: "Australia/Sydney" });
    expect(days.map((d) => d.date)).toEqual([
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
    ]);
    expect(days[0]?.anchor).toBe("day-mon");
    expect(days[0]?.label).toBe("Monday 21 September");
    expect(days[4]?.anchor).toBe("day-fri");
  });

  it("rejects inverted ranges", () => {
    expect(festivalDays({ startDate: "2026-09-27", endDate: "2026-09-21", timeZone: "Australia/Sydney" })).toEqual([]);
  });
});

describe("session grouping", () => {
  it("groups Sydney-zoned sessions by day and sorts by time", () => {
    const days = festivalDays({ startDate: "2026-09-21", endDate: "2026-09-22", timeZone: "Australia/Sydney" });
    const grouped = groupSessionsByDay(
      [
        { id: "b", startsAt: "2026-09-21T13:00:00+10:00" },
        { id: "a", startsAt: "2026-09-21T09:00:00+10:00" },
        { id: "c", startsAt: "2026-09-22T10:00:00+10:00" },
        { id: "late", startsAt: "2026-09-21T23:30:00+10:00" },
        { id: "outside", startsAt: "2026-09-28T09:00:00+10:00" },
      ],
      days,
      "Australia/Sydney",
    );
    expect(grouped[0]?.sessions.map((s) => s.id)).toEqual(["a", "b", "late"]);
    expect(grouped[1]?.sessions.map((s) => s.id)).toEqual(["c"]);
  });

  it("zones late UTC nights into the Sydney day", () => {
    // 13:30 UTC Monday is 23:30 AEST Monday — still Monday in Sydney.
    expect(zonedDateStr("2026-09-21T13:30:00Z", "Australia/Sydney")).toBe("2026-09-21");
    // 15:30 UTC Monday is 01:30 AEST Tuesday.
    expect(zonedDateStr("2026-09-21T15:30:00Z", "Australia/Sydney")).toBe("2026-09-22");
  });
});

describe("zoned wall time", () => {
  it("resolves AEST in September and AEDT in October", () => {
    expect(zonedTimeToIso("2026-09-21", "09:00", "Australia/Sydney")).toBe("2026-09-21T09:00:00+10:00");
    expect(zonedTimeToIso("2026-10-07", "17:00", "Australia/Sydney")).toBe("2026-10-07T17:00:00+11:00");
    expect(zonedTimeToIso("not-a-date", "09:00", "Australia/Sydney")).toBe("");
  });
});

describe("session attach guard", () => {
  const festival = { slug: "spark-festival-2026", createdByUid: "org-1" };
  it("allows the festival organiser and admins, refuses strangers and ghosts", () => {
    expect(checkSessionAttach(festival, "org-1", false)).toBe(null);
    expect(checkSessionAttach(festival, "someone-else", true)).toBe(null);
    expect(checkSessionAttach(festival, "someone-else", false)).toBe(
      "Only the festival organiser can add sessions to this program.",
    );
    expect(checkSessionAttach(null, "org-1", false)).toBe("Festival not found.");
  });
});

describe("festival validation", () => {
  it("requires name, slug, city, and a sane range", () => {
    expect(
      validateFestival({ name: "", slug: "ok-slug", city: "Sydney", startDate: "2026-09-21", endDate: "2026-09-27" }),
    ).toContain("Festival name is required.");
    expect(
      validateFestival({ name: "Spark", slug: "new", city: "Sydney", startDate: "2026-09-21", endDate: "2026-09-27" }),
    ).toContain("Slug must be 3–60 lowercase letters, digits, or single hyphens.");
    expect(
      validateFestival({
        name: "Spark",
        slug: "spark-2026",
        city: "Sydney",
        startDate: "2026-09-27",
        endDate: "2026-09-21",
      }),
    ).toContain("End date cannot be before start date.");
    expect(
      validateFestival({
        name: "Spark Festival 2026",
        slug: "spark-festival-2026",
        city: "Sydney",
        startDate: "2026-09-21",
        endDate: "2026-09-27",
      }),
    ).toEqual([]);
  });
});
