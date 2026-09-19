import { describe, expect, it } from "vitest";
import { circleHandles, circleQuestProgress, inCircle, sameCity } from "./circle";

describe("circle", () => {
  const sets = {
    following: new Set(["maya"]),
    followers: new Set(["leo"]),
    liked: new Set(["glenmore"]),
    likedBy: new Set(["sam"]),
    met: new Set(["maya", "priya"]),
  };

  it("counts met, follow, and like edges as in-circle", () => {
    expect(inCircle("maya", sets)).toBe(true);
    expect(inCircle("leo", sets)).toBe(true);
    expect(inCircle("sam", sets)).toBe(true);
    expect(inCircle("stranger", sets)).toBe(false);
  });

  it("unions unique handles", () => {
    expect(circleHandles(sets).sort()).toEqual(["glenmore", "leo", "maya", "priya", "sam"]);
  });

  it("matches city names loosely", () => {
    expect(sameCity("Sydney", "sydney")).toBe(true);
    expect(sameCity("The Rocks, Sydney", "Sydney")).toBe(true);
    expect(sameCity("Melbourne", "Sydney")).toBe(false);
  });

  it("scores Circle quests for the launch loop", () => {
    const empty = circleQuestProgress({
      hasHandle: false,
      sharingCity: false,
      invited: false,
      memberCount: 0,
      planCount: 0,
    });
    expect(empty.completed).toBe(0);
    expect(empty.level.name).toBe("New");

    const live = circleQuestProgress({
      hasHandle: true,
      sharingCity: true,
      invited: true,
      memberCount: 2,
      planCount: 1,
    });
    expect(live.completed).toBe(5);
    expect(live.points).toBe(110);
    expect(live.level.name).toBe("Circle host");
  });
});
