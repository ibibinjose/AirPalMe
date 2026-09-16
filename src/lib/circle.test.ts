import { describe, expect, it } from "vitest";
import { circleHandles, inCircle, sameCity } from "./circle";

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
});
