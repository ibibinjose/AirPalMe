import { describe, expect, it } from "vitest";
import {
  EVENT_LOCATION_TYPES,
  cleanCapacity,
  cleanStallLocation,
  cleanTicketCents,
  isEventLocationType,
  isExpoEventId,
  parseStallCsv,
  stallCsvTemplate,
  stallFieldLabels,
  stallUnitDisplay,
} from "./event";

describe("event csv", () => {
  it("parses a stall sheet", () => {
    const rows = parseStallCsv(`name,category,booth,shortWhy,offer
Salted Caramel Co,eat,A12,Handmade caramels,2 for $10
Harbour Linen,shops,B04,Washed linen,
`);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ name: "Salted Caramel Co", category: "eat", booth: "A12", offer: "2 for $10" });
    expect(rows[1]?.offer).toBeFalsy();
  });

  it("accepts expo/market column names for business, stall number and handle", () => {
    const rows = parseStallCsv(`business name,stand number,@handle,category,about
Harbour Linen,214,harbourlinen,shops,Washed linen
`);
    expect(rows[0]).toMatchObject({
      name: "Harbour Linen",
      booth: "214",
      handle: "harbourlinen",
      category: "shops",
      shortWhy: "Washed linen",
    });
  });

  it("detects expo ids", () => {
    expect(isExpoEventId("evt-rocks-market")).toBe(true);
    expect(isExpoEventId("rocks-markets-weekend")).toBe(false);
  });
});

describe("stall field labels", () => {
  it("uses stand vs stall vs booth by flavour", () => {
    expect(stallFieldLabels("expo").unit).toBe("Stand number");
    expect(stallFieldLabels("market").unit).toBe("Stall number");
    expect(stallFieldLabels("event_space").unit).toBe("Booth number");
    expect(stallUnitDisplay("expo", "214")).toBe("Stand 214");
    expect(stallUnitDisplay("market", "A12")).toBe("Stall A12");
    expect(stallCsvTemplate("market")).toContain("business name");
    expect(stallCsvTemplate("expo")).toContain("stand number");
    expect(stallCsvTemplate("market")).toContain("location");
  });

  it("parses floor locations from csv", () => {
    const rows = parseStallCsv(`name,booth,location,category
Salted Caramel Co,A12,Aisle C Bay 12,eat
Harbour Linen,B04,,shops
`);
    expect(rows[0]).toMatchObject({ booth: "A12", location: "Aisle C Bay 12" });
    expect(rows[1]?.location).toBeUndefined();
  });

  it("cleans floor locations", () => {
    expect(cleanStallLocation("  Aisle C · Bay 12  ")).toBe("Aisle C · Bay 12");
    expect(cleanStallLocation("   ")).toBeUndefined();
    expect(cleanStallLocation(undefined)).toBeUndefined();
    expect(cleanStallLocation("x".repeat(200))?.length).toBe(120);
  });

  it("cleans ticket cents and capacity", () => {
    expect(cleanTicketCents(2500)).toBe(2500);
    expect(cleanTicketCents("25.99")).toBe(25);
    expect(cleanTicketCents(-5)).toBeUndefined();
    expect(cleanTicketCents("free")).toBeUndefined();
    expect(cleanCapacity(40)).toBe(40);
    expect(cleanCapacity(0)).toBeUndefined();
    expect(cleanCapacity(2001)).toBeUndefined();
    expect(cleanCapacity(2.5)).toBeUndefined();
  });

  it("validates event location types", () => {
    expect(isEventLocationType("in_person")).toBe(true);
    expect(isEventLocationType("virtual")).toBe(true);
    expect(isEventLocationType("secret")).toBe(true);
    expect(isEventLocationType("metaverse")).toBe(false);
    expect(isEventLocationType(undefined)).toBe(false);
    expect(isEventLocationType(null)).toBe(false);
    expect(EVENT_LOCATION_TYPES).toEqual(["in_person", "virtual", "secret"]);
  });
});
