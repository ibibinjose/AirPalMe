import { describe, expect, it } from "vitest";
import { hashPin, verifyPin } from "./pin";

describe("hashPin", () => {
  it("never stores the raw PIN and verifies only the matching code", () => {
    const stored = hashPin("482910");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(stored.includes("482910")).toBe(false);
    expect(verifyPin("482910", stored)).toBe(true);
    expect(verifyPin("1234", stored)).toBe(false);
    expect(verifyPin("482910", "plaintext")).toBe(false);
  });

  it("rejects malformed PINs", () => {
    expect(() => hashPin("12")).toThrow();
    expect(() => hashPin("pin!")).toThrow();
  });
});
