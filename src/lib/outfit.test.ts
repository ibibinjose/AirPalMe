import { describe, expect, it } from "vitest";
import { getDailyOutfitRecommendation } from "./outfit";

describe("getDailyOutfitRecommendation", () => {
  it("suggests rain protection when rain code is present", () => {
    const advice = getDailyOutfitRecommendation(18, 61, true); // Rain
    expect(advice.vibe).toBe("Wet Weather");
    expect(advice.accessory).toContain("umbrella");
  });

  it("suggests cold layering for temperatures below 12 degrees", () => {
    const advice = getDailyOutfitRecommendation(9, 1, true);
    expect(advice.vibe).toBe("Brisk & Cold");
    expect(advice.outfit).toContain("Heavy coat");
  });

  it("suggests mild layers for prime walking weather (18-24 degrees)", () => {
    const advice = getDailyOutfitRecommendation(21, 0, true);
    expect(advice.vibe).toBe("Mild & Pleasant");
    expect(advice.accessory).toContain("Sunglasses");
  });

  it("suggests breathable attire for high heat", () => {
    const advice = getDailyOutfitRecommendation(32, 0, true);
    expect(advice.vibe).toBe("Hot & Bright");
    expect(advice.outfit).toContain("linen");
  });
});
