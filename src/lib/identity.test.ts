import { beforeEach, describe, expect, it } from "vitest";
import type { BioProfile } from "@shared/bio";
import { loadBios, persistBios } from "./bio-store";
import { syncBioToListing, syncListingToBio } from "./identity";
import { getCachedListings, hydrateListings } from "./listings";

const storageMap = new Map<string, string>();
const mockStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, val: string) => storageMap.set(key, String(val)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  get length() {
    return storageMap.size;
  },
  key: (i: number) => Array.from(storageMap.keys())[i] ?? null,
};

Object.defineProperty(globalThis, "localStorage", {
  value: mockStorage,
  writable: true,
  configurable: true,
});

function person(over: Partial<BioProfile> = {}): BioProfile {
  return {
    id: "bio-person",
    handle: "maya",
    kind: "person",
    name: "Maya",
    shortWhy: "On AirPal",
    city: "Sydney",
    category: "services",
    hours: "",
    openNow: true,
    products: [],
    services: [],
    deals: [],
    links: [],
    ...over,
  };
}

function business(over: Partial<BioProfile> = {}): BioProfile {
  return {
    id: "bio-biz",
    handle: "glenmore",
    kind: "business",
    name: "The Glenmore",
    shortWhy: "Pub on the hill",
    city: "Sydney",
    category: "eat",
    hours: "See venue",
    openNow: true,
    listingId: "list-glenmore",
    products: [],
    services: [],
    deals: [],
    links: [],
    ...over,
  };
}

beforeEach(() => {
  localStorage.clear();
  hydrateListings();
});

describe("identity listing sync", () => {
  it("does not copy a personal bio onto a directory listing", () => {
    persistBios([person()]);
    syncBioToListing(person());
    expect(getCachedListings()).toHaveLength(0);
  });

  it("does not overwrite a personal @handle when a listing is saved", () => {
    persistBios([person({ handle: "glenmore", listingId: "list-glenmore" })]);
    syncListingToBio({
      id: "list-glenmore",
      name: "Imported café",
      hours: "7am–3pm",
      shortWhy: "Coffee",
      handle: "glenmore",
    });
    expect(loadBios()[0]?.name).toBe("Maya");
    expect(loadBios()[0]?.kind).toBe("person");
  });

  it("updates the business bio and leaves the person bio alone", () => {
    persistBios([person({ listingId: "list-glenmore" }), business()]);
    syncListingToBio({
      id: "list-glenmore",
      name: "Imported café",
      hours: "7am–3pm",
      shortWhy: "Coffee",
      handle: "glenmore",
    });
    const rows = loadBios();
    expect(rows.find((row) => row.kind === "person")?.name).toBe("Maya");
    expect(rows.find((row) => row.kind === "business")?.name).toBe("Imported café");
    expect(rows.find((row) => row.kind === "business")?.hours).toBe("7am–3pm");
  });
});
