import { describe, expect, it } from "vitest";
import {
  buildPlanReminder,
  goingFits,
  guestListDisplay,
  nextPromotions,
  planBroadcastRecipients,
  planReminderKind,
  reminderAlreadySent,
  resolveRsvpStatus,
  rsvpAllowed,
  validatePlanBroadcast,
  visibleAttendees,
} from "./plan-notify";

const going = (id: string) => ({ id, name: id, status: "going" as const, respondedAt: "2026-09-01T00:00:00Z" });

describe("rsvpAllowed", () => {
  it("locks RSVPs on cancelled and completed plans, allows live ones", () => {
    expect(rsvpAllowed({ status: "open" })).toBe(true);
    expect(rsvpAllowed({ status: "confirmed" })).toBe(true);
    expect(rsvpAllowed({ status: "cancelled" })).toBe(false);
    expect(rsvpAllowed({ status: "completed" })).toBe(false);
  });
});

describe("plan broadcast validation", () => {
  it("accepts a short host note", () => {
    expect(validatePlanBroadcast({ title: "Doors at 7", body: "Come through." })).toEqual([]);
  });

  it("rejects blanks and over-long copy", () => {
    expect(validatePlanBroadcast({ title: "", body: "" }).length).toBeGreaterThan(0);
    expect(validatePlanBroadcast({ title: "x".repeat(81), body: "ok" })).toContain(
      "Title must be 80 characters or fewer.",
    );
    expect(validatePlanBroadcast({ title: "ok", body: "x".repeat(281) })).toContain(
      "Message must be 280 characters or fewer.",
    );
  });
});

describe("plan broadcast recipients", () => {
  const plan = {
    attendees: [
      going("uid-host"),
      going("uid-a"),
      { ...going("uid-b"), status: "maybe" as const },
      going("uid-a"),
      going("anon-12345"),
      { ...going("uid-c"), status: "declined" as const },
    ],
  };

  it("sends to going only, minus sender, deduped, no device-local ids", () => {
    expect(planBroadcastRecipients(plan, "uid-host")).toEqual(["uid-a"]);
  });

  it("includes the host when someone else sends", () => {
    expect(planBroadcastRecipients(plan, "uid-admin")).toEqual(["uid-host", "uid-a"]);
  });
});

describe("plan reminder schedule", () => {
  it("fires day-before and day-of only", () => {
    expect(planReminderKind({ planDate: "2026-09-20", todayStr: "2026-09-19" })).toBe("day-before");
    expect(planReminderKind({ planDate: "2026-09-20", todayStr: "2026-09-20" })).toBe("day-of");
    expect(planReminderKind({ planDate: "2026-09-20", todayStr: "2026-09-18" })).toBeNull();
    expect(planReminderKind({ planDate: "2026-09-20", todayStr: "2026-09-21" })).toBeNull();
  });

  it("ignores malformed dates instead of guessing", () => {
    expect(planReminderKind({ planDate: "", todayStr: "2026-09-20" })).toBeNull();
    expect(planReminderKind({ planDate: "2026-09-20", todayStr: "soon" })).toBeNull();
  });

  it("treats a rescheduled plan as due again", () => {
    const plan = { date: "2026-09-27", remindersSent: { dayBefore: "2026-09-20" } };
    expect(reminderAlreadySent(plan, "day-before")).toBe(false);
    expect(reminderAlreadySent({ date: "2026-09-20", remindersSent: { dayBefore: "2026-09-20" } }, "day-before")).toBe(
      true,
    );
    expect(reminderAlreadySent({ date: "2026-09-20" }, "day-of")).toBe(false);
  });

  it("builds a short nudge with time and place", () => {
    const msg = buildPlanReminder(
      { title: "Harbour Walk", date: "2026-09-20", time: "09:00", destination: "The Rocks" },
      "day-before",
    );
    expect(msg.title).toBe("Tomorrow: Harbour Walk");
    expect(msg.body).toContain("09:00");
    expect(msg.body).toContain("The Rocks");
  });
});

describe("guest-list visibility", () => {
  const att = (id: string, name: string) => ({
    id,
    name,
    handle: "h-" + id,
    avatar: "https://img/" + id,
    notes: "bringing drinks",
    answers: { q1: "Vego" },
    status: "going" as const,
    respondedAt: "2026-09-01T00:00:00Z",
  });
  const plan = {
    creator: { uid: "uid-host", name: "Hosty" },
    attendees: [att("uid-host", "Hosty"), att("uid-a", "Alex"), att("uid-b", "Sam")],
  };

  it("defaults to fully visible", () => {
    expect(guestListDisplay({})).toEqual({ showNames: true, showCount: true });
    expect(visibleAttendees(plan, { uid: "uid-a" }).map((a) => a.name)).toEqual(["Hosty", "Alex", "Sam"]);
  });

  it("hides other guests from guests but keeps self, host row, and statuses", () => {
    const hidden = { ...plan, guestList: { hideNames: true } };
    expect(guestListDisplay(hidden).showNames).toBe(false);
    const list = visibleAttendees(hidden, { uid: "uid-a" });
    expect(list.map((a) => a.name)).toEqual(["Hosty", "Alex", "Guest"]);
    expect(list[2]!.handle).toBeUndefined();
    expect(list[2]!.avatar).toBeUndefined();
    expect(list[2]!.notes).toBeUndefined();
    expect(list[2]!.answers).toBeUndefined();
    expect(list[2]!.review).toBeUndefined();
    expect(list[1]!.answers).toEqual({ q1: "Vego" });
    expect(list.map((a) => a.status)).toEqual(["going", "going", "going"]);
  });

  it("still shows the host everything", () => {
    const hidden = { ...plan, guestList: { hideNames: true, hideCount: true } };
    expect(guestListDisplay(hidden).showCount).toBe(false);
    expect(visibleAttendees(hidden, { uid: "uid-host", isHost: true }).map((a) => a.name)).toEqual([
      "Hosty",
      "Alex",
      "Sam",
    ]);
  });
});

describe("rsvp routing", () => {
  const att = (id: string, status: "going" | "waitlisted" | "pending" | "maybe", plusOnes?: number) => ({
    id,
    name: id,
    status,
    plusOnes,
    respondedAt: "2026-09-01T00:00:00Z",
  });

  it("sends newcomers straight in when open", () => {
    const plan = { capacity: 10, attendees: [att("a", "going")] };
    expect(resolveRsvpStatus(plan, "b", "going", 0)).toBe("going");
    expect(resolveRsvpStatus(plan, "b", "maybe", 0)).toBe("maybe");
    expect(goingFits(plan, "b", 2)).toBe(true);
  });

  it("parks newcomers on the waitlist when full", () => {
    const plan = { capacity: 2, attendees: [att("a", "going", 1)] };
    expect(goingFits(plan, "b", 0)).toBe(false);
    expect(resolveRsvpStatus(plan, "b", "going", 0)).toBe("waitlisted");
  });

  it("parks newcomers as pending when approval is on", () => {
    const plan = { capacity: 10, requiresApproval: true, attendees: [att("a", "going")] };
    expect(resolveRsvpStatus(plan, "b", "going", 0)).toBe("pending");
  });

  it("keeps re-saves from the going as going", () => {
    const plan = { capacity: 1, requiresApproval: true, attendees: [att("a", "going")] };
    expect(resolveRsvpStatus(plan, "a", "going", 0)).toBe("going");
  });
});

describe("waitlist promotion", () => {
  const att = (id: string, status: "going" | "waitlisted", respondedAt: string, plusOnes?: number) => ({
    id,
    name: id,
    status,
    plusOnes,
    respondedAt,
  });

  it("promotes in line order while seats free, strict FIFO", () => {
    const plan = {
      capacity: 4,
      attendees: [
        att("g1", "going", "2026-09-01T00:00:00Z"),
        att("w1", "waitlisted", "2026-09-01T00:00:00Z", 2),
        att("w2", "waitlisted", "2026-09-02T00:00:00Z"),
      ],
    };
    // g1 takes 1, w1 needs 3 → fits exactly.
    expect(nextPromotions(plan)).toEqual(["w1"]);
  });

  it("drains the queue when there is no limit", () => {
    const plan = {
      attendees: [
        att("w1", "waitlisted", "2026-09-02T00:00:00Z"),
        att("w2", "waitlisted", "2026-09-01T00:00:00Z"),
      ],
    };
    expect(nextPromotions(plan)).toEqual(["w2", "w1"]);
  });

  it("promotes nothing when full", () => {
    const plan = { capacity: 1, attendees: [att("g1", "going", "2026-09-01T00:00:00Z"), att("w1", "waitlisted", "2026-09-02T00:00:00Z")] };
    expect(nextPromotions(plan)).toEqual([]);
  });
});
