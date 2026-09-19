import { describe, expect, it } from "vitest";
import { placesForLocation, placesInCity } from "./catalog";
import { locatedNear } from "./location-scope";

const ROCKS = { lat: -33.85945, lng: 151.20835 };
const ASHFIELD = { lat: -33.8889, lng: 151.1256 };

describe("location scope", () => {
  it("keeps GPS listings within walking distance only", () => {
    const rows = [
      { id: "glenmore", geo: ROCKS, precinctId: "the-rocks" },
      { id: "local", geo: ASHFIELD, precinctId: "local" },
    ];
    expect(placesForLocation(rows, ASHFIELD, "Ashfield", true).map((r) => r.id)).toEqual(["local"]);
    expect(
      placesForLocation(rows, ROCKS, "The Rocks, Sydney", false)
        .map((r) => r.id)
        .sort(),
    ).toEqual(["glenmore", "local"]);
  });

  it("uses geo when present, else city label", () => {
    expect(locatedNear({ geo: ROCKS, city: "Sydney" }, ASHFIELD, "Ashfield", true)).toBe(false);
    expect(locatedNear({ city: "Ashfield" }, ASHFIELD, "Ashfield", true)).toBe(true);
    expect(locatedNear({ city: "Sydney" }, ASHFIELD, "Ashfield", true)).toBe(false);
    expect(locatedNear({ city: "Sydney" }, ROCKS, "The Rocks, Sydney", false)).toBe(true);
  });

  it("does not dump The Rocks when the city is empty or Kochi", () => {
    const rows = [
      { id: "glenmore", geo: ROCKS, precinctId: "the-rocks" },
      { id: "fort", geo: { lat: 9.96, lng: 76.24 }, precinctId: "fort-kochi" },
    ];
    expect(placesInCity(rows, "")).toEqual([]);
    expect(placesInCity(rows, "Kochi").map((r) => r.id)).toEqual(["fort"]);
  });
});
