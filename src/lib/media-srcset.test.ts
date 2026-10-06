import { describe, expect, it } from "vitest";
import { mediaSrcSet, sizedImageUrl } from "./media-srcset";

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

describe("sizedImageUrl", () => {
  it("downsizes Unsplash originals to the requested width", () => {
    expect(
      sizedImageUrl("https://images.unsplash.com/photo-1?auto=format&fit=crop&w=1200&q=80", 600),
    ).toBe("https://images.unsplash.com/photo-1?auto=format&fit=crop&w=600&q=80");
  });

  it("passes through local, idb, and other remote sources untouched", () => {
    expect(sizedImageUrl("/media/harbour.jpg", 600)).toBe("/media/harbour.jpg");
    expect(sizedImageUrl("https://cdn.example/x.jpg", 600)).toBe("https://cdn.example/x.jpg");
    expect(sizedImageUrl(undefined, 600)).toBeUndefined();
  });
});
