import { describe, expect, it } from "vitest";
import {
  canClaimDeal,
  canReadPropertyWifi,
  normalizeEmail,
  parsePlatformAdminEmails,
  pinIsWellFormed,
  resolveRegistrationRole,
  roleFromAccessToken,
} from "./airpal-security";

describe("resolveRegistrationRole", () => {
  it("never grants super_admin from a client-requested role", () => {
    expect(resolveRegistrationRole("host@example.com", "super_admin", [])).toBe("guest");
    expect(resolveRegistrationRole("host@example.com", "staff", [])).toBe("guest");
  });

  it("grants platform admin only from the server allowlist", () => {
    expect(resolveRegistrationRole("bibin@airpal.me", "guest", ["bibin@airpal.me"])).toBe("super_admin");
    expect(resolveRegistrationRole("bibin.inc@gmail.com", "guest", [])).toBe("super_admin");
  });

  it("allows a host to register as host_admin", () => {
    expect(resolveRegistrationRole("gm@hotel.com", "host_admin", [])).toBe("host_admin");
  });
});

describe("roleFromAccessToken", () => {
  it("prefers custom claims over the user document role", () => {
    expect(roleFromAccessToken({ platform_admin: true, role: "guest" }, "guest")).toBe("super_admin");
    expect(roleFromAccessToken({ role: "staff" }, "host_admin")).toBe("staff");
  });
});

describe("canClaimDeal", () => {
  it("blocks inactive deals, duplicates, and exhausted inventory", () => {
    expect(canClaimDeal({ active: false, claimsCount: 0, existingActiveForUser: false }).ok).toBe(false);
    expect(canClaimDeal({ active: true, claimsCount: 0, existingActiveForUser: true }).ok).toBe(false);
    expect(canClaimDeal({ active: true, claimsCount: 10, claimLimit: 10, existingActiveForUser: false }).ok).toBe(false);
    expect(canClaimDeal({ active: true, claimsCount: 2, claimLimit: 10, existingActiveForUser: false }).ok).toBe(true);
  });
});

describe("canReadPropertyWifi", () => {
  const tokens = { "tok-101-demo": "101" };

  it("lets a host through without a scan proof", () => {
    expect(canReadPropertyWifi({ isHost: true })).toBe(true);
  });

  it("lets a guest through with a matching room token", () => {
    expect(canReadPropertyWifi({ isHost: false, roomTokens: tokens, roomToken: "tok-101-demo" })).toBe(true);
  });

  it("rejects a guest with a guessed property id and no proof", () => {
    expect(canReadPropertyWifi({ isHost: false, roomTokens: tokens, roomToken: "nope" })).toBe(false);
    expect(canReadPropertyWifi({ isHost: false, roomTokens: tokens })).toBe(false);
  });

  it("accepts the lobby marker or a marker that belongs to the property", () => {
    expect(
      canReadPropertyWifi({ isHost: false, lobbyMarkerId: "97a4e8add3a8c668", markerId: "97a4e8add3a8c668" }),
    ).toBe(true);
    expect(canReadPropertyWifi({ isHost: false, markerId: "room-101", markerBelongsToProperty: true })).toBe(true);
    expect(canReadPropertyWifi({ isHost: false, markerId: "street-x", markerBelongsToProperty: false })).toBe(false);
  });
});

describe("pin and email helpers", () => {
  it("accepts only 4-8 digit PINs", () => {
    expect(pinIsWellFormed("1234")).toBe(true);
    expect(pinIsWellFormed("12")).toBe(false);
    expect(pinIsWellFormed("abcd")).toBe(false);
  });

  it("parses the platform admin allowlist", () => {
    expect(parsePlatformAdminEmails("A@x.com, b@y.com ")).toEqual([
      "bibin.inc@gmail.com",
      "a@x.com",
      "b@y.com",
    ]);
    expect(parsePlatformAdminEmails("")).toEqual(["bibin.inc@gmail.com"]);
    expect(normalizeEmail("  Host@AirPal.ME ")).toBe("host@airpal.me");
  });
});
