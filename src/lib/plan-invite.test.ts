import { describe, expect, it } from "vitest";
import { localTodayStr, shouldAutoOpenInviteRsvp } from "./plan-invite";

const base = {
  arrivedViaInvite: true,
  planLoaded: true,
  isHost: false,
  alreadyAttendee: false,
  planDate: "2099-01-01",
  planStatus: "open",
  todayStr: "2026-01-01",
};

describe("invite auto-RSVP", () => {
  it("opens for a fresh guest on an upcoming plan", () => {
    expect(shouldAutoOpenInviteRsvp(base)).toBe(true);
  });

  it("stays shut for direct visits, hosts, and existing attendees", () => {
    expect(shouldAutoOpenInviteRsvp({ ...base, arrivedViaInvite: false })).toBe(false);
    expect(shouldAutoOpenInviteRsvp({ ...base, isHost: true })).toBe(false);
    expect(shouldAutoOpenInviteRsvp({ ...base, alreadyAttendee: true })).toBe(false);
  });

  it("stays shut for past or completed plans", () => {
    expect(shouldAutoOpenInviteRsvp({ ...base, planDate: "2020-01-01" })).toBe(false);
    expect(shouldAutoOpenInviteRsvp({ ...base, planStatus: "completed" })).toBe(false);
    expect(shouldAutoOpenInviteRsvp({ ...base, planLoaded: false })).toBe(false);
  });

  it("formats local today as YYYY-MM-DD", () => {
    expect(localTodayStr(new Date(2026, 8, 16))).toBe("2026-09-16");
  });
});
