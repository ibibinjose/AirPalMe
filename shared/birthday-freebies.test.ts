import { describe, expect, it } from "vitest";
import {
  monthFromBirthDate,
  offerVisibleFor,
  validateBirthdayOfferDraft,
  isBirthdayRegionCode,
  shouldAlertBirthdayMonth,
  shouldAlertBirthdayMidMonth,
  birthdayAlertsHref,
  BIRTHDAY_REGIONS,
  BIRTHDAY_MONTHS,
} from "./birthday-freebies";

describe("monthFromBirthDate", () => {
  it("returns 1–12 for valid YYYY-MM-DD", () => {
    expect(monthFromBirthDate("1990-01-15")).toBe(1);
    expect(monthFromBirthDate("2000-12-01")).toBe(12);
    expect(monthFromBirthDate("1998-06-30")).toBe(6);
  });

  it("rejects invalid formats and impossible dates", () => {
    expect(monthFromBirthDate("")).toBeNull();
    expect(monthFromBirthDate("1990-1-15")).toBeNull();
    expect(monthFromBirthDate("1990-13-01")).toBeNull();
    expect(monthFromBirthDate("1990-02-30")).toBeNull();
    expect(monthFromBirthDate("not-a-date")).toBeNull();
  });
});

describe("offerVisibleFor", () => {
  const base = {
    regions: ["au", "us"],
    birthdayMonths: [3, 4],
    status: "live" as const,
  };

  it("shows live offers for matching month and region", () => {
    expect(offerVisibleFor(base, 3, "au")).toBe(true);
    expect(offerVisibleFor(base, 4, "US")).toBe(true);
  });

  it("hides non-matching month, region, or non-live", () => {
    expect(offerVisibleFor(base, 5, "au")).toBe(false);
    expect(offerVisibleFor(base, 3, "in")).toBe(false);
    expect(offerVisibleFor({ ...base, status: "draft" }, 3, "au")).toBe(false);
  });

  it("treats empty birthdayMonths as all months", () => {
    expect(offerVisibleFor({ ...base, birthdayMonths: [] }, 11, "au")).toBe(true);
  });
});

describe("validateBirthdayOfferDraft", () => {
  it("accepts a minimal valid draft", () => {
    expect(
      validateBirthdayOfferDraft({
        brand: "Starbucks",
        title: "Birthday drink",
        rewardText: "Free handcrafted drink",
        category: "food",
        regions: ["au"],
        birthdayMonths: [1],
        howToClaim: "Join Rewards and visit in your birthday month.",
      }),
    ).toEqual([]);
  });

  it("flags missing fields and bad region/month/url", () => {
    const errors = validateBirthdayOfferDraft({
      brand: "",
      title: "",
      rewardText: "",
      category: "snack",
      regions: ["zz"],
      birthdayMonths: [0, 13],
      howToClaim: "",
      claimUrl: "ftp://bad",
      status: "weird",
    });
    expect(errors.some((e) => e.includes("Brand"))).toBe(true);
    expect(errors.some((e) => e.includes("Title"))).toBe(true);
    expect(errors.some((e) => e.includes("Category"))).toBe(true);
    expect(errors.some((e) => e.includes("region"))).toBe(true);
    expect(errors.some((e) => e.includes("months"))).toBe(true);
    expect(errors.some((e) => e.includes("Claim URL"))).toBe(true);
    expect(errors.some((e) => e.includes("Status"))).toBe(true);
  });
});

describe("regions and months catalogs", () => {
  it("covers AU IN US UAE EU and twelve months", () => {
    expect(BIRTHDAY_REGIONS.map((r) => r.code)).toEqual(["au", "in", "us", "uae", "eu"]);
    expect(BIRTHDAY_MONTHS).toHaveLength(12);
    expect(isBirthdayRegionCode("au")).toBe(true);
    expect(isBirthdayRegionCode("xx")).toBe(false);
  });
});

describe("shouldAlertBirthdayMonth", () => {
  const base = {
    birthdayMonth: 10,
    adultConsent: true,
    birthdayAlertsEnabled: true,
  };

  it("alerts when month matches, adult, enabled, and not yet alerted", () => {
    // 2026-10-01 00:00 Sydney = 2026-09-30 14:00 UTC
    const now = new Date("2026-09-30T14:00:00.000Z");
    expect(shouldAlertBirthdayMonth(base, now)).toBe(true);
  });

  it("skips wrong month, disabled, non-adult, or already alerted this month", () => {
    const now = new Date("2026-09-30T14:00:00.000Z"); // Oct in Sydney
    expect(shouldAlertBirthdayMonth({ ...base, birthdayMonth: 9 }, now)).toBe(false);
    expect(shouldAlertBirthdayMonth({ ...base, birthdayAlertsEnabled: false }, now)).toBe(false);
    expect(shouldAlertBirthdayMonth({ ...base, adultConsent: false, adultConfirmed: false }, now)).toBe(false);
    expect(shouldAlertBirthdayMonth({ ...base, lastBirthdayMonthAlertAt: "2026-10-02T01:00:00.000Z" }, now)).toBe(
      false,
    );
  });

  it("defaults enabled when birthdayAlertsEnabled is unset", () => {
    const now = new Date("2026-09-30T14:00:00.000Z");
    const rest = { ...base, birthdayAlertsEnabled: undefined };
    expect(shouldAlertBirthdayMonth(rest, now)).toBe(true);
  });
});

describe("shouldAlertBirthdayMidMonth", () => {
  it("only on/after Sydney day 15 and once per month", () => {
    const early = new Date("2026-09-30T14:00:00.000Z"); // Oct 1 Sydney
    const mid = new Date("2026-10-14T14:00:00.000Z"); // Oct 15 Sydney
    const user = {
      birthdayMonth: 10,
      adultConsent: true,
      lastBirthdayMonthAlertAt: "2026-10-01T01:00:00.000Z",
    };
    expect(shouldAlertBirthdayMidMonth(user, early)).toBe(false);
    expect(shouldAlertBirthdayMidMonth(user, mid)).toBe(true);
    expect(shouldAlertBirthdayMidMonth({ ...user, lastBirthdayMidMonthAlertAt: "2026-10-15T01:00:00.000Z" }, mid)).toBe(
      false,
    );
  });
});

describe("birthdayAlertsHref", () => {
  it("defaults to au and validates region", () => {
    expect(birthdayAlertsHref(undefined)).toBe("/birthday-freebies/au");
    expect(birthdayAlertsHref("IN")).toBe("/birthday-freebies/in");
    expect(birthdayAlertsHref("zz")).toBe("/birthday-freebies/au");
  });
});
