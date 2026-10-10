import { describe, expect, it } from "vitest";
import { passTabFromPath, tabFromPath } from "./tabs";

describe("tabFromPath", () => {
  it("maps the companion tabs", () => {
    expect(tabFromPath("/now")).toBe("explore");
    expect(tabFromPath("/pass")).toBe("explore");
    expect(tabFromPath("/explore")).toBe("explore");
    expect(tabFromPath("/calendar")).toBe("explore");
    expect(tabFromPath("/plan")).toBe("trips");
    expect(tabFromPath("/plan/new")).toBe("trips");
    expect(tabFromPath("/invite/abc")).toBe("trips");
    expect(tabFromPath("/scan")).toBe("scan");
    expect(tabFromPath("/w/abcd")).toBe("scan");
    expect(tabFromPath("/concierge")).toBe("explore");
    expect(tabFromPath("/g/harbour-hotel")).toBe("explore");
    expect(tabFromPath("/q/sydney/harbour")).toBe("explore");
  });

  it("maps personal bio to the Bio tab and dashboard/settings to the Me tab", () => {
    expect(tabFromPath("/me")).toBe("me");
    expect(tabFromPath("/me/inbox")).toBe("me");
    expect(tabFromPath("/settings")).toBe("me");
    expect(tabFromPath("/bio/setup")).toBe("bio");
    expect(tabFromPath("/@maya")).toBe("bio");
  });

  it("maps home route to home (accessible via top App icon)", () => {
    expect(tabFromPath("/")).toBe("home");
  });

  it("falls back to explore for removed Phase 6 routes", () => {
    expect(tabFromPath("/mate")).toBe("explore");
    expect(tabFromPath("/mate/request")).toBe("explore");
    expect(tabFromPath("/circle")).toBe("explore");
    expect(tabFromPath("/experiences")).toBe("explore");
  });

  it("parks directory and account under Explore, not extra tabs", () => {
    expect(tabFromPath("/deals")).toBe("explore");
    expect(tabFromPath("/guide")).toBe("explore");
    expect(tabFromPath("/join")).toBe("explore");
  });
});

describe("passTabFromPath (Pass dock)", () => {
  it("maps pass surfaces to pass tabs", () => {
    expect(passTabFromPath("/pass")).toBe("pass");
    expect(passTabFromPath("/pass/deals")).toBe("pass");
    expect(passTabFromPath("/deals")).toBe("pass");
    expect(passTabFromPath("/event")).toBe("pass");
    expect(passTabFromPath("/events")).toBe("events");
    expect(passTabFromPath("/e/abc")).toBe("events");
    expect(passTabFromPath("/e/abc/guests")).toBe("events");
    expect(passTabFromPath("/me/tickets")).toBe("tickets");
    expect(passTabFromPath("/ticket/abc")).toBe("tickets");
    expect(passTabFromPath("/scan")).toBe("scan");
    expect(passTabFromPath("/me")).toBe("me");
    expect(passTabFromPath("/@handle")).toBe("me");
  });
});
