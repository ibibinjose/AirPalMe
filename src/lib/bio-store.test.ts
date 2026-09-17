import { describe, expect, it } from "vitest";
import { mergeProfiles } from "./bio-store";
import type { BioProfile } from "@shared/bio";

function profile(id: string, updatedAt?: string): BioProfile {
  return {
    id,
    handle: `h-${id}`,
    name: `Name ${id}`,
    shortWhy: "",
    city: "",
    category: "services",
    hours: "",
    openNow: true,
    products: [],
    services: [],
    deals: [],
    links: [],
    updatedAt,
  } as BioProfile;
}

describe("mergeProfiles", () => {
  it("unions by id with newer writes winning", () => {
    const local = [profile("a", "2026-01-02T00:00:00.000Z"), profile("b")];
    const remote = [
      { ...profile("a", "2026-01-01T00:00:00.000Z"), name: "Stale" },
      profile("c", "2026-01-03T00:00:00.000Z"),
    ];
    const merged = mergeProfiles(local, remote);
    expect(merged.map((p) => p.id).sort()).toEqual(["a", "b", "c"]);
    expect(merged.find((p) => p.id === "a")?.name).toBe("Name a");
  });

  it("lets a newer remote overwrite local", () => {
    const merged = mergeProfiles([profile("a")], [{ ...profile("a", "2026-05-01T00:00:00.000Z"), name: "Cloud" }]);
    expect(merged.find((p) => p.id === "a")?.name).toBe("Cloud");
  });
});
