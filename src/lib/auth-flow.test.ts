import { describe, expect, it } from "vitest";
import { isEmail, passwordOk } from "@shared/validate";
import { isOtp, normalizeOtp, phoneReady } from "@shared/phone-auth";
import { normalizeHandle, handleFromName, randomHexHandle } from "@shared/bio";

describe("auth validation & formatting", () => {
  it("validates emails strictly", () => {
    expect(isEmail("user@example.com")).toBe(true);
    expect(isEmail("host+test@airpal.me")).toBe(true);
    expect(isEmail("invalid-email")).toBe(false);
    expect(isEmail("")).toBe(false);
    expect(isEmail("@domain.com")).toBe(false);
  });

  it("enforces letter + number + 8 characters password rule", () => {
    expect(passwordOk("securePass123!")).toBe(true);
    expect(passwordOk("12345678")).toBe(false);
    expect(passwordOk("passwordonly")).toBe(false);
    expect(passwordOk("short")).toBe(false);
    expect(passwordOk("")).toBe(false);
  });

  it("normalizes and validates mobile phone numbers", () => {
    expect(phoneReady("+61412345678")).toBe(true);
    expect(phoneReady("+12025550123")).toBe(true);
    expect(phoneReady("12345")).toBe(false);
    expect(phoneReady("")).toBe(false);
  });

  it("validates and normalizes 6-digit OTP codes", () => {
    expect(normalizeOtp(" 123 456 ")).toBe("123456");
    expect(normalizeOtp("12-34-56")).toBe("123456");
    expect(isOtp("123456")).toBe(true);
    expect(isOtp("12345")).toBe(false);
    expect(isOtp("abcdef")).toBe(false);
  });

  it("handles @handle generation and normalization", () => {
    expect(handleFromName("The Rocks Café")).toBe("rockscaf");
    expect(normalizeHandle("@sydney_host")).toBe("sydney_host");
    expect(normalizeHandle(" Bondi Place ")).toBe("bondiplace");

    const hex = randomHexHandle(8);
    expect(hex).toHaveLength(8);
    expect(/^[0-9a-f]{8}$/.test(hex)).toBe(true);
  });
});
