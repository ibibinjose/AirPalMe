import { describe, expect, it } from "vitest";
import { shouldShowFooter } from "./footer-rules";

describe("shouldShowFooter", () => {
  it("shows footer on primary public and discovery pages", () => {
    expect(shouldShowFooter("/")).toBe(true);
    expect(shouldShowFooter("/calendar")).toBe(true);
    expect(shouldShowFooter("/guide")).toBe(true);
    expect(shouldShowFooter("/solutions")).toBe(true);
    expect(shouldShowFooter("/solutions/hotel-concierge")).toBe(true);
    expect(shouldShowFooter("/about")).toBe(true);
    expect(shouldShowFooter("/contact")).toBe(true);
    expect(shouldShowFooter("/privacy")).toBe(true);
    expect(shouldShowFooter("/terms")).toBe(true);
    expect(shouldShowFooter("/cookies")).toBe(true);
  });

  it("shows footer on stay, event, and club pages", () => {
    expect(shouldShowFooter("/concierge")).toBe(true);
    expect(shouldShowFooter("/g/prop_123")).toBe(true);
    expect(shouldShowFooter("/e/event_456")).toBe(true);
    expect(shouldShowFooter("/p/place_789")).toBe(true);
    expect(shouldShowFooter("/clubs")).toBe(true);
    expect(shouldShowFooter("/club/club_abc")).toBe(true);
    expect(shouldShowFooter("/plan/new")).toBe(true);
    expect(shouldShowFooter("/plan/plan_xyz")).toBe(true);
    expect(shouldShowFooter("/circle")).toBe(true);
  });

  it("shows footer on business and host workspace pages", () => {
    expect(shouldShowFooter("/host")).toBe(true);
    expect(shouldShowFooter("/join")).toBe(true);
    expect(shouldShowFooter("/partners")).toBe(true);
    expect(shouldShowFooter("/business")).toBe(true);
  });

  it("hides footer on /scan camera viewfinder", () => {
    expect(shouldShowFooter("/scan")).toBe(false);
    expect(shouldShowFooter("/scan/qr")).toBe(false);
  });

  it("hides footer on /start auth flow", () => {
    expect(shouldShowFooter("/start")).toBe(false);
    expect(shouldShowFooter("/start?tab=signin")).toBe(false);
  });

  it("hides footer on /admin platform console", () => {
    expect(shouldShowFooter("/admin")).toBe(false);
    expect(shouldShowFooter("/admin/users")).toBe(false);
  });

  it("hides footer on /@handle public bio pages", () => {
    expect(shouldShowFooter("/@theglenmore")).toBe(false);
    expect(shouldShowFooter("/@rocks_pancakes")).toBe(false);
  });
});
