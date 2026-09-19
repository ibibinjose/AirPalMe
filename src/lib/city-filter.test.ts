import { describe, expect, it } from "vitest";
import { businessCategoryForPlace } from "@shared/business";
import { KERALA_PLACES } from "@shared/kerala-data";
import { THE_ROCKS_PLACES } from "@shared/the-rocks-data";
import { placesAround, placesInCity, toursForPrecinct } from "./catalog";

const ROCKS = { lat: -33.85945, lng: 151.20835 };
const MELB = { lat: -37.8136, lng: 144.9631 };
const ASHFIELD = { lat: -33.8889, lng: 151.1256 };

const rows = [
  { id: "rox-cafe", precinctId: "the-rocks", geo: ROCKS },
  { id: "local-shop", precinctId: "local", geo: ROCKS },
  { id: "melb-lane", precinctId: "melbourne-cbd", geo: MELB },
  { id: "no-geo", precinctId: "melbourne-cbd" },
];

const tours = [
  { id: "t1", city: "Sydney" },
  { id: "t2", city: "Melbourne" },
] as Parameters<typeof toursForPrecinct>[1];

describe("city-strict catalog", () => {
  it("does not treat Ashfield GPS as The Rocks catalogue", () => {
    expect(placesAround(rows, ASHFIELD).map((r) => r.id)).toEqual([]);
    expect(
      placesAround(rows, ROCKS)
        .map((r) => r.id)
        .sort(),
    ).toEqual(["local-shop", "rox-cafe"]);
  });

  it("shows Sydney stock for Sydney", () => {
    expect(
      placesInCity(rows, "Sydney")
        .map((r) => r.id)
        .sort(),
    ).toEqual(["local-shop", "rox-cafe"]);
    // No city, no default stock: honest empty instead of another city's dump.
    expect(placesInCity(rows, undefined)).toEqual([]);
  });

  it("shows only places near the chosen city, never The Rocks", () => {
    expect(placesInCity(rows, "Melbourne").map((r) => r.id)).toEqual(["melb-lane"]);
    expect(placesInCity(rows, "Perth")).toEqual([]);
  });

  it("resolves every Kerala seed under its own city with a real photo", () => {
    expect(
      placesInCity(KERALA_PLACES, "Kovalam")
        .map((p) => p.id)
        .sort(),
    ).toEqual([
      "bait-leela-kovalam",
      "kovalam-beach-market",
      "kovalam-eves",
      "kovalam-lighthouse",
      "leela-kovalam",
      "padmanabha-temple",
      "technopark-trivandrum",
      "uday-samudra-kovalam",
      "varkala-cliff",
    ]);
    const kovalamCats = new Set(placesInCity(KERALA_PLACES, "Kovalam").map((p) => p.category));
    expect([...kovalamCats].sort()).toEqual(["eat", "shops", "stay", "things"]);
    expect(
      placesInCity(KERALA_PLACES, "Kochi")
        .map((p) => p.id)
        .sort(),
    ).toEqual([
      "alleppey-houseboat",
      "chinese-nets-kochi",
      "infopark-kochi",
      "kumarakom-bird-sanctuary",
      "mattancherry-palace",
    ]);
    expect(
      placesInCity(KERALA_PLACES, "Trivandrum")
        .map((p) => p.id)
        .sort(),
    ).toEqual([
      "bait-leela-kovalam",
      "kovalam-beach-market",
      "kovalam-eves",
      "kovalam-lighthouse",
      "leela-kovalam",
      "padmanabha-temple",
      "technopark-trivandrum",
      "uday-samudra-kovalam",
      "varkala-cliff",
    ]);
    expect(
      placesInCity(KERALA_PLACES, "Munnar")
        .map((p) => p.id)
        .sort(),
    ).toEqual(["eravikulam-np", "munnar-tea-gardens"]);
    expect(placesInCity(KERALA_PLACES, "Wayanad").map((p) => p.id)).toEqual(["edakkal-caves"]);
    expect(placesInCity(KERALA_PLACES, "Sydney")).toEqual([]);
    // Every photo must be a verified Commons file — no guessed URLs. Two
    // venues have no verified photo yet and render clean ink cards instead.
    const imageless = new Set(["uday-samudra-kovalam", "kovalam-beach-market"]);
    for (const p of KERALA_PLACES) {
      if (imageless.has(p.id)) {
        expect(p.heroImage, p.id).toBeUndefined();
      } else {
        expect(p.heroImage, p.id).toMatch(/^https:\/\/upload\.wikimedia\.org\//);
      }
    }
  });

  it("keeps Rocks stock out of Kovalam's Host picks pool", () => {
    const ids = placesInCity([...THE_ROCKS_PLACES, ...KERALA_PLACES], "Kovalam").map((p) => p.id);
    expect(ids).toContain("kovalam-lighthouse");
    expect(ids.some((id) => THE_ROCKS_PLACES.some((r) => r.id === id))).toBe(false);
  });

  it("shelves seed places under matching listing categories", () => {
    expect(businessCategoryForPlace("stay")).toBe("stay");
    expect(businessCategoryForPlace("eat")).toBe("eat");
    expect(businessCategoryForPlace("shops")).toBe("shops");
    expect(businessCategoryForPlace("things")).toBe("things");
    expect(businessCategoryForPlace("nope")).toBe("things");
  });

  it("returns only matching walks, or [] for cities with none", () => {
    expect(toursForPrecinct("Melbourne", tours).map((t) => t.id)).toEqual(["t2"]);
    expect(toursForPrecinct("Perth", tours)).toEqual([]);
    expect(toursForPrecinct("", tours)).toHaveLength(2);
  });
});
