import { describe, expect, it } from "vitest";
import { partnerAccountPath } from "./partner-account";

describe("partnerAccountPath", () => {
  it("opens the place when this login already has one", () => {
    expect(partnerAccountPath({ signedIn: true, hasPlace: true })).toBe("/business");
  });

  it("starts onboard on the same login when there is no place yet", () => {
    expect(partnerAccountPath({ signedIn: true, hasPlace: false })).toBe("/business/onboard");
  });

  it("creates the same AirPal account, then continues into onboard", () => {
    expect(partnerAccountPath({ signedIn: false, hasPlace: false })).toBe(
      "/start?role=business&tab=signup&next=/business/onboard",
    );
  });
});
