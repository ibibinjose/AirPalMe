import { describe, expect, it } from "vitest";
import { cleanStateName, formatCitySuburbRegion, POPULAR_CITY_PRESETS } from "./city-region";

describe("city-region helper", () => {
  describe("cleanStateName", () => {
    it("converts Australian states to abbreviations", () => {
      expect(cleanStateName("New South Wales")).toBe("NSW");
      expect(cleanStateName("Victoria")).toBe("VIC");
      expect(cleanStateName("Queensland")).toBe("QLD");
      expect(cleanStateName("Western Australia")).toBe("WA");
      expect(cleanStateName("South Australia")).toBe("SA");
      expect(cleanStateName("Tasmania")).toBe("TAS");
      expect(cleanStateName("Australian Capital Territory")).toBe("ACT");
      expect(cleanStateName("Northern Territory")).toBe("NT");
      expect(cleanStateName("California")).toBe("California");
    });
  });

  describe("formatCitySuburbRegion", () => {
    it("extracts state from subtitle with Australian state abbreviation", () => {
      expect(formatCitySuburbRegion("Bondi Beach", "NSW, Australia")).toBe("Bondi Beach, NSW");
      expect(formatCitySuburbRegion("Surry Hills", "Sydney NSW, Australia")).toBe("Surry Hills, NSW");
      expect(formatCitySuburbRegion("Manly", "NSW 2095, Australia")).toBe("Manly, NSW");
    });

    it("formats Australian full state name into abbreviation", () => {
      expect(formatCitySuburbRegion("Melbourne", "Victoria, Australia")).toBe("Melbourne, VIC");
      expect(formatCitySuburbRegion("Brisbane", "Queensland, Australia")).toBe("Brisbane, QLD");
    });

    it("formats US states and international cities cleanly", () => {
      expect(formatCitySuburbRegion("Brooklyn", "NY, USA")).toBe("Brooklyn, NY");
      expect(formatCitySuburbRegion("London", "UK")).toBe("London, UK");
    });

    it("uses addressComponents when available", () => {
      const components = [
        { longText: "Bondi Beach", types: ["sublocality", "sublocality_level_1"] },
        { longText: "New South Wales", types: ["administrative_area_level_1"] },
        { longText: "Australia", types: ["country"] },
      ];
      expect(formatCitySuburbRegion("Bondi Beach", "NSW, Australia", components)).toBe(
        "Bondi Beach, NSW",
      );
    });
  });

  describe("POPULAR_CITY_PRESETS", () => {
    it("contains major Australian and global cities", () => {
      expect(POPULAR_CITY_PRESETS.length).toBeGreaterThan(10);
      expect(POPULAR_CITY_PRESETS.some((p) => p.label === "Sydney, NSW")).toBe(true);
      expect(POPULAR_CITY_PRESETS.some((p) => p.label === "Melbourne, VIC")).toBe(true);
      expect(POPULAR_CITY_PRESETS.some((p) => p.label === "Bondi Beach, NSW")).toBe(true);
    });
  });
});
