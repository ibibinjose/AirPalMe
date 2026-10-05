import { describe, expect, it } from "vitest";
import type { HangoutPlan } from "@shared/plan";
import { repeatPlanDate, repeatPlanInput } from "./plan-repeat";

function makePlan(overrides: Partial<HangoutPlan> = {}): HangoutPlan {
  return {
    id: "plan-1",
    title: "Coffee at Single O",
    type: "catchup",
    theme: "emerald",
    creator: { name: "Alex" },
    date: "2026-09-12", // a Saturday
    time: "10:00",
    datetime: "2026-09-12T10:00:00",
    city: "Sydney",
    destination: "Single O",
    geo: { lat: -33.884, lng: 151.212 },
    stops: [{ id: "stop-1", name: "Single O" }],
    attendees: [
      { id: "u1", name: "Alex", status: "going", respondedAt: "2026-09-12T00:00:00Z" },
      { id: "u2", name: "Sam", status: "maybe", respondedAt: "2026-09-12T00:00:00Z" },
      { id: "u3", name: "Jo", status: "declined", respondedAt: "2026-09-12T00:00:00Z" },
    ],
    comments: [],
    subscribers: [],
    inviteCode: "ABC123",
    status: "completed",
    createdAt: "2026-09-12T00:00:00Z",
    updatedAt: "2026-09-12T00:00:00Z",
    ...overrides,
  };
}

describe("repeatPlanDate", () => {
  it("picks the coming same-weekday date, strictly in the future", () => {
    // Past Saturday, today Monday → this coming Saturday.
    expect(repeatPlanDate("2026-09-12", "2026-09-14")).toBe("2026-09-19");
    // Past Saturday, today Saturday → next Saturday, not today.
    expect(repeatPlanDate("2026-09-12", "2026-09-19")).toBe("2026-09-26");
  });

  it("falls back to today for unreadable dates", () => {
    expect(repeatPlanDate("not-a-date", "2026-09-14")).toBe("2026-09-14");
  });
});

describe("repeatPlanInput", () => {
  it("copies the plan shape onto a future date with the crew re-invited", () => {
    const input = repeatPlanInput(makePlan(), "2026-09-14");
    expect(input.title).toBe("Coffee at Single O");
    expect(input.type).toBe("catchup");
    expect(input.theme).toBe("emerald");
    expect(input.date).toBe("2026-09-19");
    expect(input.time).toBe("10:00");
    expect(input.city).toBe("Sydney");
    expect(input.destination).toBe("Single O");
    expect(input.geo).toEqual({ lat: -33.884, lng: 151.212 });
    expect(input.initialStops?.map((s) => s.name)).toEqual(["Single O"]);
    expect(input.isPublic).toBe(false);
    expect(input.invited?.map((p) => p.id)).toEqual(["u1", "u2"]);
  });
});
