import { describe, expect, it } from "vitest";
import {
  findInstitutionByCode,
  findInstitutionById,
  getBelongingReportData,
} from "./cohort";

describe("cohort domain model", () => {
  it("locates institution by uppercase and lowercase code", () => {
    const scape = findInstitutionByCode("SCAPE26");
    expect(scape).toBeDefined();
    expect(scape?.name).toBe("Scape Darling Square");

    const stpauls = findInstitutionByCode("stpauls");
    expect(stpauls).toBeDefined();
    expect(stpauls?.id).toBe("st-pauls-usyd");
  });

  it("returns undefined for unknown cohort codes", () => {
    expect(findInstitutionByCode("UNKNOWN123")).toBeUndefined();
    expect(findInstitutionByCode("")).toBeUndefined();
  });

  it("finds institution by id", () => {
    const gen = findInstitutionById("generator-sydney");
    expect(gen).toBeDefined();
    expect(gen?.type).toBe("hostel");
  });

  it("generates belonging metrics for institution reporting", () => {
    const report = getBelongingReportData("scape-darling-square");
    expect(report.institutionId).toBe("scape-darling-square");
    expect(report.activated30DayPercent).toBeGreaterThan(50);
    expect(report.safetyIncidents).toBe(0);
    expect(report.hostedEventAttendanceRate).toBeGreaterThan(80);
  });
});
