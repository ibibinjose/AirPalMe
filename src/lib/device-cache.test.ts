import { describe, expect, it } from "vitest";
import { clearDeviceCache } from "./device-cache";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
  };
}

if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage.getItem) {
  (globalThis as Record<string, unknown>).localStorage = memoryStorage();
}

describe("clearDeviceCache", () => {
  it("removes user data but keeps device prefs", () => {
    localStorage.setItem("airpal.plans.v3", "[]");
    localStorage.setItem("airpal:memories:v1", "[]");
    localStorage.setItem("airpal.anon.id", "anon-1");
    localStorage.setItem("airpal.door.v1", "explore");
    localStorage.setItem("airpal.analytics.consent", "yes");
    localStorage.setItem("unrelated", "keep");

    clearDeviceCache();

    expect(localStorage.getItem("airpal.plans.v3")).toBeNull();
    expect(localStorage.getItem("airpal:memories:v1")).toBeNull();
    expect(localStorage.getItem("airpal.anon.id")).toBeNull();
    expect(localStorage.getItem("airpal.door.v1")).toBe("explore");
    expect(localStorage.getItem("airpal.analytics.consent")).toBe("yes");
    expect(localStorage.getItem("unrelated")).toBe("keep");
    localStorage.clear();
  });
});
