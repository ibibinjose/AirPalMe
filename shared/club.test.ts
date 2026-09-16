import { describe, expect, it } from "vitest";
import { inviteMailto, isEmail, normalizeEmail } from "./club";

describe("club email", () => {
  it("normalizes and validates", () => {
    expect(normalizeEmail("  A@B.COM ")).toBe("a@b.com");
    expect(isEmail("a@b.com")).toBe(true);
    expect(isEmail("nope")).toBe(false);
  });

  it("builds a mailto with bcc", () => {
    const href = inviteMailto(["one@x.com", "two@x.com"], "Tonight", "You're in.");
    expect(href.startsWith("mailto:one%40x.com?")).toBe(true);
    expect(href).toContain("bcc=two%40x.com");
    expect(href).toContain("Tonight");
  });
});
