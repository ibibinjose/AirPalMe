import { describe, expect, it } from "vitest";
import { profileMatchesSearch, searchNeedle } from "./search-query";

describe("searchNeedle", () => {
  it("strips @ and flags handle lookups", () => {
    expect(searchNeedle("@theglenmore")).toEqual({
      text: "@theglenmore",
      handle: "theglenmore",
      looksLikeHandle: true,
    });
    expect(searchNeedle("theglenmore")).toMatchObject({ handle: "theglenmore", looksLikeHandle: true });
    expect(searchNeedle("coffee near me").looksLikeHandle).toBe(false);
  });
});

describe("profileMatchesSearch", () => {
  const profile = { handle: "theglenmore", name: "The Glenmore Hotel", shortWhy: "Harbour views" };

  it("matches @handle queries that currently return nothing in global search", () => {
    expect(profileMatchesSearch(profile, searchNeedle("@theglenmore"))).toBe(true);
    expect(profileMatchesSearch(profile, searchNeedle("glenmore"))).toBe(true);
    expect(profileMatchesSearch(profile, searchNeedle("Harbour"))).toBe(true);
    expect(profileMatchesSearch(profile, searchNeedle("xyzzy"))).toBe(false);
  });
});
