import { describe, expect, it } from "vitest";
import { safeLocalStorage, safeSessionStorage } from "./safe-storage";

describe("safe storage accessors", () => {
  it("returns null when web storage is unavailable", () => {
    const g = globalThis as Record<string, unknown>;
    const prevLocal = g.localStorage;
    const prevSession = g.sessionStorage;
    delete g.localStorage;
    delete g.sessionStorage;
    try {
      expect(safeLocalStorage()).toBeNull();
      expect(safeSessionStorage()).toBeNull();
    } finally {
      if (prevLocal !== undefined) g.localStorage = prevLocal;
      if (prevSession !== undefined) g.sessionStorage = prevSession;
    }
  });

  it("returns the live storages when present", () => {
    const local = { fake: "local" } as unknown as Storage;
    const session = { fake: "session" } as unknown as Storage;
    (globalThis as Record<string, unknown>).localStorage = local;
    (globalThis as Record<string, unknown>).sessionStorage = session;
    try {
      expect(safeLocalStorage()).toBe(local);
      expect(safeSessionStorage()).toBe(session);
    } finally {
      delete (globalThis as Record<string, unknown>).localStorage;
      delete (globalThis as Record<string, unknown>).sessionStorage;
    }
  });
});
