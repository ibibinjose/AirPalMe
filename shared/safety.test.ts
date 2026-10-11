import { describe, expect, it } from "vitest";
import {
  blockDocId,
  emptyReport,
  isEmergencyReason,
  isReportReason,
  reportValid,
  slaAgeLabel,
  slaDeadlineHours,
  slaState,
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
    expect(sorted.slice(1).map((r) => r.createdAt)).toEqual(["2026-09-21T11:00:00.000Z", "2026-09-21T10:00:00.000Z"]);
    expect(isEmergencyReason("emergency")).toBe(true);
    expect(isEmergencyReason("harassment")).toBe(false);
  });
});

describe("safety case SLAs", () => {
  const NOW = Date.parse("2026-09-21T12:00:00.000Z");
  const hoursAgo = (h: number) => new Date(NOW - h * 3600_000).toISOString();

  it("gives emergencies 4 hours and everything else 24", () => {
    expect(slaDeadlineHours("emergency")).toBe(4);
    expect(slaDeadlineHours("harassment")).toBe(24);
    expect(slaDeadlineHours("mystery")).toBe(24);
  });

  it("flags overdue new cases and clears handled ones", () => {
    expect(slaState({ reason: "emergency", status: "new", createdAt: hoursAgo(5) }, NOW)).toBe("overdue");
    expect(slaState({ reason: "emergency", status: "new", createdAt: hoursAgo(2) }, NOW)).toBe("due");
    expect(slaState({ reason: "harassment", status: "new", createdAt: hoursAgo(25) }, NOW)).toBe("overdue");
    expect(slaState({ reason: "harassment", status: "new", createdAt: hoursAgo(2) }, NOW)).toBe("due");
    expect(slaState({ reason: "emergency", status: "reviewed", createdAt: hoursAgo(50) }, NOW)).toBe("ok");
    expect(slaState({ reason: "emergency", status: "actioned", createdAt: hoursAgo(50) }, NOW)).toBe("ok");
    expect(slaState({ reason: "emergency", status: "new", createdAt: "junk" }, NOW)).toBe("due");
  });

  it("labels case age compactly", () => {
    expect(slaAgeLabel(new Date(NOW - 12 * 60_000).toISOString(), NOW)).toBe("12m");
    expect(slaAgeLabel(new Date(NOW - 3 * 3600_000).toISOString(), NOW)).toBe("3h");
    expect(slaAgeLabel(new Date(NOW - 30 * 3600_000).toISOString(), NOW)).toBe("1d");
    expect(slaAgeLabel("junk", NOW)).toBe("—");
  });
});
