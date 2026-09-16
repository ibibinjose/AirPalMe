import { describe, expect, it } from "vitest";
import {
  addMemory,
  listMemories,
  memoriesWithPerson,
  removeMemory,
  updateMemory,
} from "./memories";
import { buildVCard, listPeople, removePerson, upsertPerson } from "./people";

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

if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage.getItem) {
  (globalThis as Record<string, unknown>).localStorage = memoryStorage();
}

describe("people", () => {
  it("upserts by handle and merges repeats", () => {
    localStorage.clear();
    const first = upsertPerson({ handle: "@Maya", name: "Maya", whereMet: "Bondi" });
    const second = upsertPerson({ handle: "maya", name: "Maya R.", photo: "idb:x" });
    expect(second.id).toBe(first.id);
    expect(listPeople()).toHaveLength(1);
    expect(listPeople()[0].name).toBe("Maya R.");
    expect(listPeople()[0].whereMet).toBe("Bondi");
    removePerson(first.id);
    expect(listPeople()).toHaveLength(0);
  });

  it("builds a parseable vCard", () => {
    const vcf = buildVCard({
      name: "Maya Rao",
      phone: "+91 98200 12345",
      url: "https://airpal.me/@maya",
      note: "Met at Bondi · AirPal",
    });
    expect(vcf).toContain("BEGIN:VCARD");
    expect(vcf).toContain("FN:Maya Rao");
    expect(vcf).toContain("TEL;TYPE=CELL:+91 98200 12345");
    expect(vcf).toContain("URL:https://airpal.me/@maya");
    expect(vcf).toContain("END:VCARD");
  });
});

describe("memories", () => {
  it("adds, updates, filters by person, and removes", () => {
    localStorage.clear();
    const a = addMemory({ src: "idb:1", caption: "Sunset", people: ["@maya", "Leo"], place: "Bondi" });
    addMemory({ src: "idb:2", people: [] });
    expect(listMemories()).toHaveLength(2);
    expect(memoriesWithPerson(listMemories(), "maya")).toHaveLength(1);
    const updated = updateMemory(a.id, { caption: "Sunset swim" });
    expect(updated?.caption).toBe("Sunset swim");
    removeMemory(a.id);
    expect(listMemories()).toHaveLength(1);
  });
});
