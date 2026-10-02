import { describe, expect, it } from "vitest";
import {
  guestEntryIdForRsvp,
  guestEntryIdForTicket,
  guestEntryIsActive,
  guestEntryValid,
  summarizeGuestlist,
  type GuestEntry,
} from "./guestlist";

const base: GuestEntry = {
  name: "Ava",
  status: "going",
  partySize: 2,
  source: "rsvp",
  addedBy: "uid1",
  addedAt: "2026-10-02T00:00:00.000Z",
};

describe("guestlist model", () => {
  it("builds deterministic entry ids per source", () => {
    expect(guestEntryIdForRsvp("abc")).toBe("rsvp_abc");
    expect(guestEntryIdForTicket("t1")).toBe("t_t1");
  });

  it("accepts a well-formed entry", () => {
    expect(guestEntryValid(base)).toBe(true);
    expect(guestEntryValid({ ...base, name: "  Ava  " })).toBe(true);
  });

  it("rejects bad names, parties, and enums", () => {
    expect(guestEntryValid({ ...base, name: "   " })).toBe(false);
    expect(guestEntryValid({ ...base, name: "x".repeat(81) })).toBe(false);
    expect(guestEntryValid({ ...base, partySize: 0 })).toBe(false);
    expect(guestEntryValid({ ...base, partySize: 21 })).toBe(false);
    expect(guestEntryValid({ ...base, partySize: 1.5 })).toBe(false);
    expect(guestEntryValid({ ...base, status: "maybe" as never })).toBe(false);
    expect(guestEntryValid({ ...base, source: "email" as never })).toBe(false);
    expect(guestEntryValid({ ...base, addedBy: "" })).toBe(false);
  });

  it("counts heads per status and skips cancelled rows", () => {
    const counts = summarizeGuestlist([
      { status: "going", partySize: 2 },
      { status: "invited", partySize: 1 },
      { status: "checked-in", partySize: 4 },
      { status: "no-show", partySize: 2 },
      { status: "cancelled", partySize: 9 },
    ]);
    expect(counts).toEqual({ goingHeads: 3, checkedInHeads: 4, noshowHeads: 2, listedHeads: 9, entries: 5 });
  });

  it("marks invited/going/checked-in as active", () => {
    expect(guestEntryIsActive("going")).toBe(true);
    expect(guestEntryIsActive("checked-in")).toBe(true);
    expect(guestEntryIsActive("no-show")).toBe(false);
    expect(guestEntryIsActive("cancelled")).toBe(false);
  });
});
