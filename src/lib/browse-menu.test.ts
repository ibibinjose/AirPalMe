import { describe, expect, it } from "vitest";
import {
  ACCOUNT_LINKS,
  BROWSE_LINKS,
  BROWSE_SECTIONS,
  BUSINESS_LINKS,
  GUIDE_LINKS,
  HELP_LINKS,
  HOST_LINKS,
  PLAN_LINKS,
  showBrowseStrip,
} from "./browse-menu";

function matched(path: string) {
  return BROWSE_LINKS.filter((link) => link.match(path)).map((link) => link.label);
}

function matchedIn(links: typeof PLAN_LINKS, path: string) {
  return links.filter((link) => link.match(path)).map((link) => link.label);
}

describe("browse menu", () => {
  it("matches each parent category to its discovery surfaces", () => {
    expect(matched("/stay")).toEqual(["Stay"]);
    expect(matched("/stay/@harbour-hotel")).toEqual(["Stay"]);
    expect(matched("/pass")).toEqual(["AirPal Pass"]);
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
    for (const path of ["/", "/explore", "/now", "/pass", "/stay", "/stay/@x", "/events", "/calendar", "/offers"]) {
      expect(showBrowseStrip(path)).toBe(true);
    }
    for (const path of ["/mate", "/plan", "/pulse", "/inbox", "/me", "/host", "/settings"]) {
      expect(showBrowseStrip(path)).toBe(false);
    }
  });

  it("matches plan, guide, business, account, and help sections to their pages", () => {
    expect(matchedIn(PLAN_LINKS, "/plan")).toEqual(["My plans"]);
    expect(matchedIn(PLAN_LINKS, "/invite/abc")).toEqual(["My plans"]);
    expect(matchedIn(PLAN_LINKS, "/calendar")).toEqual(["Calendar"]);
    expect(matchedIn(GUIDE_LINKS, "/concierge")).toEqual(["Concierge"]);
    expect(matchedIn(GUIDE_LINKS, "/g/harbour-hotel")).toEqual(["Concierge"]);
    expect(matchedIn(GUIDE_LINKS, "/tour/abc")).toEqual(["Guide"]);
    expect(matchedIn(GUIDE_LINKS, "/scan")).toEqual(["Scan code"]);
    expect(matchedIn(BUSINESS_LINKS, "/business")).toEqual(["Business hub"]);
    expect(matchedIn(BUSINESS_LINKS, "/business/onboard")).toEqual(["Business hub"]);
    expect(matchedIn(BUSINESS_LINKS, "/business/promotions")).toEqual([]);
    expect(matchedIn(BUSINESS_LINKS, "/partner")).toEqual(["Partners"]);
    expect(matchedIn(BUSINESS_LINKS, "/event")).toEqual(["Host an event"]);
    expect(matchedIn(ACCOUNT_LINKS, "/me")).toEqual(["Me dashboard"]);
    expect(matchedIn(ACCOUNT_LINKS, "/me/tickets")).toEqual(["My tickets"]);
    expect(matchedIn(ACCOUNT_LINKS, "/me/inbox")).toEqual([]);
    expect(matchedIn(HELP_LINKS, "/assist")).toEqual(["Support"]);
    expect(matchedIn(HELP_LINKS, "/getAirPalApp")).toEqual(["Get the app"]);
  });

  it("lists every sitemap href once across sections, hosts-only last", () => {
    const titles = BROWSE_SECTIONS.map((s) => s.title);
    expect(titles).toEqual([
      "AirPal Pass",
      "AirPal Me",
      "Hotels & Stays",
      "Organisers & Partners",
      "Account & Universal Profile",
      "Help & Trust",
      "Host Operations",
    ]);
    const hrefs = BROWSE_SECTIONS.flatMap((s) => s.links.map((l) => l.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const href of hrefs) expect(href.startsWith("/")).toBe(true);
    expect(BROWSE_SECTIONS.filter((s) => s.hostsOnly).map((s) => s.title)).toEqual(["Host Operations"]);
  });
});
