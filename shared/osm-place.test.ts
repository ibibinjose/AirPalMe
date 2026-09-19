import { describe, expect, it } from "vitest";
import {
  categoryFromOsm,
  formatOsmAddress,
  isOsmBusiness,
  osmHitToImport,
  osmPlaceId,
  parseOsmPlaceId,
} from "./osm-place";

describe("osm place import", () => {
  it("keeps pubs and cafes, drops streets and unnamed spots", () => {
    expect(isOsmBusiness("amenity", "pub", "The Glenmore")).toBe(true);
    expect(isOsmBusiness("shop", "clothes", "Label")).toBe(true);
    expect(isOsmBusiness("highway", "residential", "Cumberland St")).toBe(false);
    expect(isOsmBusiness("amenity", "pub", "")).toBe(false);
  });

  it("maps OSM types onto AirPal categories", () => {
    expect(categoryFromOsm("amenity", "pub")).toBe("bar");
    expect(categoryFromOsm("amenity", "cafe")).toBe("coffee");
    expect(categoryFromOsm("amenity", "restaurant")).toBe("eat");
    expect(categoryFromOsm("tourism", "hotel")).toBe("stay");
    expect(categoryFromOsm("shop", "clothes")).toBe("fashion");
  });

  it("parses osm:node:id place ids", () => {
    expect(osmPlaceId("node", 642998922)).toBe("osm:node:642998922");
    expect(parseOsmPlaceId("osm:node:642998922")).toEqual({ osmType: "node", osmId: "642998922" });
    expect(parseOsmPlaceId("ChIJ-glenmore")).toBeNull();
  });

  it("copies name, address, website, and geo from a Nominatim hit", () => {
    const place = osmHitToImport({
      osmType: "node",
      osmId: "642998922",
      name: "The Glenmore",
      displayName: "The Glenmore, Gloucester Walk, The Rocks, Sydney, New South Wales, 2000, Australia",
      category: "amenity",
      type: "pub",
      lat: -33.8587,
      lng: 151.2074,
      address: {
        road: "Gloucester Walk",
        suburb: "The Rocks",
        city: "Sydney",
        state: "New South Wales",
        postcode: "2000",
      },
      extra: { website: "https://theglenmore.com.au", phone: "+61 2 9247 1234" },
    });
    expect(place.placeId).toBe("osm:node:642998922");
    expect(place.name).toBe("The Glenmore");
    expect(place.category).toBe("bar");
    expect(place.address).toContain("Gloucester Walk");
    expect(place.website).toBe("https://theglenmore.com.au");
    expect(place.phone).toBe("+61 2 9247 1234");
    expect(place.geo).toEqual({ lat: -33.8587, lng: 151.2074 });
  });

  it("formats a short address from Nominatim parts", () => {
    expect(
      formatOsmAddress(
        {
          house_number: "18",
          road: "Lower Fort St",
          suburb: "The Rocks",
          city: "Sydney",
          state: "NSW",
          postcode: "2000",
        },
        "long display",
      ),
    ).toBe("18 Lower Fort St, The Rocks, Sydney, NSW 2000");
  });
});
