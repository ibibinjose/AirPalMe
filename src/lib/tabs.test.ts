import { describe, expect, it } from "vitest";
import { tabFromPath } from "./tabs";

describe("tabFromPath", () => {
  it("maps the three doors", () => {
    expect(tabFromPath("/")).toBe("explore");
    expect(tabFromPath("/explore")).toBe("explore");
    expect(tabFromPath("/calendar")).toBe("explore");
    expect(tabFromPath("/plan")).toBe("plan");
    expect(tabFromPath("/plan/new")).toBe("plan");
    expect(tabFromPath("/invite/abc")).toBe("plan");
    expect(tabFromPath("/circle")).toBe("plan");
    expect(tabFromPath("/concierge")).toBe("stay");
    expect(tabFromPath("/g/harbour-hotel")).toBe("stay");
    expect(tabFromPath("/scan")).toBe("scan");
    expect(tabFromPath("/w/abcd")).toBe("scan");
    expect(tabFromPath("/q/sydney/harbour")).toBe("stay");
  });

  it("maps personal bio to the @ tab", () => {
    expect(tabFromPath("/me")).toBe("me");
    expect(tabFromPath("/bio/setup")).toBe("me");
    expect(tabFromPath("/@maya")).toBe("me");
  });

  it("keeps Mate off the tab bar — it falls back to What's on", () => {
    expect(tabFromPath("/mate")).toBe("explore");
    expect(tabFromPath("/mate/request")).toBe("explore");
  });

  it("parks directory and account under What's on, not extra tabs", () => {
    expect(tabFromPath("/promotions")).toBe("explore");
    expect(tabFromPath("/giveaways")).toBe("explore");
    expect(tabFromPath("/guide")).toBe("explore");
    expect(tabFromPath("/experiences")).toBe("explore");
    expect(tabFromPath("/join")).toBe("explore");
    expect(tabFromPath("/settings")).toBe("explore");
  });
});
