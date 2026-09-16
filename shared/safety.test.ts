import { describe, expect, it } from "vitest";
import { blockDocId, emptyReport, isReportReason, reportValid } from "./safety";

describe("safety reports", () => {
  it("accepts a detailed report", () => {
    expect(
      reportValid({ ...emptyReport("plan-1", "uid-2"), reason: "no-show", details: "They never arrived at the station." }),
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
});
