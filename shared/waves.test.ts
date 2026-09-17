import { describe, expect, it } from "vitest";
import {
  buildWaveCopy,
  normalizeWaveHandle,
  validateWaveRequest,
  WAVE_COOLDOWN_MS,
  waveCooldownRemainingMs,
} from "./waves";

describe("waves", () => {
  it("normalizes @-prefixed and mixed-case handles", () => {
    expect(normalizeWaveHandle("@Maya.K")).toBe("maya.k");
    expect(normalizeWaveHandle("  Sam_01 ")).toBe("sam_01");
  });

  it("rejects missing and malformed handles", () => {
    expect(validateWaveRequest({})).toEqual(["Choose who to wave at."]);
    expect(validateWaveRequest({ toHandle: "" })).toEqual(["Choose who to wave at."]);
    expect(validateWaveRequest({ toHandle: "ab" }).length).toBeGreaterThan(0);
    expect(validateWaveRequest({ toHandle: "a!" }).length).toBeGreaterThan(0);
  });

  it("sanitizes display noise before validating", () => {
    // normalizeHandle strips illegal chars, so this arrives as valid "nospaces".
    expect(validateWaveRequest({ toHandle: "no spaces!" })).toEqual([]);
  });

  it("accepts a well-formed handle", () => {
    expect(validateWaveRequest({ toHandle: "@maya.k" })).toEqual([]);
  });

  it("allows the first wave immediately", () => {
    expect(waveCooldownRemainingMs(undefined)).toBe(0);
    expect(waveCooldownRemainingMs("")).toBe(0);
    expect(waveCooldownRemainingMs("not-a-date")).toBe(0);
  });

  it("holds a 24h cooldown per person", () => {
    const now = Date.now();
    expect(WAVE_COOLDOWN_MS).toBe(24 * 60 * 60 * 1000);
    const remaining = waveCooldownRemainingMs(new Date(now - 1_000).toISOString(), now);
    expect(remaining).toBeGreaterThan(WAVE_COOLDOWN_MS - 5_000);
    expect(remaining).toBeLessThanOrEqual(WAVE_COOLDOWN_MS);
    expect(waveCooldownRemainingMs(new Date(now - WAVE_COOLDOWN_MS - 1).toISOString(), now)).toBe(0);
    expect(waveCooldownRemainingMs(now - 60_000, now)).toBeGreaterThan(0);
  });

  it("names the waver and links back to their bio", () => {
    const copy = buildWaveCopy({ fromName: "Maya", fromHandle: "maya.k", city: "Kochi", waveBack: false });
    expect(copy.title).toBe("Maya waved at you");
    expect(copy.body).toContain("Kochi");
    expect(copy.href).toBe("/@maya.k");
  });

  it("celebrates a wave-back differently", () => {
    const copy = buildWaveCopy({ fromName: "Maya", fromHandle: "maya.k", city: "", waveBack: true });
    expect(copy.title).toBe("Maya waved back");
    expect(copy.body).toBe("Open their bio to wave back.");
  });

  it("falls back to the handle when the name is blank", () => {
    const copy = buildWaveCopy({ fromName: "  ", fromHandle: "maya.k", city: "Kochi", waveBack: false });
    expect(copy.title).toBe("@maya.k waved at you");
  });
});
