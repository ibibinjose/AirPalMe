import { describe, expect, it } from "vitest";
import {
  answerNearbyAsk,
  conciergeOrderHref,
  defaultAllowCompetitors,
  defaultSuppressCategories,
  filterCompetitorPlaces,
  formatWalk,
  haversineMeters,
  isPlaceCategory,
  parseMarkerKind,
  resolveCompetitorPolicy,
  resolvePrecinctId,
  guessPrecinctIdFromCityText,
  sortNearbyPlaces,
  summarizeScanEvents,
  venueTradeOf,
} from "./nearby";

describe("nearby helpers", () => {
  it("only defaults The Rocks for the Sydney pilot city", () => {
    expect(resolvePrecinctId("kovalam-beach", "sydney")).toBe("kovalam-beach");
    expect(resolvePrecinctId(undefined, "sydney")).toBe("the-rocks");
    expect(resolvePrecinctId(undefined, "melbourne")).toBeUndefined();
    expect(resolvePrecinctId(undefined, "kovalam")).toBeUndefined();
    expect(guessPrecinctIdFromCityText("Kovalam Beach")).toBe("kovalam-beach");
    expect(guessPrecinctIdFromCityText("Sydney Harbour")).toBe("the-rocks");
  });

  it("parses known marker kinds and falls back to street", () => {
    expect(parseMarkerKind("lobby")).toBe("lobby");
    expect(parseMarkerKind("vehicle")).toBe("street");
    expect(parseMarkerKind(undefined)).toBe("street");
  });

  it("accepts place categories", () => {
    expect(isPlaceCategory("eat")).toBe(true);
    expect(isPlaceCategory("Food & Drink")).toBe(false);
  });

  it("sorts host recommended places ahead of distance", () => {
    const origin = { lat: -33.85945, lng: 151.20835 };
    const places = [
      { id: "far", geo: { lat: -33.862, lng: 151.212 } },
      { id: "near", geo: { lat: -33.8595, lng: 151.2084 } },
      { id: "pick", geo: { lat: -33.861, lng: 151.21 } },
    ];
    const ranked = sortNearbyPlaces(places, origin, ["pick"]);
    expect(ranked.map((row) => row.place.id)).toEqual(["pick", "near", "far"]);
    expect(ranked[0]?.hostPick).toBe(true);
  });

  it("measures The Rocks hotel to MCA as a short walk", () => {
    const hotel = { lat: -33.85945, lng: 151.20835 };
    const mca = { lat: -33.8598, lng: 151.209 };
    const meters = haversineMeters(hotel, mca);
    expect(meters).toBeGreaterThan(40);
    expect(meters).toBeLessThan(250);
    const walk = formatWalk(meters);
    expect(walk.walkTime).toMatch(/min walk/);
  });

  it("answers Ask AirPal from the current marker, not a destination model", () => {
    const places = [
      { name: "The Rocks Cafe", category: "coffee" as const, shortWhy: "Harbour espresso." },
      { name: "Sailors Thai", category: "eat" as const, shortWhy: "Walk-up dinner." },
    ];
    const room = answerNearbyAsk("wifi password", places, {
      precinctName: "The Rocks",
      markerKind: "room",
      markerLabel: "Room 101",
      propertyName: "Harbour Rocks Hotel",
      isRoomStay: true,
    });
    expect(room).toMatch(/Room 101/);
    expect(room).toMatch(/room companion/);
    expect(room).not.toMatch(/Gemini|flight|airline/i);

    const coffee = answerNearbyAsk("coffee", places, {
      precinctName: "The Rocks",
      markerKind: "lobby",
      markerLabel: "Lobby",
      propertyName: "Harbour Rocks Hotel",
    });
    expect(coffee).toMatch(/lobby/i);
    expect(coffee).toMatch(/The Rocks Cafe/);
  });

  it("sends room markers to stay dining and others to nearby eat", () => {
    expect(conciergeOrderHref({ kind: "room", propertyId: "p_abc", roomToken: "Tok/1" })).toBe(
      "/g/p_abc?r=Tok%2F1&type=dining",
    );
    expect(conciergeOrderHref({ kind: "lobby", propertyId: "p_abc" })).toBeUndefined();
  });

  it("ranks top markers and counts scan kinds", () => {
    const summary = summarizeScanEvents([
      { markerId: "aa", kind: "open" },
      { markerId: "aa", kind: "ask" },
      { markerId: "bb", kind: "open" },
      { markerId: "aa", kind: "issue" },
    ]);
    expect(summary.total).toBe(4);
    expect(summary.byKind.open).toBe(2);
    expect(summary.topMarkers[0]).toMatchObject({ markerId: "aa", count: 3 });
  });

  it("does not promote restaurant rivals on a venue marker", () => {
    expect(defaultAllowCompetitors("venue")).toBe(false);
    expect(defaultAllowCompetitors("lobby")).toBe(false);
    expect(defaultAllowCompetitors("street")).toBe(true);
    expect(venueTradeOf({ kind: "venue", venueCategory: "eat" })).toBe("eat");
    expect(venueTradeOf({ kind: "lobby", propertyKind: "hotel" })).toBe("stay");
    expect(defaultSuppressCategories("eat")).toEqual(["eat", "coffee"]);
    expect(defaultSuppressCategories("stay")).toEqual(["stay"]);

    const places = [
      { id: "rival-thai", category: "eat" as const, geo: { lat: 0, lng: 0 } },
      { id: "own-bistro", category: "eat" as const, geo: { lat: 0, lng: 0 }, propertyId: "p_bistro" },
      { id: "host-dessert", category: "coffee" as const, geo: { lat: 0, lng: 0 } },
      { id: "mca", category: "things" as const, geo: { lat: 0, lng: 0 } },
      { id: "argyle-shops", category: "shops" as const, geo: { lat: 0, lng: 0 } },
    ];
    const policy = resolveCompetitorPolicy({ kind: "venue", venueCategory: "eat" });
    const visible = filterCompetitorPlaces(places, policy.suppressCategories, {
      ownPropertyId: "p_bistro",
      recommendedIds: ["host-dessert"],
    });
    expect(visible.map((p) => p.id)).toEqual(["own-bistro", "host-dessert", "mca", "argyle-shops"]);

    const hotel = resolveCompetitorPolicy({ kind: "room", propertyKind: "hotel" });
    expect(hotel.suppressCategories).toEqual(["stay"]);
    expect(
      filterCompetitorPlaces(
        [
          { id: "other-hotel", category: "stay" as const, geo: { lat: 0, lng: 0 } },
          { id: "dinner", category: "eat" as const, geo: { lat: 0, lng: 0 } },
        ],
        hotel.suppressCategories,
      ).map((p) => p.id),
    ).toEqual(["dinner"]);

    const street = resolveCompetitorPolicy({ kind: "street" });
    expect(street.allowCompetitors).toBe(true);
    expect(street.suppressCategories).toEqual([]);
  });

  it("lets a host opt in to competitors and refuses rival eat answers until then", () => {
    const opted = resolveCompetitorPolicy({ kind: "venue", venueCategory: "eat", propertyAllowCompetitors: true });
    expect(opted.allowCompetitors).toBe(true);
    expect(opted.suppressCategories).toEqual([]);

    const reply = answerNearbyAsk("where to eat", [{ name: "Rival Thai", category: "eat", shortWhy: "Nearby." }], {
      precinctName: "The Rocks",
      markerKind: "venue",
      markerLabel: "Own Bistro",
      propertyName: "Own Bistro",
      suppressCategories: ["eat", "coffee"],
    });
    expect(reply).toMatch(/won't send you/i);
    expect(reply).not.toMatch(/Rival Thai/);
  });
});
