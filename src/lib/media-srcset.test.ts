import { describe, expect, it } from "vitest";
import { mediaSrcSet } from "./media-srcset";

describe("mediaSrcSet", () => {
  it("builds webp variants for bundled media", () => {
    expect(mediaSrcSet("/media/harbour.jpg")).toBe(
      "/media/harbour-800.webp 800w, /media/harbour-full.webp 1600w",
    );
  });

  it("returns undefined for remote, idb, and unknown sources", () => {
    expect(mediaSrcSet("https://cdn.example/x.jpg")).toBeUndefined();
    expect(mediaSrcSet("idb:abc")).toBeUndefined();
    expect(mediaSrcSet("/media/unknown.jpg")).toBeUndefined();
    expect(mediaSrcSet(undefined)).toBeUndefined();
  });
});
