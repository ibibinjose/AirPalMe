import { describe, expect, it } from "vitest";
import {
  checkTimeConflict,
  hasCatchUpReminder,
  listCatchUpsForHandle,
  recordCatchUpInterest,
  toggleCatchUpReminder,
} from "./catchup";

describe("catch-up proposals", () => {
  it("records a 1-on-1 coffee against a handle", () => {
    const item = recordCatchUpInterest({
      targetHandle: "xyz",
      requesterName: "Sam",
      requesterUid: "u1",
      type: "catchup",
      date: "2026-09-20",
      time: "14:00",
      venue: "The Rocks",
    });
    expect(item.targetHandle).toBe("xyz");
    expect(item.type).toBe("catchup");
    expect(listCatchUpsForHandle("xyz").some((r) => r.id === item.id)).toBe(true);
    // Interest is not a reminder-only toggle
    expect(hasCatchUpReminder("xyz")).toBe(false);
  });

  it("toggles a reminder for a handle", () => {
    const on = toggleCatchUpReminder({ handle: "xyz-rem", name: "Xyz" });
    expect(on).toBe(true);
    expect(hasCatchUpReminder("xyz-rem")).toBe(true);
    const off = toggleCatchUpReminder({ handle: "xyz-rem", name: "Xyz" });
    expect(off).toBe(false);
    expect(hasCatchUpReminder("xyz-rem")).toBe(false);
  });
});

describe("checkTimeConflict", () => {
  it("flags a plan within 60 minutes on the same date", () => {
    const result = checkTimeConflict(
      "2026-09-25",
      "14:00",
      [{ date: "2026-09-25", time: "14:30", title: "Coffee with Sam", type: "Plan" }],
      [],
    );
    expect(result.hasConflict).toBe(true);
    expect(result.conflictingTitle).toBe("Coffee with Sam");
    expect(result.conflictingTime).toBe("14:30");
  });

  it("allows a slot an hour or more away", () => {
    const result = checkTimeConflict(
      "2026-09-25",
      "14:00",
      [{ date: "2026-09-25", time: "16:00", title: "Later plan", type: "Plan" }],
      [],
    );
    expect(result.hasConflict).toBe(false);
  });
});
