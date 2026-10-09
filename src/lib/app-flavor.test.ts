import { describe, expect, it } from "vitest";
import { FLAVOR_START_ROUTE, PASS_APP_ID, parseAppFlavor, resolveAppFlavor } from "./app-flavor";

describe("parseAppFlavor", () => {
  it("accepts the two known flavors", () => {
    expect(parseAppFlavor("airpal")).toBe("airpal");
    expect(parseAppFlavor("pass")).toBe("pass");
  });

  it("rejects unknown, empty, and non-string values", () => {
    expect(parseAppFlavor("PASS")).toBeNull();
    expect(parseAppFlavor("")).toBeNull();
    expect(parseAppFlavor(undefined)).toBeNull();
    expect(parseAppFlavor(null)).toBeNull();
    expect(parseAppFlavor(42)).toBeNull();
  });
});

describe("resolveAppFlavor", () => {
  it("lets the env override win everywhere", () => {
    expect(resolveAppFlavor({ envFlavor: "pass", platform: "web", appId: null })).toBe("pass");
    expect(resolveAppFlavor({ envFlavor: "airpal", platform: "ios", appId: PASS_APP_ID })).toBe("airpal");
  });

  it("resolves native shells from their app id", () => {
    expect(resolveAppFlavor({ envFlavor: null, platform: "ios", appId: PASS_APP_ID })).toBe("pass");
    expect(resolveAppFlavor({ envFlavor: null, platform: "android", appId: PASS_APP_ID })).toBe("pass");
    expect(resolveAppFlavor({ envFlavor: null, platform: "ios", appId: "me.airpal.app" })).toBe("airpal");
  });

  it("defaults web and unknown shells to the full airpal app", () => {
    expect(resolveAppFlavor({ envFlavor: null, platform: "web", appId: null })).toBe("airpal");
    expect(resolveAppFlavor({ envFlavor: null, platform: "android", appId: null })).toBe("airpal");
    expect(resolveAppFlavor({ envFlavor: null, platform: "android", appId: "com.example.other" })).toBe("airpal");
  });
});

describe("FLAVOR_START_ROUTE", () => {
  it("starts Pass on /pass and AirPal on /", () => {
    expect(FLAVOR_START_ROUTE.pass).toBe("/pass");
    expect(FLAVOR_START_ROUTE.airpal).toBe("/");
  });
});
