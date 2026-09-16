import { describe, expect, it } from "vitest";
import { centeredOrigin, minCoverScale, outputSize, sourceRect } from "./image-crop";

describe("image crop", () => {
  it("covers a square crop of a wide photo", () => {
    const scale = minCoverScale(2000, 1000, 400, 400);
    expect(scale).toBe(0.4);
    const origin = centeredOrigin(2000, 1000, 400, 400, scale);
    const rect = sourceRect({
      imageW: 2000,
      imageH: 1000,
      viewW: 400,
      viewH: 400,
      scale,
      ...origin,
    });
    expect(rect.w).toBeCloseTo(1000);
    expect(rect.h).toBeCloseTo(1000);
    expect(rect.x).toBeCloseTo(500);
    expect(rect.y).toBeCloseTo(0);
  });

  it("keeps a banner crop inside the source", () => {
    const scale = minCoverScale(1200, 800, 600, 200);
    const origin = centeredOrigin(1200, 800, 600, 200, scale);
    const rect = sourceRect({
      imageW: 1200,
      imageH: 800,
      viewW: 600,
      viewH: 200,
      scale,
      ...origin,
    });
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.w).toBeLessThanOrEqual(1200.01);
    expect(rect.y + rect.h).toBeLessThanOrEqual(800.01);
  });

  it("caps export size on the long edge", () => {
    expect(outputSize({ x: 0, y: 0, w: 4000, h: 2000 }, 1600)).toEqual({ w: 1600, h: 800 });
  });
});
