import { describe, expect, it } from "vitest";
import { publicSiteOrigin, toPublicUrl } from "./public-origin";

describe("toPublicUrl", () => {
  it("uses the live https origin", () => {
    expect(publicSiteOrigin()).toBe("https://airpal.me");
  });

  it("rewrites capacitor invite links", () => {
    expect(toPublicUrl("capacitor://airpal.me/start?tab=signup&ref=bibinjose")).toBe(
      "https://airpal.me/start?tab=signup&ref=bibinjose",
    );
  });

  it("rewrites ionic and localhost origins", () => {
    expect(toPublicUrl("ionic://localhost/@maya")).toBe("https://airpal.me/@maya");
    expect(toPublicUrl("http://localhost:3000/plan/abc")).toBe("https://airpal.me/plan/abc");
  });

  it("keeps https airpal paths and external https", () => {
    expect(toPublicUrl("https://airpal.me/@maya")).toBe("https://airpal.me/@maya");
    expect(toPublicUrl("https://maps.google.com/?q=Sydney")).toBe("https://maps.google.com/?q=Sydney");
  });

  it("builds from a path", () => {
    expect(toPublicUrl("/start?tab=signup&ref=leo")).toBe("https://airpal.me/start?tab=signup&ref=leo");
  });
});
