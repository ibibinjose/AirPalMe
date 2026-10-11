import { describe, expect, it } from "vitest";
import { mergeOwnedBios, profileFromDoc } from "./bio-store";
import type { BioProfile } from "@shared/bio";

function person(over: Partial<BioProfile> = {}): BioProfile {
  return {
    id: "bio-local",
    handle: "maya",
    kind: "person",
    ownerUid: "uid-1",
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

describe("mergeOwnedBios", () => {
  it("restores remote handles onto an empty browser", () => {
    const remote = [person({ id: "bio-remote", name: "Maya R" })];
    const merged = mergeOwnedBios([], remote, "uid-1");
    expect(merged).toHaveLength(1);
    expect(merged[0]?.handle).toBe("maya");
    expect(merged[0]?.id).toBe("bio-remote");
    expect(merged[0]?.name).toBe("Maya R");
  });

  it("keeps an unsynced local handle the remote does not have", () => {
    const local = [person({ handle: "maya" }), person({ id: "bio-shop", handle: "cafemaya", kind: "business" })];
    const remote = [person({ id: "bio-remote" })];
    const merged = mergeOwnedBios(local, remote, "uid-1");
    expect(merged.map((row) => row.handle).sort()).toEqual(["cafemaya", "maya"]);
  });

  it("keeps one profile when the handle was renamed locally", () => {
    const remote = [person({ id: "bio-1", handle: "oldname" })];
    const local = [person({ id: "bio-1", handle: "newname", name: "Maya" })];
    const merged = mergeOwnedBios(local, remote, "uid-1");
    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe("bio-1");
    expect(merged[0]?.handle).toBe("oldname");
    expect(merged[0]?.name).toBe("Maya");
  });

  it("does not drop a second account's cached bio", () => {
    const local = [person({ ownerUid: "uid-2", handle: "other" })];
    const remote = [person({ id: "bio-remote" })];
    const merged = mergeOwnedBios(local, remote, "uid-1");
    expect(merged.map((row) => row.handle).sort()).toEqual(["maya", "other"]);
  });
});

describe("profileFromDoc", () => {
  it("copies personal bio fields from Firestore", () => {
    const bio = profileFromDoc("p1", {
      handle: "Maya",
      kind: "person",
      ownerUid: "uid-1",
      name: "Maya",
      shortWhy: "Hi",
      city: "Sydney",
      category: "services",
      aboutText: "Designer",
      pronouns: "she/her",
      availabilityStatus: "available",
    });
    expect(bio.handle).toBe("maya");
    expect(bio.kind).toBe("person");
    expect(bio.aboutText).toBe("Designer");
    expect(bio.pronouns).toBe("she/her");
    expect(bio.availabilityStatus).toBe("available");
  });

  it("keeps a known Stars tier badge and drops forged ones", () => {
    expect(profileFromDoc("p1", { handle: "maya", starTier: "Rising Mate" }).starTier).toBe("Rising Mate");
    expect(profileFromDoc("p2", { handle: "leo", starTier: "City Emperor" }).starTier).toBeUndefined();
    expect(profileFromDoc("p3", { handle: "zoe" }).starTier).toBeUndefined();
  });
});
