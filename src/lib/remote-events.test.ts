import { describe, expect, it } from "vitest";
import {
  cityMatches,
  cleanSpeakers,
  docToCalendarBase,
  docToEventRecord,
  eventMapsUrl,
  liveCalendarEvents,
  tonightCalendarEvents,
  toNearbyEvent,
} from "./remote-events";
import type { CalendarEvent } from "@shared/event";

function cal(partial: Partial<CalendarEvent> & { id: string }): CalendarEvent {
  return {
    title: "T",
    description: "D",
    startsAt: "2026-09-15T18:00:00+10:00",
    endsAt: "2026-09-15T21:00:00+10:00",
    date: "2026-09-15",
    timeLabel: "6–9 PM",
    city: "Sydney",
    venue: "Hall",
    category: "music",
    categoryLabel: "Live Music",
    source: "local",
    isLocal: true,
    isGoing: false,
    isInterested: false,
    isLiked: false,
    ...partial,
  };
}

describe("cityMatches", () => {
  it("matches case-insensitively both directions and includes unscoped events", () => {
    expect(cityMatches("Sydney", "sydney")).toBe(true);
    expect(cityMatches("Sydney NSW", "Sydney")).toBe(true);
    expect(cityMatches("Sydney", "Sydney NSW")).toBe(true);
    expect(cityMatches("", "Sydney")).toBe(true);
    expect(cityMatches("Sydney", "")).toBe(true);
    expect(cityMatches("Melbourne", "Sydney")).toBe(false);
    expect(cityMatches("Sydney", "Ashfield")).toBe(false);
    expect(cityMatches("Sydney", "The Rocks, Sydney")).toBe(true);
  });
});

describe("toNearbyEvent", () => {
  it("accepts live DB docs and coerces status, rejects unschedulable docs", () => {
    const ok = toNearbyEvent(
      { title: "Markets", when: "Sat–Sun 10:00–17:00", status: "live", venueName: "George St" },
      "m1",
    );
    expect(ok?.id).toBe("m1");
    expect(ok?.status).toBe("active");
    expect(toNearbyEvent({ title: "No when", status: "live" }, "m2")).toBeNull();
    expect(toNearbyEvent({ title: "T", when: "Tonight", status: "draft" }, "m3")).toBeNull();
    expect(toNearbyEvent({ when: "Tonight", status: "live" }, "m4")).toBeNull();
  });
});

describe("docToEventRecord", () => {
  it("accepts organiser docs and rejects curated/junk docs", () => {
    const rec = docToEventRecord(
      { name: "Night Market", flavour: "market", city: "Sydney", startsAt: "2026-09-15T18:00:00+10:00" },
      "e9",
    );
    expect(rec?.id).toBe("e9");
    expect(rec?.gatePath).toContain("e9");
    expect(docToEventRecord({ title: "Curated", when: "Tonight", status: "live" }, "e10")).toBeNull();
    expect(
      docToEventRecord({ name: "No city", flavour: "market", startsAt: "2026-09-15T18:00:00+10:00" }, "e11"),
    ).toBeNull();
    expect(
      docToEventRecord(
        { name: "Bad flavour", flavour: "rave", city: "Sydney", startsAt: "2026-09-15T18:00:00+10:00" },
        "e12",
      ),
    ).toBeNull();
  });
});

describe("docToCalendarBase", () => {
  it("maps EventRecord-shaped docs and rejects nameless ones", () => {
    const base = docToCalendarBase(
      { name: "Night Market", flavour: "market", city: "Sydney", startsAt: "2026-09-15T18:00:00+10:00" },
      "e1",
    );
    expect(base?.title).toBe("Night Market");
    expect(base?.category).toBe("market");
    expect(docToCalendarBase({ name: "", flavour: "market", city: "Sydney", startsAt: "x" }, "e2")).toBeNull();
  });

  it("maps CalendarEvent-shaped docs and rejects junk", () => {
    const base = docToCalendarBase({ title: "Jazz", startsAt: "2026-09-15T18:00:00+10:00", date: "2026-09-15" }, "e3");
    expect(base?.id).toBe("e3");
    expect(base?.city).toBe("");
    expect(docToCalendarBase({ title: "x" }, "e4")).toBeNull();
  });
});

describe("tonight/live calendar selectors", () => {
  const tz = "Australia/Sydney";
  const now = new Date("2026-09-15T19:00:00+10:00");

  it("tonight keeps today's unfinished city-matching events", () => {
    const rows = [
      cal({ id: "a", city: "Sydney" }),
      cal({ id: "b", city: "Melbourne" }),
      cal({ id: "c", date: "2026-09-16", startsAt: "2026-09-16T18:00:00+10:00", endsAt: "2026-09-16T21:00:00+10:00" }),
      cal({ id: "d", endsAt: "2026-09-15T18:00:00+10:00", startsAt: "2026-09-15T16:00:00+10:00" }),
      cal({ id: "e", city: "" }),
    ];
    expect(tonightCalendarEvents(rows, now, tz, "Sydney").map((e) => e.id)).toEqual(["a", "e"]);
  });

  it("live keeps events whose window contains now", () => {
    const rows = [
      cal({ id: "a", city: "Sydney" }),
      cal({ id: "b", startsAt: "2026-09-15T21:00:00+10:00", endsAt: "2026-09-15T23:00:00+10:00" }),
      cal({ id: "c", city: "Melbourne" }),
    ];
    expect(liveCalendarEvents(rows, now, tz, "Sydney").map((e) => e.id)).toEqual(["a"]);
  });
});

describe("cleanSpeakers", () => {
  it("cleans names, roles, and @handles, drops nameless entries", () => {
    expect(
      cleanSpeakers([
        { name: "  Sarah J  ", role: " CEO ", handle: "@Sarah_J " },
        { name: "Roy Green" },
        { name: "   " },
        { name: "X", handle: "  " },
        "not-an-object",
      ]),
    ).toEqual([{ name: "Sarah J", role: "CEO", handle: "sarah_j" }, { name: "Roy Green" }, { name: "X" }]);
  });

  it("returns undefined for empty input", () => {
    expect(cleanSpeakers(undefined)).toBe(undefined);
    expect(cleanSpeakers([])).toBe(undefined);
  });
});

describe("eventMapsUrl", () => {
  it("prefers place id, then gps, then text search", () => {
    expect(eventMapsUrl({ mapsPlaceId: "ChIJ123", venue: "Hall" })).toContain("query_place_id=ChIJ123");
    expect(eventMapsUrl({ venue: "UTS Great Hall", room: "Building 1", geo: { lat: -33.88, lng: 151.19 } })).toContain(
      "query=",
    );
    const text = eventMapsUrl({ venue: "Stone & Chalk", room: "Boardroom 5+6", city: "Sydney" });
    expect(text).toContain(encodeURIComponent("Stone & Chalk, Boardroom 5+6, Sydney").slice(0, 20));
    expect(eventMapsUrl({})).toBe(null);
  });
});
