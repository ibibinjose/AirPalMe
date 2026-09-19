import { describe, expect, it } from "vitest";
import {
  SUPPORTED_REGIONS,
  currencyForCountryCode,
  formatMoney,
  localeForCountryCode,
  regionForCountryCode,
  regionForCountryName,
  timeZoneForCountryCode,
} from "./regions";
import { countryForCity, currencyForCity, localeForCity, timeZoneForCity } from "./cities";

describe("global regions", () => {
  it("covers Australia, India, UAE, UK, US, Canada, and EU markets", () => {
    expect(SUPPORTED_REGIONS.map((r) => r.code).sort()).toEqual([
      "AE",
      "AU",
      "CA",
      "DE",
      "ES",
      "FR",
      "GB",
      "IE",
      "IN",
      "IT",
      "NL",
      "US",
    ]);
  });

  it("maps dial/currency/locale/timezone per market", () => {
    expect(regionForCountryCode("IN")?.dial).toBe("+91");
    expect(regionForCountryCode("AE")?.currency).toBe("AED");
    expect(regionForCountryCode("AU")?.timeZone).toBe("Australia/Sydney");
    expect(regionForCountryName("United Arab Emirates")?.code).toBe("AE");
    expect(currencyForCountryCode("AE")).toBe("AED");
    expect(localeForCountryCode("IN")).toBe("en-IN");
    expect(timeZoneForCountryCode("AE")).toBe("Asia/Dubai");
  });

  it("exposes emergency numbers for every market", () => {
    const numbers = (code: string) => regionForCountryCode(code)?.emergency.map((e) => e.number) || [];
    expect(numbers("AU")).toContain("000");
    expect(numbers("IN")).toContain("112");
    expect(numbers("AE")).toEqual(expect.arrayContaining(["999", "998", "997"]));
    expect(numbers("GB")).toContain("999");
    expect(numbers("US")).toContain("911");
    expect(numbers("CA")).toContain("911");
    for (const code of ["FR", "DE", "ES", "IT", "NL", "IE"]) {
      expect(numbers(code)).toContain("112");
    }
  });

  it("maps currency per market", () => {
    expect(currencyForCountryCode("GB")).toBe("GBP");
    expect(currencyForCountryCode("US")).toBe("USD");
    expect(currencyForCountryCode("CA")).toBe("CAD");
    for (const code of ["FR", "DE", "ES", "IT", "NL", "IE"]) {
      expect(currencyForCountryCode(code)).toBe("EUR");
    }
  });

  it("formats INR/AED/AUD/GBP/USD/CAD/EUR without throwing", () => {
    expect(formatMoney(2500, "INR", "en-IN")).toContain("2,500");
    expect(formatMoney(100, "AED", "en-AE")).toMatch(/100/);
    expect(formatMoney(65, "AUD", "en-AU")).toMatch(/65/);
    expect(formatMoney(25, "GBP")).toMatch(/25/);
    expect(formatMoney(25, "USD")).toMatch(/25/);
    expect(formatMoney(25, "CAD")).toMatch(/25/);
    expect(formatMoney(25, "EUR")).toMatch(/25/);
  });
});

describe("city market mapping", () => {
  it("resolves UAE cities to AED / Asia/Dubai / en-AE", () => {
    expect(currencyForCity("Dubai")).toBe("AED");
    expect(currencyForCity("Abu Dhabi")).toBe("AED");
    expect(timeZoneForCity("Dubai")).toBe("Asia/Dubai");
    expect(localeForCity("Sharjah")).toBe("en-AE");
    expect(countryForCity("Dubai")).toBe("United Arab Emirates");
  });

  it("resolves UK/US/Canada/EU cities to the right currency, zone, and locale", () => {
    expect(currencyForCity("London")).toBe("GBP");
    expect(currencyForCity("New York")).toBe("USD");
    expect(currencyForCity("Los Angeles")).toBe("USD");
    expect(currencyForCity("Toronto")).toBe("CAD");
    expect(currencyForCity("Vancouver")).toBe("CAD");
    for (const city of ["Paris", "Berlin", "Madrid", "Barcelona", "Rome", "Amsterdam", "Dublin"]) {
      expect(currencyForCity(city)).toBe("EUR");
    }
    expect(timeZoneForCity("London")).toBe("Europe/London");
    expect(timeZoneForCity("New York")).toBe("America/New_York");
    expect(timeZoneForCity("Los Angeles")).toBe("America/Los_Angeles");
    expect(timeZoneForCity("Toronto")).toBe("America/Toronto");
    expect(timeZoneForCity("Vancouver")).toBe("America/Vancouver");
    expect(timeZoneForCity("Paris")).toBe("Europe/Paris");
    expect(timeZoneForCity("Perth")).toBe("Australia/Perth");
    expect(localeForCity("London")).toBe("en-GB");
    expect(localeForCity("Toronto")).toBe("en-CA");
    expect(localeForCity("Paris")).toBe("en-FR");
    expect(localeForCity("Berlin")).toBe("en-DE");
    expect(countryForCity("Paris")).toBe("France");
    expect(countryForCity("Toronto")).toBe("Canada");
  });

  it("keeps India and Australia mappings intact", () => {
    expect(currencyForCity("Kochi")).toBe("INR");
    expect(timeZoneForCity("Mumbai")).toBe("Asia/Kolkata");
    expect(localeForCity("Mumbai")).toBe("en-IN");
    expect(currencyForCity("Sydney")).toBe("AUD");
    expect(timeZoneForCity("Sydney")).toBe("Australia/Sydney");
  });
});
