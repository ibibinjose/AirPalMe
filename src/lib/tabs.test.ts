import { describe, expect, it } from "vitest";
import { tabFromPath } from "./tabs";

describe("tabFromPath", () => {
  it("maps the five companion tabs", () => {
    expect(tabFromPath("/")).toBe("home");
    expect(tabFromPath("/explore")).toBe("explore");
    expect(tabFromPath("/calendar")).toBe("explore");
    expect(tabFromPath("/plan")).toBe("trips");
    expect(tabFromPath("/plan/new")).toBe("trips");
    expect(tabFromPath("/invite/abc")).toBe("trips");
    expect(tabFromPath("/circle")).toBe("trips");
    expect(tabFromPath("/me/inbox")).toBe("inbox");
    expect(tabFromPath("/concierge")).toBe("explore");
    expect(tabFromPath("/g/harbour-hotel")).toBe("explore");
    expect(tabFromPath("/q/sydney/harbour")).toBe("explore");
  });

  it("maps personal bio and settings to the Me tab", () => {
    expect(tabFromPath("/me")).toBe("me");
    expect(tabFromPath("/bio/setup")).toBe("me");
    expect(tabFromPath("/@maya")).toBe("me");
    expect(tabFromPath("/settings")).toBe("me");
  });

  it("keeps Mate and Scan off the tab bar — they fall back, not extra tabs", () => {
    expect(tabFromPath("/mate")).toBe("explore");
    expect(tabFromPath("/mate/request")).toBe("explore");
    expect(tabFromPath("/scan")).toBe("home");
    expect(tabFromPath("/w/abcd")).toBe("home");
  });

  it("parks directory and account under Explore, not extra tabs", () => {
    expect(tabFromPath("/promotions")).toBe("explore");
    expect(tabFromPath("/giveaways")).toBe("explore");
    expect(tabFromPath("/guide")).toBe("explore");
    expect(tabFromPath("/experiences")).toBe("explore");
    expect(tabFromPath("/join")).toBe("explore");
  });
});
