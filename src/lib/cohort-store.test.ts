import { describe, expect, it, beforeEach } from "vitest";
import {
  clearStoredCohortCode,
  getActiveCohortExperiences,
  getActiveInstitutionFromStorage,
  getStoredCohortCode,
  saveStoredCohortCode,
  validateCohortJoin,
} from "./cohort-store";

const memoryStorage: Record<string, string> = {};
if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage?.getItem) {
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

describe("cohort-store helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and retrieves active cohort code", () => {
    expect(getStoredCohortCode()).toBeNull();
    saveStoredCohortCode("scape26");
    expect(getStoredCohortCode()).toBe("SCAPE26");
    expect(getActiveInstitutionFromStorage()?.name).toBe("Scape Darling Square");

    clearStoredCohortCode();
    expect(getStoredCohortCode()).toBeNull();
    expect(getActiveInstitutionFromStorage()).toBeNull();
  });

  it("validates cohort join codes correctly", () => {
    const invalidEmpty = validateCohortJoin("");
    expect(invalidEmpty.success).toBe(false);

    const invalidCode = validateCohortJoin("XYZ999");
    expect(invalidCode.success).toBe(false);
    expect(invalidCode.error).toBeDefined();

    const validCode = validateCohortJoin("STPAULS");
    expect(validCode.success).toBe(true);
    expect(validCode.institution?.id).toBe("st-pauls-usyd");
  });

  it("retrieves hosted experiences for active cohort institution", () => {
    const experiences = getActiveCohortExperiences("scape-darling-square");
    expect(experiences.length).toBeGreaterThan(0);
    expect(experiences[0].institutionId).toBe("scape-darling-square");

    expect(getActiveCohortExperiences(null)).toEqual([]);
  });
});
