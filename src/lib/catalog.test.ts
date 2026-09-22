import { beforeEach, describe, expect, it } from "vitest";
import { activePlaces, getPlace, getTour, placeByHandle } from "./catalog";
import { upsertCachedListing, listingDefaults } from "./listings";
import { cachePlaces, parsePlaceDoc } from "./places-store";
import { getCachedProperty } from "./properties";
import { seedDatabase } from "./seed-database";
import type { NearbyPlace } from "@shared/nearby";

// In-memory localStorage mock for node test environment
const memoryStorage: Record<string, string> = {};
if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage.getItem) {
  globalThis.localStorage = {
    getItem: (key: string) => memoryStorage[key] ?? null,
    setItem: (key: string, value: string) => {
      memoryStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete memoryStorage[key];
    },
    clear: () => {
      for (const k in memoryStorage) delete memoryStorage[k];
    },
    length: 0,
    key: () => null,
  } as unknown as Storage;
}

describe("catalog dynamic places", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("is empty when no listings or places are cached — no bundled seed places", () => {
    expect(activePlaces()).toEqual([]);
    expect(getPlace("glenmore")).toBeUndefined();
    expect(placeByHandle("cutbar")).toBeUndefined();
  });

  it("returns live precinct places from the places cache", () => {
    const glenmore: NearbyPlace = {
      id: "glenmore",
      name: "The Glenmore Hotel",
      category: "eat",
      shortWhy: "Rooftop with Opera House views.",
      geo: { lat: -33.8587, lng: 151.2076 },
      source: "seed",
      status: "active",
      precinctId: "the-rocks",
      address: "96 Cumberland St",
      handle: "glenmore",
    };
    cachePlaces([glenmore]);
    expect(getPlace("glenmore")?.name).toBe("The Glenmore Hotel");
    expect(activePlaces().some((p) => p.id === "glenmore")).toBe(true);
  });

  it("lets a host listing overlay a precinct place with the same id", () => {
    cachePlaces([
      {
        id: "glenmore",
        name: "The Glenmore Hotel",
        category: "eat",
        shortWhy: "Rooftop.",
        geo: { lat: -33.8587, lng: 151.2076 },
        source: "seed",
        status: "active",
        precinctId: "the-rocks",
      },
    ]);
    upsertCachedListing(
      listingDefaults({
        id: "list-glenmore",
        placeId: "glenmore",
        name: "Glenmore by Alex",
        category: "eat",
        placeCategory: "eat",
        address: "96 Cumberland St",
        shortWhy: "Host-claimed rooftop.",
        handle: "glenmore",
      }),
    );
    expect(getPlace("glenmore")?.name).toBe("Glenmore by Alex");
  });

  it("dynamically returns real added business listings", () => {
    const listing = listingDefaults({
      id: "list-my-cafe",
      name: "Sunrise Cafe",
      category: "coffee",
      placeCategory: "coffee",
      address: "123 Ocean Way",
      shortWhy: "Fresh morning roasts and pastries",
      handle: "sunrisecafe",
    });
    upsertCachedListing(listing);

    const places = activePlaces();
    expect(places.length).toBeGreaterThanOrEqual(1);
    expect(places.some((p) => p.name === "Sunrise Cafe")).toBe(true);

    const found = getPlace("list-my-cafe");
    expect(found).toBeDefined();
    expect(found?.name).toBe("Sunrise Cafe");

    const byH = placeByHandle("sunrisecafe");
    expect(byH).toBeDefined();
    expect(byH?.id).toBe("pl-my-cafe");
  });

  it("seedDatabase populates the database and listings cache when explicitly called", async () => {
    const res = await seedDatabase();
    if (!res.ok) console.error("seedDatabase error:", res.error);
    expect(res.ok).toBe(true);
    expect(res.placesCount).toBeGreaterThan(0);
    expect(res.propertiesCount).toBeGreaterThan(0);
    expect(getCachedProperty("harbour-hotel")?.name).toMatch(/(AirPal|Harbour)/);

    const places = activePlaces();
    expect(places.length).toBeGreaterThan(0);
    expect(places.some((p) => p.handle === "cutbar" || p.name.includes("Cut Bar"))).toBe(true);
  });
});

describe("parsePlaceDoc", () => {
  it("accepts a live Firestore-shaped place", () => {
    const place = parsePlaceDoc("glenmore", {
      name: "The Glenmore Hotel",
      category: "eat",
      shortWhy: "Rooftop.",
      geo: { lat: -33.8587, lng: 151.2076 },
      source: "seed",
      status: "active",
      precinctId: "the-rocks",
      address: "96 Cumberland St",
      priceLevel: "$$",
      deal: { badge: "15% Guest Perk", detail: "Show your room key." },
    });
    expect(place?.name).toBe("The Glenmore Hotel");
    expect(place?.deal?.badge).toBe("15% Guest Perk");
    expect(place?.priceLevel).toBe("$$");
  });

  it("skips unnamed or unlocated docs", () => {
    expect(parsePlaceDoc("x", { name: "No geo", status: "active" })).toBeNull();
    expect(parsePlaceDoc("y", { geo: { lat: 1, lng: 2 }, status: "active" })).toBeNull();
  });
});

describe("getTour", () => {
  it("returns undefined for an unknown id instead of the first tour", () => {
    expect(getTour("no-such-tour")).toBeUndefined();
  });
});
