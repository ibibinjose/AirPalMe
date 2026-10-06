import { describe, expect, it } from "vitest";
import { cityCenter, currencyForCity, knownCityCenter, PRECINCT_META } from "./cities";
import { THE_ROCKS_PRECINCT } from "@shared/the-rocks-data";

describe("cityCenter", () => {
  it("resolves known cities loosely and falls back", () => {
    expect(cityCenter("The Rocks, Sydney")).toEqual({ lat: -33.8688, lng: 151.2093 });
    expect(cityCenter("MUMBAI")).toEqual({ lat: 19.076, lng: 72.8777 });
    expect(cityCenter("Bengaluru")).toEqual({ lat: 12.9716, lng: 77.5946 });
    expect(cityCenter("Nowhere Ville")).toEqual({ lat: -33.8688, lng: 151.2093 });
    expect(cityCenter()).toEqual({ lat: -33.8688, lng: 151.2093 });
  });
});

describe("knownCityCenter", () => {
  it("pins Kerala cities exactly and never falls back", () => {
    expect(knownCityCenter("Kovalam")).toEqual({ lat: 8.4, lng: 76.98 });
    expect(knownCityCenter("Trivandrum")).toEqual({ lat: 8.52, lng: 76.94 });
    expect(knownCityCenter("Kochi")).toEqual({ lat: 9.93, lng: 76.27 });
    expect(knownCityCenter("Munnar")).toEqual({ lat: 10.09, lng: 77.06 });
    expect(knownCityCenter("Alleppey")).toEqual({ lat: 9.5, lng: 76.34 });
    expect(knownCityCenter("Varkala")).toEqual({ lat: 8.74, lng: 76.7 });
    expect(knownCityCenter("Wayanad")).toEqual({ lat: 11.61, lng: 76.08 });
    expect(knownCityCenter("Kumarakom")).toEqual({ lat: 9.62, lng: 76.43 });
    expect(knownCityCenter("Nowhere Ville")).toBeNull();
    expect(knownCityCenter()).toBeNull();
    expect(knownCityCenter("Bengaluru")).toEqual({ lat: 12.9716, lng: 77.5946 });
    expect(currencyForCity("Kochi")).toBe("INR");
    expect(currencyForCity("Sydney")).toBe("AUD");
  });
});

describe("PRECINCT_META", () => {
  it("matches the full precinct dataset (drift guard for the initial bundle)", () => {
    expect(PRECINCT_META.city).toBe(THE_ROCKS_PRECINCT.city);
    expect(PRECINCT_META.geo).toEqual(THE_ROCKS_PRECINCT.geo);
  });
});
