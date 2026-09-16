import { describe, expect, it } from "vitest";
import { formatPhoneDisplay, isOtp, normalizeOtp, phoneReady, toE164 } from "./phone-auth";
import { authErrorMessage } from "./auth-email";

describe("phone login helpers", () => {
  it("normalizes composed AU numbers to E.164", () => {
    expect(toE164("+61 412345678")).toBe("+61412345678");
    expect(toE164("00 61 412 345 678")).toBe("+61412345678");
    expect(phoneReady("+61 412345678")).toBe(true);
    expect(phoneReady("0412 345 678")).toBe(false);
    expect(formatPhoneDisplay("+61412345678")).toBe("+61 412345678");
  });

  it("accepts a 6-digit SMS code", () => {
    expect(isOtp("123456")).toBe(true);
    expect(isOtp("12 34 56")).toBe(true);
    expect(isOtp("12345")).toBe(false);
    expect(normalizeOtp("12a3456")).toBe("123456");
  });
});

describe("phone auth errors", () => {
  it("maps SMS and code failures to short copy", () => {
    expect(authErrorMessage({ code: "auth/invalid-phone-number" })).toMatch(/mobile/i);
    expect(authErrorMessage({ code: "auth/invalid-verification-code" })).toMatch(/code/i);
    expect(authErrorMessage({ code: "auth/code-expired" })).toMatch(/expired/i);
    expect(authErrorMessage({ code: "auth/too-many-requests" })).toMatch(/minute/i);
  });
});
