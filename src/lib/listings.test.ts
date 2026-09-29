import { describe, expect, it } from "vitest";
import { getListedPlaceById, listingDefaults, upsertCachedListing } from "./listings";

describe("getListedPlaceById", () => {
  it("resolves direct links from the raw cache, including demo docs", () => {
    upsertCachedListing(
      listingDefaults({
        id: "demo-list-t1",
        name: "Demo Rooms",
        category: "stay",
        placeCategory: "stay",
        address: "1 Demo St",
        shortWhy: "Demo stay",
        demo: true,
      }),
    );
    upsertCachedListing(
      listingDefaults({
        id: "list-live-t1",
        name: "Live Cafe",
        category: "coffee",
        placeCategory: "coffee",
        address: "2 Live St",
        shortWhy: "Live cafe",
      }),
    );
    expect(getListedPlaceById("demo-list-t1")?.name).toBe("Demo Rooms");
    expect(getListedPlaceById("pl-live-t1")?.name).toBe("Live Cafe");
    expect(getListedPlaceById("list-live-t1")?.name).toBe("Live Cafe");
    expect(getListedPlaceById("nope-missing")).toBeUndefined();
  });
});
