import { beforeEach, describe, expect, it, vi } from "vitest";

const getDoc = vi.fn();
const getDocs = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  collection: vi.fn(() => ({})),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(() => () => undefined),
  getDoc: (...args: unknown[]) => getDoc(...args),
  getDocs: (...args: unknown[]) => getDocs(...args),
}));

vi.mock("firebase/functions", () => ({ httpsCallable: vi.fn() }));

vi.mock("./firebase", () => ({
  getFirebaseDb: () => ({}),
  getFirebaseFunctions: () => null,
}));

import { fetchWaveByCode, fetchWaveHere } from "./wave";
import { fetchHereAt, fetchMyHerePin } from "./here";

const denied = Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });

describe("Wave / Here reads fail soft", () => {
  beforeEach(() => {
    getDoc.mockReset().mockRejectedValue(denied);
    getDocs.mockReset().mockRejectedValue(denied);
  });

  it("fetchWaveByCode resolves null instead of throwing on permission errors", async () => {
    await expect(fetchWaveByCode("ABC123")).resolves.toBeNull();
  });

  it("fetchWaveHere resolves null instead of throwing", async () => {
    await expect(fetchWaveHere("place-key")).resolves.toBeNull();
  });

  it("fetchMyHerePin resolves null instead of throwing", async () => {
    await expect(fetchMyHerePin("maya")).resolves.toBeNull();
  });

  it("fetchHereAt resolves an empty list instead of throwing", async () => {
    await expect(fetchHereAt("place-key")).resolves.toEqual([]);
  });
});
