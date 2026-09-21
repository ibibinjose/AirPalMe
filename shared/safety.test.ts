import { describe, expect, it } from "vitest";
import {
  blockDocId,
  emptyReport,
  isEmergencyReason,
  isReportReason,
  reportValid,
  sortSafetyCasesEmergenciesFirst,
} from "./safety";

describe("safety reports", () => {
  it("accepts a detailed report", () => {
    expect(
      reportValid({
        ...emptyReport("plan-1", "uid-2"),
        reason: "no-show",
        details: "They never arrived at the station.",
      }),
    ).toBe(true);
  });

  it("rejects thin or malformed reports", () => {
    expect(reportValid({ ...emptyReport("plan-1", ""), details: "They never arrived at all." })).toBe(false);
    expect(reportValid({ ...emptyReport("plan-1", "uid-2"), details: "bad" })).toBe(false);
    expect(isReportReason("spam")).toBe(false);
  });

  it("builds stable block doc ids", () => {
    expect(blockDocId("a", "b")).toBe("a_b");
    expect(blockDocId("a", "b")).not.toBe(blockDocId("b", "a"));
  });

  it("sorts emergency cases before newer non-emergency cases", () => {
    const rows = [
      { reason: "harassment", createdAt: "2026-09-21T10:00:00.000Z" },
      { reason: "emergency", createdAt: "2026-09-20T10:00:00.000Z" },
      { reason: "no-show", createdAt: "2026-09-21T11:00:00.000Z" },
    ];
    const sorted = sortSafetyCasesEmergenciesFirst(rows);
    expect(sorted[0].reason).toBe("emergency");
    expect(sorted.slice(1).map((r) => r.createdAt)).toEqual([
      "2026-09-21T11:00:00.000Z",
      "2026-09-21T10:00:00.000Z",
    ]);
    expect(isEmergencyReason("emergency")).toBe(true);
    expect(isEmergencyReason("harassment")).toBe(false);
  });
});
