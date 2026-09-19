import { describe, expect, it } from "vitest";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
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

// In-memory storage mocks for node test environment
if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage.getItem) {
  (globalThis as Record<string, unknown>).localStorage = memoryStorage();
}
if (typeof globalThis.sessionStorage === "undefined" || !globalThis.sessionStorage.getItem) {
  (globalThis as Record<string, unknown>).sessionStorage = memoryStorage();
}
import { clearPendingIntent, peekPendingIntent, savePendingIntent } from "./pending-intent";
import { loadSocialSet, persistSocialSet, toggleSocialId } from "./social-store";

describe("pending-intent", () => {
  it("round-trips a valid intent and clears it", () => {
    savePendingIntent({ kind: "like-event", id: "evt-1" });
    expect(peekPendingIntent()).toEqual({ kind: "like-event", id: "evt-1" });
    clearPendingIntent();
    expect(peekPendingIntent()).toBeNull();
  });

  it("rejects malformed payloads", () => {
    savePendingIntent({ kind: "follow-handle", id: "cafe" });
    sessionStorage.setItem("airpal:pending-intent:v1", '{"kind":"hack","id":"x"}');
    expect(peekPendingIntent()).toBeNull();
    sessionStorage.setItem("airpal:pending-intent:v1", "not json");
    expect(peekPendingIntent()).toBeNull();
    clearPendingIntent();
  });
});

describe("social-store", () => {
  it("toggles ids purely", () => {
    const { next, added } = toggleSocialId(new Set(["a"]), "b");
    expect(added).toBe(true);
    expect(next.has("b")).toBe(true);
    const back = toggleSocialId(next, "b");
    expect(back.added).toBe(false);
    expect(back.next.has("b")).toBe(false);
  });

  it("persists and reloads sets, ignoring junk", () => {
    persistSocialSet("follow", new Set(["cafe-sydney", "bar-1"]));
    expect(loadSocialSet("follow").has("cafe-sydney")).toBe(true);
    localStorage.setItem("airpal:social:like:v1", '[1,null,"ok"]');
    expect(loadSocialSet("like")).toEqual(new Set(["ok"]));
  });
});
