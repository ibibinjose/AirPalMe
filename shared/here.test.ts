import { describe, expect, it } from "vitest";
import { herePinLive, herePlaceKey, roundHereGeo, validateShareHere } from "./here";

describe("here share", () => {
  it("rounds GPS so a venue pin is not a street address", () => {
    expect(roundHereGeo({ lat: -33.85955123, lng: 151.20715999 })).toEqual({ lat: -33.86, lng: 151.207 });
  });

  it("keys a plan, place, or rounded geo", () => {
    expect(herePlaceKey({ planId: "abc" })).toBe("plan_abc");
    expect(herePlaceKey({ placeId: "glenmore" })).toBe("place_glenmore");
    expect(herePlaceKey({ geo: { lat: -33.85955, lng: 151.20716 } })).toBe("geo_-33.86_151.207");
  });

  it("requires a place name and a Circle or person audience", () => {
    expect(validateShareHere({ placeName: "", audience: "circle", hours: 3 })).toContain("Name the place you’re at.");
    expect(validateShareHere({ placeName: "The Glenmore", audience: "person", hours: 3 })).toContain(
      "Pick someone in your Circle.",
    );
    expect(
      validateShareHere({ placeName: "The Glenmore", audience: "circle", hours: 3, lat: -33.86, lng: 151.207 }),
    ).toEqual([]);
  });

  it("treats an expired pin as not live", () => {
    expect(herePinLive({ expiresAt: new Date(Date.now() + 60_000).toISOString() })).toBe(true);
    expect(herePinLive({ expiresAt: new Date(Date.now() - 60_000).toISOString() })).toBe(false);
  });
});
