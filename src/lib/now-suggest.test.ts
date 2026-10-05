import { describe, expect, it } from "vitest";
import type { NearbyPlace } from "@shared/nearby";
import {
  NOW_MOODS,
  NOW_WHENS,
  eveningAvailable,
  filterByMood,
  pickSuggestion,
  rankForWhen,
  type SuggestablePlace,
} from "./now-suggest";

const TZ = "Australia/Sydney";
// Monday 14 Sep 2026, noon Sydney time.
const MONDAY_NOON = new Date("2026-09-14T12:00:00+10:00");
const MONDAY = 1;

function makePlace(overrides: Partial<NearbyPlace> & { id: string }): SuggestablePlace {
  return {
    name: overrides.id,
    category: "coffee",
    shortWhy: "Test place",
    geo: { lat: -33.86, lng: 151.2 },
    source: "seed",
    status: "active",
    precinctId: "the-rocks",
    ...overrides,
  };
}

describe("filterByMood", () => {
  it("keeps only the mood categories, and keeps everything for anything", () => {
    const places = [makePlace({ id: "a", category: "coffee" }), makePlace({ id: "b", category: "eat" })];
    expect(filterByMood(places, "coffee").map((p) => p.id)).toEqual(["a"]);
    expect(filterByMood(places, "any").map((p) => p.id)).toEqual(["a", "b"]);
  });
});

describe("eveningAvailable", () => {
  it("covers windows over 7:30pm and never guesses unknown hours", () => {
    expect(eveningAvailable("8am–9pm", MONDAY)).toBe(true);
    expect(eveningAvailable("5pm–11pm", MONDAY)).toBe(true);
    expect(eveningAvailable("6pm–late", MONDAY)).toBe(true);
    expect(eveningAvailable("7am–11am", MONDAY)).toBe(false);
    expect(eveningAvailable("Sat–Sun 10am–5pm", MONDAY)).toBe(false);
    expect(eveningAvailable("See venue", MONDAY)).toBeNull();
    expect(eveningAvailable(undefined, MONDAY)).toBeNull();
  });
});

describe("rankForWhen", () => {
  const places = [
    makePlace({ id: "closed", hours: "7am–11am" }),
    makePlace({ id: "unknown", hours: "See venue" }),
    makePlace({ id: "open", hours: "8am–9pm" }),
  ];

  it("ranks open first, unknown second, closed last — stably", () => {
    const ranked = rankForWhen(places, "now", MONDAY_NOON, TZ, MONDAY);
    expect(ranked.map((p) => p.id)).toEqual(["open", "unknown", "closed"]);
    expect(ranked.map((p) => p.open)).toEqual([true, null, false]);
  });

  it("ranks evening-covering places first for tonight", () => {
    const dinner = makePlace({ id: "dinner", hours: "5pm–11pm" });
    const ranked = rankForWhen([places[0]!, dinner], "tonight", MONDAY_NOON, TZ, MONDAY);
    expect(ranked.map((p) => p.id)).toEqual(["dinner", "closed"]);
  });
});

describe("pickSuggestion", () => {
  it("returns null for an empty pool", () => {
    expect(
      pickSuggestion([], { mood: "any", when: "now", now: MONDAY_NOON, timeZone: TZ, weekday: MONDAY }),
    ).toBeNull();
  });

  it("picks the best match with understandable reasons", () => {
    const places = [
      makePlace({ id: "closed", category: "coffee", hours: "7am–11am" }),
      makePlace({ id: "open", category: "coffee", hours: "8am–9pm", walk: "5 min walk" }),
    ];
    const pick = pickSuggestion(places, {
      mood: "coffee",
      when: "now",
      now: MONDAY_NOON,
      timeZone: TZ,
      weekday: MONDAY,
    });
    expect(pick?.place.id).toBe("open");
    expect(pick?.open).toBe(true);
    expect(pick?.reasons).toContain("5 min walk");
  });

  it("skips excluded ids so the guest gets one alternative", () => {
    const places = [makePlace({ id: "first", hours: "8am–9pm" }), makePlace({ id: "second", hours: "8am–9pm" })];
    const opts = { mood: "any" as const, when: "now" as const, now: MONDAY_NOON, timeZone: TZ, weekday: MONDAY };
    expect(pickSuggestion(places, opts)?.place.id).toBe("first");
    expect(pickSuggestion(places, { ...opts, excludeIds: ["first"] })?.place.id).toBe("second");
    expect(pickSuggestion(places, { ...opts, excludeIds: ["first", "second"] })).toBeNull();
  });
});

describe("now composer options", () => {
  it("covers every mood and when the UI offers", () => {
    expect(NOW_MOODS.map((m) => m.id)).toEqual(["coffee", "eat", "see", "shop", "any"]);
    expect(NOW_WHENS.map((w) => w.id)).toEqual(["now", "tonight"]);
  });
});
