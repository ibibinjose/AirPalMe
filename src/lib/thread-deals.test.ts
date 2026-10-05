import { beforeEach, describe, expect, it } from "vitest";
import { claimThreadDeal, loadThreadDealClaim, threadDealForStop, threadDealId } from "./thread-deals";

// In-memory localStorage mock for node test environment
const memoryStorage: Record<string, string> = {};
if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage.getItem) {
  globalThis.localStorage = {
    getItem: (key: string) => memoryStorage[key] ?? null,
    setItem: (key: string, value: string) => {
      memoryStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete memoryStorage[key];
    },
    clear: () => {
      for (const k in memoryStorage) delete memoryStorage[k];
    },
    length: 0,
    key: () => null,
  } as unknown as Storage;
}

const DEAL = { badge: "15% off", detail: "Show this code at the bar", expiry: undefined, claimHint: "Show code" };

describe("threadDealForStop", () => {
  const lookup = (id: string) =>
    id === "p1" ? { handle: "harbourbar", deal: DEAL } : id === "p2" ? { handle: "nodeal" } : undefined;

  it("resolves the venue deal for a stop with a place", () => {
    expect(threadDealForStop({ placeId: "p1" }, lookup)).toEqual({
      handle: "harbourbar",
      dealId: "listing:p1",
      badge: "15% off",
      detail: "Show this code at the bar",
      expiry: undefined,
      claimHint: "Show code",
    });
  });

  it("returns null without a place, venue, or deal", () => {
    expect(threadDealForStop({}, lookup)).toBeNull();
    expect(threadDealForStop({ placeId: "missing" }, lookup)).toBeNull();
    expect(threadDealForStop({ placeId: "p2" }, lookup)).toBeNull();
    expect(threadDealForStop({ placeId: "p1" }, () => ({ deal: DEAL }))).toBeNull();
  });

  it("builds stable claim keys per place", () => {
    expect(threadDealId("p1")).toBe("listing:p1");
  });
});

describe("thread deal claims", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("claims a show-code and reads it back in the thread", () => {
    const deal = { handle: "harbourbar", dealId: "listing:p1", badge: "15% off", detail: "Show code" };
    expect(loadThreadDealClaim(deal)).toBeUndefined();
    const nowMs = Date.now();
    const claim = claimThreadDeal(deal, nowMs);
    expect(claim.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(claim.expiresAt).toBe(new Date(nowMs + 24 * 60 * 60 * 1000).toISOString());
    expect(loadThreadDealClaim(deal)?.code).toBe(claim.code);
  });

  it("honors an earlier deal expiry over the 24h default", () => {
    const nowMs = Date.now();
    const deal = {
      handle: "harbourbar",
      dealId: "listing:p1",
      badge: "15% off",
      detail: "Show code",
      expiry: new Date(nowMs + 6 * 60 * 60 * 1000).toISOString(),
    };
    const claim = claimThreadDeal(deal, nowMs);
    expect(claim.expiresAt).toBe(deal.expiry);
  });
});
