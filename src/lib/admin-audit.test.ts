import { describe, expect, it } from "vitest";
import { buildAuditEntry } from "./admin-audit";

describe("admin audit", () => {
  it("builds a complete entry with defaults", () => {
    const e = buildAuditEntry({
      actorUid: "admin-1",
      action: "status",
      collection: "mate_requests",
      docId: "r1",
      from: "open",
      to: "matched",
    });
    expect(e.actorUid).toBe("admin-1");
    expect(e.from).toBe("open");
    expect(e.to).toBe("matched");
    expect(e.note).toBe("");
    expect(e.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("truncates long notes", () => {
    const e = buildAuditEntry({
      actorUid: "a",
      action: "x",
      collection: "c",
      docId: "d",
      note: "n".repeat(600),
    });
    expect(e.note.length).toBe(500);
  });
});
