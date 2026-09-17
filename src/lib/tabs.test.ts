import { describe, expect, it } from "vitest";
import { tabFromPath } from "./tabs";

describe("tabFromPath", () => {
  it("routes guest surfaces to their tabs", () => {
    expect(tabFromPath("/scan")).toBe("scan");
    expect(tabFromPath("/plan/new")).toBe("plan");
    expect(tabFromPath("/invite/abc")).toBe("plan");
    expect(tabFromPath("/calendar")).toBe("explore");
    expect(tabFromPath("/events/xyz")).toBe("explore");
    expect(tabFromPath("/guide")).toBe("explore");
    expect(tabFromPath("/circle")).toBe("explore");
    expect(tabFromPath("/concierge")).toBe("stay");
    expect(tabFromPath("/g/harbour-hotel")).toBe("stay");
    expect(tabFromPath("/q/sydney/harbour")).toBe("stay");
    expect(tabFromPath("/c/college")).toBe("stay");
  });

  it("routes Mate surfaces to the mate tab", () => {
    expect(tabFromPath("/mate")).toBe("mate");
    expect(tabFromPath("/mate/request")).toBe("mate");
  });

  it("keeps Explore as home and falls back to explore for everything else", () => {
    expect(tabFromPath("/")).toBe("explore");
    expect(tabFromPath("/explore")).toBe("explore");
    expect(tabFromPath("/host")).toBe("explore");
    expect(tabFromPath("/settings")).toBe("explore");
  });

  it("parks deals and giveaways under Explore", () => {
    expect(tabFromPath("/promotions")).toBe("explore");
    expect(tabFromPath("/promotions/summer")).toBe("explore");
    expect(tabFromPath("/giveaways")).toBe("explore");
    expect(tabFromPath("/giveaways/abc")).toBe("explore");
  });

  it("routes your profile and account to the You tab", () => {
    expect(tabFromPath("/me")).toBe("you");
    expect(tabFromPath("/me/giveaways")).toBe("you");
    expect(tabFromPath("/bio/setup")).toBe("you");
    expect(tabFromPath("/bio/edit")).toBe("you");
    expect(tabFromPath("/@maya")).toBe("you");
    expect(tabFromPath("/join")).toBe("explore");
  });
});
