import { describe, expect, it } from "vitest";
import { BROWSE_LINKS, HOST_LINKS, showBrowseStrip } from "./browse-menu";

function matched(path: string) {
  return BROWSE_LINKS.filter((link) => link.match(path)).map((link) => link.label);
}

describe("browse menu", () => {
  it("matches each parent category to its discovery surfaces", () => {
    expect(matched("/stay")).toEqual(["Stay"]);
    expect(matched("/stay/@harbour-hotel")).toEqual(["Stay"]);
    expect(matched("/events")).toEqual(["Events"]);
    expect(matched("/calendar")).toEqual(["Events"]);
    expect(matched("/offers")).toEqual(["Offers & Deals"]);
    expect(matched("/deals/summer")).toEqual(["Offers & Deals"]);
    expect(matched("/promotions/1")).toEqual(["Offers & Deals"]);
    expect(matched("/now")).toEqual(["What now?"]);
  });

  it("matches nothing outside the browse categories", () => {
    expect(matched("/")).toEqual([]);
    expect(matched("/explore")).toEqual([]);
    expect(matched("/mate")).toEqual([]);
    expect(matched("/plan")).toEqual([]);
    expect(matched("/pulse")).toEqual([]);
    expect(matched("/inbox")).toEqual([]);
  });

  it("matches host shortcuts without overlapping each other", () => {
    const hostMatched = (path: string) => HOST_LINKS.filter((link) => link.match(path)).map((link) => link.label);
    expect(hostMatched("/host")).toEqual(["Host dashboard"]);
    expect(hostMatched("/host/pulse")).toEqual(["Guest ratings"]);
    expect(hostMatched("/business/promotions")).toEqual(["Promotions"]);
    expect(hostMatched("/business")).toEqual([]);
  });

  it("shows the mobile strip on Home and browse-context routes only", () => {
    for (const path of ["/", "/explore", "/now", "/stay", "/stay/@x", "/events", "/calendar", "/offers"]) {
      expect(showBrowseStrip(path)).toBe(true);
    }
    for (const path of ["/mate", "/plan", "/pulse", "/inbox", "/me", "/host", "/settings"]) {
      expect(showBrowseStrip(path)).toBe(false);
    }
  });
});
