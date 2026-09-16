import { describe, expect, it } from "vitest";
import { mapsPlaceUrl, mapsSearchUrl, normalizeMapsKey } from "./maps";

describe("normalizeMapsKey", () => {
  const valid = `AIzaSy${"A".repeat(33)}`;

  it("trims whitespace", () => {
    expect(normalizeMapsKey(`  ${valid}  `)).toBe(valid);
  });

  it("strips a doubled leading A on a 40-character AIza key", () => {
    expect(valid).toHaveLength(39);
    expect(normalizeMapsKey(`A${valid}`)).toBe(valid);
  });

  it("leaves already-valid keys unchanged", () => {
    expect(normalizeMapsKey(valid)).toBe(valid);
  });

  it("returns empty for missing values", () => {
    expect(normalizeMapsKey(undefined)).toBe("");
    expect(normalizeMapsKey("")).toBe("");
  });
});

describe("maps URLs", () => {
  it("builds a search URL with coordinates", () => {
    expect(mapsSearchUrl("cafe", { lat: -33.86, lng: 151.21 })).toContain("cafe%40-33.86%2C151.21");
  });

  it("builds a place URL from a name and geo", () => {
    expect(mapsPlaceUrl({ lat: -33.86, lng: 151.21 }, "Harbour")).toContain("Harbour");
  });
});
