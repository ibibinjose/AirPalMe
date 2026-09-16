import { describe, expect, it } from "vitest";
import { cityCenter } from "./cities";

describe("cityCenter", () => {
  it("resolves known cities loosely and falls back", () => {
    expect(cityCenter("The Rocks, Sydney")).toEqual({ lat: -33.8688, lng: 151.2093 });
    expect(cityCenter("MUMBAI")).toEqual({ lat: 19.076, lng: 72.8777 });
    expect(cityCenter("Nowhere Ville")).toEqual({ lat: -33.8688, lng: 151.2093 });
    expect(cityCenter()).toEqual({ lat: -33.8688, lng: 151.2093 });
  });
});
