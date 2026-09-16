import { describe, expect, it } from "vitest";
import { isEmail, normalizeEmail, passwordIssues, passwordOk, PASSWORD_RULES } from "./validate";

describe("email validation", () => {
  it("accepts normal and plus-tagged addresses", () => {
    expect(isEmail("user@example.com")).toBe(true);
    expect(isEmail("host+test@airpal.me")).toBe(true);
    expect(isEmail("  USER@Example.COM  ")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(isEmail("")).toBe(false);
    expect(isEmail("invalid-email")).toBe(false);
    expect(isEmail("@domain.com")).toBe(false);
    expect(isEmail("user@")).toBe(false);
    expect(isEmail("user@domain")).toBe(false);
    expect(isEmail("user..dots@example.com")).toBe(false);
    expect(isEmail(".leading@example.com")).toBe(false);
    expect(isEmail("trailing.@example.com")).toBe(false);
    expect(isEmail("user @example.com")).toBe(false);
    expect(isEmail(`a@${"b".repeat(250)}.com`)).toBe(false);
  });

  it("normalizes case and whitespace", () => {
    expect(normalizeEmail("  Host@AirPal.ME ")).toBe("host@airpal.me");
  });
});

describe("password validation", () => {
  it("accepts 8+ chars with a letter and a number", () => {
    expect(passwordOk("securePass123!")).toBe(true);
    expect(passwordOk("sydneylight1")).toBe(true);
  });

  it("rejects weak passwords with specific missing rules", () => {
    expect(passwordIssues("short")).toEqual(["length", "number"]);
    expect(passwordIssues("12345678")).toEqual(["letter"]);
    expect(passwordIssues("passwordonly")).toEqual(["number"]);
    expect(passwordIssues("")).toEqual(["length", "letter", "number"]);
    expect(passwordOk("short")).toBe(false);
    expect(passwordOk("12345678")).toBe(false);
  });

  it("keeps rule labels in sync with rule ids", () => {
    expect(PASSWORD_RULES.map((r) => r.id).sort()).toEqual(["length", "letter", "number"]);
  });
});
