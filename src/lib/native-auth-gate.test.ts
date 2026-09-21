import { describe, expect, it } from "vitest";
import { isNativeAuthPublicPath } from "./native-auth-gate";

describe("isNativeAuthPublicPath", () => {
  it("allows sign-in, legal, and auth-action routes", () => {
    expect(isNativeAuthPublicPath("/start")).toBe(true);
    expect(isNativeAuthPublicPath("/start?tab=signup")).toBe(true);
    expect(isNativeAuthPublicPath("/privacy")).toBe(true);
    expect(isNativeAuthPublicPath("/terms")).toBe(true);
    expect(isNativeAuthPublicPath("/auth/action")).toBe(true);
  });

  it("requires an account for home and product doors", () => {
    expect(isNativeAuthPublicPath("/")).toBe(false);
    expect(isNativeAuthPublicPath("/plan")).toBe(false);
    expect(isNativeAuthPublicPath("/concierge")).toBe(false);
    expect(isNativeAuthPublicPath("/circle")).toBe(false);
  });
});
