import { beforeEach, describe, expect, it } from "vitest";
import {
  addCommentToPlan,
  addStopToPlan,
  clearStopNotifications,
  deletePlan,
  getPlan,
  listStopNotifications,
  notifyStopChange,
  removeStopFromPlan,
  reorderStopsInPlan,
  respondToPlan,
  savePlan,
  updateStopInPlan,
  voteStopInPlan,
} from "./plan-store";
import type { HangoutPlan } from "@shared/plan";

function fixture(): HangoutPlan {
  return savePlan({
    id: `plan-test-${Date.now()}`,
    inviteCode: `T${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    title: "Test night out",
    type: "nightout",
    theme: "gold",
    date: "2026-10-02",
    time: "18:30",
    city: "Sydney",
    destination: "The Rocks",
    creator: { uid: "u1", name: "Host" },
    attendees: [],
    subscribers: [],
    stops: [],
    comments: [],
    status: "open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as HangoutPlan);
}

describe("plan store", () => {
  it("finds plans by id and invite code", () => {
    const plan = fixture();
    expect(getPlan(plan.id)?.id).toBe(plan.id);
    expect(getPlan(plan.inviteCode)?.id).toBe(plan.id);
    expect(getPlan("nope")).toBeUndefined();
  });

  it("upserts an RSVP instead of duplicating the mate", () => {
    const plan = fixture();
    respondToPlan(plan.id, { id: "m1", name: "Alex", status: "maybe" });
    respondToPlan(plan.id, { id: "m1", name: "Alex", status: "going" });
    const mates = getPlan(plan.id)?.attendees.filter((a) => a.id === "m1") ?? [];
    expect(mates).toHaveLength(1);
    expect(mates[0]?.status).toBe("going");
  });

  it("saves and retrieves full plan with initial stops and custom fields", () => {
    const planId = `plan-created-${Date.now()}`;
    const newPlan: HangoutPlan = {
      id: planId,
      title: "Friday Sunset Rooftop & Sandstone Pubs",
      type: "nightout",
      theme: "gold",
      date: "2026-10-09",
      time: "18:30",
      city: "Sydney",
      destination: "The Rocks & Circular Quay, Sydney",
      creator: { uid: "u-creator", name: "Host" },
      attendees: [{ id: "u-creator", name: "Host", status: "going", respondedAt: new Date().toISOString() }],
      subscribers: [],
      stops: [
        { id: "stop-1", name: "The Glenmore Rooftop", time: "18:30", icon: "drinks", address: "96 Cumberland St" },
        { id: "stop-2", name: "Fortune of War", time: "20:00", icon: "food", address: "137 George St" },
      ],
      comments: [],
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = savePlan(newPlan);
    expect(saved.id).toBe(planId);
    expect(saved.stops).toHaveLength(2);

    const fetched = getPlan(planId);
    expect(fetched).toBeDefined();
    expect(fetched?.title).toBe("Friday Sunset Rooftop & Sandstone Pubs");
    expect(fetched?.stops[0]?.name).toBe("The Glenmore Rooftop");
  });

  it("appends stops with unique ids", () => {
    const plan = fixture();
    addStopToPlan(plan.id, { name: "Rooftop" });
    addStopToPlan(plan.id, { name: "Rooftop" });
    const stops = getPlan(plan.id)?.stops ?? [];
    expect(stops).toHaveLength(2);
    expect(new Set(stops.map((s) => s.id)).size).toBe(2);
  });

  it("updates a stop's fields by id", () => {
    const plan = fixture();
    addStopToPlan(plan.id, { name: "Rooftop", time: "18:30" });
    const stopId = getPlan(plan.id)?.stops[0]?.id ?? "";
    updateStopInPlan(plan.id, stopId, { name: "Skyline Rooftop", time: "19:00" });
    const stop = getPlan(plan.id)?.stops[0];
    expect(stop?.name).toBe("Skyline Rooftop");
    expect(stop?.time).toBe("19:00");
  });

  it("removes a stop by id and keeps the rest", () => {
    const plan = fixture();
    addStopToPlan(plan.id, { name: "Rooftop" });
    addStopToPlan(plan.id, { name: "Laneway" });
    const ids = (getPlan(plan.id)?.stops ?? []).map((s) => s.id);
    removeStopFromPlan(plan.id, ids[0]!);
    const stops = getPlan(plan.id)?.stops ?? [];
    expect(stops).toHaveLength(1);
    expect(stops[0]?.name).toBe("Laneway");
  });

  it("reorders stops by index", () => {
    const plan = fixture();
    addStopToPlan(plan.id, { name: "First" });
    addStopToPlan(plan.id, { name: "Second" });
    addStopToPlan(plan.id, { name: "Third" });
    reorderStopsInPlan(plan.id, 0, 2);
    expect((getPlan(plan.id)?.stops ?? []).map((s) => s.name)).toEqual(["Second", "Third", "First"]);
  });

  it("toggles stop upvotes", () => {
    const plan = fixture();
    addStopToPlan(plan.id, { name: "First" });
    const stopId = getPlan(plan.id)?.stops[0]?.id ?? "";
    voteStopInPlan(plan.id, stopId, "user-1");
    expect(getPlan(plan.id)?.stops[0]?.votes).toBe(1);
    voteStopInPlan(plan.id, stopId, "user-2");
    expect(getPlan(plan.id)?.stops[0]?.votes).toBe(2);
    // toggle off
    voteStopInPlan(plan.id, stopId, "user-1");
    expect(getPlan(plan.id)?.stops[0]?.votes).toBe(1);
  });

  it("adds comments to a plan", () => {
    const plan = fixture();
    addCommentToPlan(plan.id, {
      authorId: "user-1",
      authorName: "Alex",
      text: "See everyone at 7!",
    });
    const comments = getPlan(plan.id)?.comments ?? [];
    expect(comments).toHaveLength(1);
    expect(comments[0]?.text).toBe("See everyone at 7!");
  });

  it("deletes a plan", () => {
    const plan = fixture();
    expect(getPlan(plan.id)).toBeDefined();
    deletePlan(plan.id);
    expect(getPlan(plan.id)).toBeUndefined();
  });
});

describe("stop change notifications", () => {
  beforeEach(() => {
    clearStopNotifications();
  });

  function planWithMates(): HangoutPlan {
    const plan = savePlan({
      ...fixture(),
      id: `plan-mates-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      attendees: [
        { id: "u1", name: "Alex", status: "going", respondedAt: new Date().toISOString() },
        { id: "u2", name: "Sam", status: "maybe", respondedAt: new Date().toISOString() },
      ],
      subscribers: ["u2", "follower@mates.io"],
    } as HangoutPlan);
    return plan;
  }

  it("records a notification to every collaborator on add/update/remove/reorder", () => {
    const plan = planWithMates();
    const added = notifyStopChange(plan.id, "added", { stopName: "Rooftop", actorName: "Alex" });
    const reordered = notifyStopChange(plan.id, "reordered", { actorName: "Sam" });

    expect(added?.recipientIds.sort()).toEqual(["follower@mates.io", "u1", "u2"]);
    expect(added?.message).toContain("Rooftop");
    expect(reordered?.action).toBe("reordered");

    removeStopFromPlan(plan.id, "missing");
    const removed = notifyStopChange(plan.id, "removed", { stopName: "Rooftop" });
    expect(removed?.recipientIds).toHaveLength(3);

    const all = listStopNotifications(plan.id);
    expect(all.map((n) => n.action)).toEqual(["added", "reordered", "removed"]);
  });

  it("returns undefined for unknown plans", () => {
    expect(notifyStopChange("no-such-plan", "added", { stopName: "X" })).toBeUndefined();
  });
});
