import { describe, expect, it } from "vitest";
import { canManageGuestlist, guestStatusLabel } from "./guestlist";

describe("guestlist client helpers", () => {
  it("lets only the organiser or an admin manage", () => {
    expect(canManageGuestlist({ organiserUid: "org-1" }, "org-1")).toBe(true);
    expect(canManageGuestlist({ organiserUid: "org-1" }, "admin-9", true)).toBe(true);
    expect(canManageGuestlist({ organiserUid: "org-1" }, "stranger")).toBe(false);
    expect(canManageGuestlist({ organiserUid: "org-1" }, undefined)).toBe(false);
    expect(canManageGuestlist(null, "org-1")).toBe(false);
  });

  it("labels every status in plain words", () => {
    expect(guestStatusLabel("going")).toBe("Going");
    expect(guestStatusLabel("invited")).toBe("Invited");
    expect(guestStatusLabel("checked-in")).toBe("Checked in");
    expect(guestStatusLabel("no-show")).toBe("No-show");
    expect(guestStatusLabel("cancelled")).toBe("Cancelled");
  });
});
