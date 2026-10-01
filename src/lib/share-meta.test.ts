import { describe, expect, it } from "vitest";
import { routeMetaFor } from "./share-meta";

describe("routeMetaFor", () => {
  it("titles core verticals distinctly", () => {
    expect(routeMetaFor("/mate")?.title).toContain("Mate");
    // Renamed Stay & Guide (Oct 2026 founder rebrand); route unchanged.
    expect(routeMetaFor("/concierge")?.title).toContain("Guide");
    expect(routeMetaFor("/fashion")?.title).toContain("Fashion");
    expect(routeMetaFor("/plan")?.title).toContain("Plans");
  });

  it("falls back to the brand default on unknown paths", () => {
    expect(routeMetaFor("/somewhere-new")?.title).toContain("AirPal.Me");
  });

  it("leaves dynamic detail pages to their own tags", () => {
    expect(routeMetaFor("/plan/abc123")).toBeNull();
    expect(routeMetaFor("/e/ev_1")).toBeNull();
    expect(routeMetaFor("/@someone")).toBeNull();
    expect(routeMetaFor("/marketing")).toBeNull();
  });
});
