import { describe, expect, it } from "vitest";
import {
  bioLinksFromGooglePlace,
  categoryFromGoogleTypes,
  cityFromAddressComponents,
  emailMatchesWebsite,
  hoursFromWeekdayDescriptions,
  isGoogleBusinessPrediction,
  mergeBioLinks,
  shortWhyFromGoogle,
  socialsAndMenuFromWebsite,
  type GooglePlaceImport,
} from "./google-place";

function sample(over: Partial<GooglePlaceImport> = {}): GooglePlaceImport {
  return {
    placeId: "ChIJ-glenmore",
    name: "The Glenmore Hotel",
    address: "96 Cumberland St, The Rocks NSW 2000",
    city: "Sydney",
    geo: { lat: -33.859, lng: 151.208 },
    phone: "+61 2 9247 1234",
    website: "https://glenmorehotel.com.au",
    googleMapsUri: "https://maps.google.com/?cid=1",
    hours: "Monday: 11:00 AM - 12:00 AM",
    shortWhy: "Rooftop over the harbour.",
    category: "bar",
    photoNames: ["places/ChIJ/photos/abc"],
    menuUrl: "",
    socials: [],
    ...over,
  };
}

describe("google place import", () => {
  it("maps Google types to AirPal categories", () => {
    expect(categoryFromGoogleTypes(["cafe"], "cafe")).toBe("coffee");
    expect(categoryFromGoogleTypes(["bar", "restaurant"], "bar")).toBe("bar");
    expect(categoryFromGoogleTypes(["lodging"], "hotel")).toBe("stay");
    expect(categoryFromGoogleTypes(["clothing_store"])).toBe("fashion");
    expect(categoryFromGoogleTypes(["park"])).toBe("things");
    expect(categoryFromGoogleTypes(["unknown_type"])).toBe("eat");
  });

  it("keeps businesses and drops street / suburb predictions", () => {
    expect(isGoogleBusinessPrediction(["bar", "establishment"])).toBe(true);
    expect(isGoogleBusinessPrediction(["geocode", "street_address"])).toBe(false);
    expect(isGoogleBusinessPrediction(["locality", "political"])).toBe(false);
    expect(isGoogleBusinessPrediction(undefined)).toBe(true);
  });

  it("joins opening hours", () => {
    expect(hoursFromWeekdayDescriptions(["Monday: 9:00 AM – 5:00 PM", "Tuesday: Closed"])).toBe(
      "Monday: 9:00 AM - 5:00 PM; Tuesday: Closed",
    );
    expect(hoursFromWeekdayDescriptions(undefined)).toBe("");
  });

  it("pulls city from address components", () => {
    expect(
      cityFromAddressComponents(
        [
          { longText: "The Rocks", types: ["neighborhood"] },
          { longText: "Sydney", types: ["locality"] },
        ],
        "96 Cumberland St, The Rocks NSW",
      ),
    ).toBe("Sydney");
  });

  it("treats a website path with menu as a menu URL, and instagram hosts as socials", () => {
    expect(socialsAndMenuFromWebsite("https://glenmorehotel.com.au/menus")).toEqual({
      socials: [],
      menuUrl: "https://glenmorehotel.com.au/menus",
    });
    expect(socialsAndMenuFromWebsite("https://www.instagram.com/glenmorehotel")).toEqual({
      socials: [{ type: "instagram", href: "https://www.instagram.com/glenmorehotel", label: "Instagram" }],
      menuUrl: "",
    });
  });

  it("matches work email to the listing website", () => {
    expect(emailMatchesWebsite("sam@glenmorehotel.com.au", "https://www.glenmorehotel.com.au")).toBe(true);
    expect(emailMatchesWebsite("sam@gmail.com", "https://glenmorehotel.com.au")).toBe(false);
  });

  it("builds bio links for website, call, maps, and menu", () => {
    const links = bioLinksFromGooglePlace(
      sample({ menuUrl: "https://glenmorehotel.com.au/menu", phone: "+61 2 9247 1234" }),
    );
    expect(links.map((l) => l.type)).toEqual(["website", "call", "maps", "menu"]);
    expect(links.find((l) => l.type === "call")?.href).toBe("tel:+61292471234");
  });

  it("lets imported links replace the same type without dropping extras", () => {
    const merged = mergeBioLinks(
      [
        { id: "website", type: "website", label: "Website", href: "https://old.example" },
        { id: "instagram", type: "instagram", label: "Instagram", href: "https://instagram.com/old" },
      ],
      [{ id: "website", type: "website", label: "Website", href: "https://new.example" }],
    );
    expect(merged.find((l) => l.type === "website")?.href).toBe("https://new.example");
    expect(merged.find((l) => l.type === "instagram")?.href).toBe("https://instagram.com/old");
  });

  it("writes a short why from Google copy", () => {
    expect(shortWhyFromGoogle("Harbour rooftop with schooners.", "bar").length).toBeGreaterThan(10);
    expect(shortWhyFromGoogle("", "cafe")).toMatch(/cafe/i);
  });
});
