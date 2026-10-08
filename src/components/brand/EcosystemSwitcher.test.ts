import { describe, expect, it } from "vitest";
import { getEcosystemMode } from "./EcosystemSwitcher";

describe("getEcosystemMode", () => {
  it("classifies personal life and companion routes as 'me'", () => {
    expect(getEcosystemMode("/")).toBe("me");
    expect(getEcosystemMode("/now")).toBe("me");
    expect(getEcosystemMode("/plan")).toBe("me");
    expect(getEcosystemMode("/calendar")).toBe("me");
    expect(getEcosystemMode("/me")).toBe("me");
    expect(getEcosystemMode("/@maya")).toBe("me");
    expect(getEcosystemMode("/bio/setup")).toBe("me");
    expect(getEcosystemMode("/me/memories")).toBe("me");
  });

  it("classifies experience, ticketing, deal, and pass routes as 'pass'", () => {
    expect(getEcosystemMode("/pass")).toBe("pass");
    expect(getEcosystemMode("/events")).toBe("pass");
    expect(getEcosystemMode("/e/sydney-fest-2026")).toBe("pass");
    expect(getEcosystemMode("/deals")).toBe("pass");
    expect(getEcosystemMode("/me/tickets")).toBe("pass");
    expect(getEcosystemMode("/ticket/xyz123")).toBe("pass");
    expect(getEcosystemMode("/event")).toBe("pass");
    expect(getEcosystemMode("/scan")).toBe("pass");
  });
});
