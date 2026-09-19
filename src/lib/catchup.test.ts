import { describe, expect, it } from "vitest";
import { hasCatchUpReminder, listCatchUpsForHandle, recordCatchUpInterest, toggleCatchUpReminder } from "./catchup";

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
  });

  it("toggles a reminder for a handle", () => {
    const on = toggleCatchUpReminder({ handle: "xyz-rem", name: "Xyz" });
    expect(on).toBe(true);
    expect(hasCatchUpReminder("xyz-rem")).toBe(true);
    const off = toggleCatchUpReminder({ handle: "xyz-rem", name: "Xyz" });
    expect(off).toBe(false);
  });
});
