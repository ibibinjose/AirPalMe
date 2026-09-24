import { beforeEach, describe, expect, it } from "vitest";
import {
  fetchProperty,
  getCachedProperty,
  normalizeProperty,
  saveCachedProperty,
  subscribeProperty,
  unknownProperty,
  updatePropertyWifi,
} from "./properties";
import { buildHostProperty } from "@shared/host-property";
import { askLocal } from "./ask";

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

if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage.clear) {
  Object.defineProperty(globalThis, "localStorage", {
    value: mockStorage,
    writable: true,
  });
}

describe("properties store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns a generic unknown-property placeholder instead of seed content", async () => {
    const p = await fetchProperty("no-such-place-xyz");
    expect(p.id).toBe("no-such-place-xyz");
    expect(p.name).toBe("");
    expect(p.wifi.password).toBe("");
    expect(p.address).toBe("");
    expect(getCachedProperty("harbour-hotel")).toBeUndefined();
    expect(getCachedProperty("harbour-college")).toBeUndefined();
  });

  it("falls back to known Harbour demo seeds only — not arbitrary fakes", async () => {
    const p = await fetchProperty("harbour-hotel");
    expect(p.id).toBe("harbour-hotel");
    expect(p.name).toMatch(/Harbour/);
    expect(p.wifi.password).toBe("");
    expect(p.roomTokens?.["tok-101-demo"]).toBe("101");
    expect(getCachedProperty("harbour-hotel")?.id).toBe("harbour-hotel");

    const unknown = await fetchProperty("made-up-hotel-xyz");
    expect(unknown.name).toBe("");
    expect(getCachedProperty("made-up-hotel-xyz")).toBeUndefined();
  });

  it("unknownProperty carries no venue facts", () => {
    const p = unknownProperty("xyz");
    expect(p.id).toBe("xyz");
    expect(p.name).toBe("");
    expect(p.city).toBe("");
    expect(p.phone).toBe("");
    expect(p.facilities).toEqual([]);
  });

  it("caches and retrieves a custom host property", async () => {
    const custom = buildHostProperty({
      propertyName: "Bondi Beach Inn",
      ownerEmail: "host@bondi.com",
      kind: "hotel",
      city: "Bondi",
      wifiNetwork: "Bondi_Guest",
      wifiPassword: "bondisecret123",
      id: "prop_bondi_123",
    });

    saveCachedProperty(custom);
    const cached = getCachedProperty("prop_bondi_123");
    expect(cached).toBeDefined();
    expect(cached?.name).toBe("Bondi Beach Inn");
    expect(cached?.city).toBe("Bondi");
    expect(cached?.wifi.network).toBe("Bondi_Guest");

    const fetched = await fetchProperty("prop_bondi_123");
    expect(fetched.name).toBe("Bondi Beach Inn");
    expect(fetched.id).toBe("prop_bondi_123");
  });

  it("subscribes to property updates", async () => {
    const custom = buildHostProperty({
      propertyName: "Melbourne Lane Hotel",
      ownerEmail: "host@melb.com",
      city: "Melbourne",
      id: "prop_melb_1",
    });
    saveCachedProperty(custom);

    let observedName = "";
    const unsub = subscribeProperty("prop_melb_1", (p) => {
      observedName = p.name;
    });

    expect(observedName).toBe("Melbourne Lane Hotel");

    saveCachedProperty({ ...custom, name: "Melbourne Grand Hotel" });
    expect(observedName).toBe("Melbourne Grand Hotel");

    unsub();
  });

  it("updates property Wi-Fi and persists locally", async () => {
    const prop = buildHostProperty({
      propertyName: "Surry Hills Venue",
      ownerEmail: "venue@surry.com",
      id: "prop_surry_1",
      wifiNetwork: "Old_Net",
      wifiPassword: "old_password",
    });
    saveCachedProperty(prop);

    try {
      await updatePropertyWifi({
        propertyId: "prop_surry_1",
        network: "SurryHills_SuperFast",
        password: "new_secure_password_99",
        speed: "100 Mbps",
      });
    } catch {
      /* remote may be unavailable in unit tests; local cache must still update */
    }

    const updated = getCachedProperty("prop_surry_1");
    expect(updated?.wifi.network).toBe("SurryHills_SuperFast");
    expect(updated?.wifi.password).toBe("new_secure_password_99");
    expect(updated?.wifi.speed).toBe("100 Mbps");
  });

  it("normalizes raw property records correctly", () => {
    const raw = {
      name: "Coogee Bay Retreat",
      kind: "venue",
      city: "Coogee",
      wifi: { network: "Coogee_Wifi", password: "secret_coogee" },
      checkIn: "3:00 PM",
      checkOut: "11:00 AM",
      roomTokens: { tok1: "101", tok2: "102" },
      lobbyMarkerId: "marker_coogee_lobby",
    };

    const norm = normalizeProperty("prop_coogee", raw);
    expect(norm.id).toBe("prop_coogee");
    expect(norm.name).toBe("Coogee Bay Retreat");
    expect(norm.kind).toBe("venue");
    expect(norm.city).toBe("Coogee");
    expect(norm.wifi.network).toBe("Coogee_Wifi");
    expect(norm.wifi.password).toBe("secret_coogee");
    expect(norm.roomTokens?.tok1).toBe("101");
    expect(norm.lobbyMarkerId).toBe("marker_coogee_lobby");
  });

  it("reads wifi and hours freshness stamps from the property doc", () => {
    const norm = normalizeProperty("harbour-hotel", {
      name: "Harbour Hotel Sydney",
      wifiUpdatedAt: "2026-09-15T08:00:00.000Z",
      hoursVerifiedAt: "2026-09-14T08:00:00.000Z",
      wifi: { network: "HarbourHotel_Guest", password: "" },
    });
    expect(norm.wifiUpdatedAt).toBe("2026-09-15T08:00:00.000Z");
    expect(norm.hoursVerifiedAt).toBe("2026-09-14T08:00:00.000Z");
    expect(norm.wifi.password).toBe("");
  });

  it("askLocal uses custom property info when supplied in context", () => {
    const custom = buildHostProperty({
      propertyName: "Byron Bay Villa",
      ownerEmail: "host@byron.com",
      id: "prop_byron",
      wifiNetwork: "Byron_Waves",
      wifiPassword: "saltwaterbreeze",
      checkIn: "3:00 PM",
      checkOut: "11:00 AM",
    });

    const wifiAns = askLocal("what is the wifi", { property: custom });
    expect(wifiAns.title).toBe("Wi-Fi");
    expect(wifiAns.body).toContain("Byron_Waves");
    expect(wifiAns.body).toContain("saltwaterbreeze");

    const checkoutAns = askLocal("when is checkout", { property: custom });
    expect(checkoutAns.title).toBe("Checkout");
    expect(checkoutAns.body).toBe("11:00 AM");

    const generalAns = askLocal("hello", { property: custom });
    expect(generalAns.title).toBe("Byron Bay Villa");
  });
});
