import { describe, expect, it } from "vitest";
import { validateStartWave, waveCodeFrom, waveLive, waveUrl } from "./wave";

describe("wave", () => {
  it("normalises a short code", () => {
    expect(waveCodeFrom("ab-12cd")).toBe("AB12CD");
    expect(waveUrl("glen1")).toBe("https://airpal.me/w/GLEN1");
  });

  it("requires a place name to start waving", () => {
    expect(validateStartWave({ placeName: "" })).toContain("Name the place you’re waving from.");
    expect(validateStartWave({ placeName: "The Glenmore" })).toEqual([]);
  });

  it("expires a wave after its window", () => {
    expect(waveLive({ expiresAt: new Date(Date.now() + 60_000).toISOString() })).toBe(true);
    expect(waveLive({ expiresAt: new Date(Date.now() - 1000).toISOString() })).toBe(false);
  });
});
