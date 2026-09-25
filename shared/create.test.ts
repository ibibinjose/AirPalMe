import { describe, expect, it } from "vitest";
import { CREATE_ITEMS, createItemsFor, hasPartnerProfile } from "./create";

describe("create hub", () => {
  it("splits individual and partner tools", () => {
    const ids = CREATE_ITEMS.map((i) => i.id);
    expect(ids).toContain("plan");
    expect(ids).toContain("event");
    expect(ids).toContain("festival");
    expect(ids).toContain("business");
    expect(ids).toContain("stay");
  });

  it("gates partner tools until the account holds a partner profile", () => {
    const guest = createItemsFor({ signedIn: false, hasPartnerProfile: false });
    expect(guest.individual.length).toBeGreaterThan(0);
    expect(guest.partner).toEqual([]);
    expect(guest.gated.length).toBeGreaterThan(0);

    const individual = createItemsFor({ signedIn: true, hasPartnerProfile: false });
    expect(individual.partner).toEqual([]);
    // Events are open to every signed-in account — same as the builders enforce.
    expect(individual.individual.map((i) => i.id)).toContain("event");
    expect(individual.individual.map((i) => i.id)).toContain("festival");
    expect(individual.gated.map((i) => i.id)).toContain("business");

    const partner = createItemsFor({ signedIn: true, hasPartnerProfile: true });
    expect(partner.partner.map((i) => i.id)).toContain("business");
    expect(partner.gated).toEqual([]);
  });

  it("detects partner profiles by business handle or properties", () => {
    expect(hasPartnerProfile({})).toBe(false);
    expect(hasPartnerProfile({ businessHandle: "harbour-hotel" })).toBe(true);
    expect(hasPartnerProfile({ propertyCount: 2 })).toBe(true);
    expect(hasPartnerProfile({ propertyCount: 0 })).toBe(false);
  });
});
