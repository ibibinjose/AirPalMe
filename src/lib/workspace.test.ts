import { describe, expect, it } from "vitest";
import { isWorkspacePath } from "./workspace";

describe("isWorkspacePath", () => {
  it("gives the Pulse hub full chrome but keeps public rating links minimal", () => {
    expect(isWorkspacePath("/pulse")).toBe(false);
    expect(isWorkspacePath("/pulse/abc123")).toBe(true);
  });

  it("keeps workspace chrome on host, admin, legal, and account routes", () => {
    for (const path of [
      "/host",
      "/host/pulse",
      "/admin",
      "/partners",
      "/business",
      "/settings",
      "/about",
      "/privacy",
      "/bio/setup",
    ]) {
      expect(isWorkspacePath(path)).toBe(true);
    }
  });

  it("keeps full chrome on consumer routes", () => {
    for (const path of [
      "/",
      "/explore",
      "/mate",
      "/plan",
      "/inbox",
      "/stay",
      "/concierge",
      "/g/hotel",
      "/calendar",
      "/offers",
    ]) {
      expect(isWorkspacePath(path)).toBe(false);
    }
  });
});
