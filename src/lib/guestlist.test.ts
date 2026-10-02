import { describe, expect, it } from "vitest";
import { canManageGuestlist, guestStatusLabel } from "./guestlist";

describe("guestlist client helpers", () => {
  it("lets the owner, co-hosts, and admins manage", () => {
    const header = { ownerUid: "org-1", coHostUids: ["co-1"] };
    expect(canManageGuestlist(header, "org-1")).toBe(true);
    expect(canManageGuestlist(header, "co-1")).toBe(true);
    expect(canManageGuestlist(header, "admin-9", true)).toBe(true);
    expect(canManageGuestlist(header, "stranger")).toBe(false);
    expect(canManageGuestlist(header, undefined)).toBe(false);
    expect(canManageGuestlist(null, "org-1")).toBe(false);
    expect(canManageGuestlist({ ownerUid: "org-1", coHostUids: [] }, "org-1")).toBe(true);
  });

  it("labels every status in plain words", () => {
    expect(guestStatusLabel("going")).toBe("Going");
    expect(guestStatusLabel("invited")).toBe("Invited");
    expect(guestStatusLabel("checked-in")).toBe("Checked in");
    expect(guestStatusLabel("no-show")).toBe("No-show");
    expect(guestStatusLabel("cancelled")).toBe("Cancelled");
  });
});
