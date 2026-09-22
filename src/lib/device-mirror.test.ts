import { describe, expect, it } from "vitest";
import { unionById } from "./device-mirror";

describe("unionById", () => {
  it("keeps local rows and adds remote-only rows", () => {
    const local = [{ id: "a", name: "A" }];
    const remote = [
      { id: "a", name: "A-remote" },
      { id: "b", name: "B" },
    ];
    expect(unionById(local, remote)).toEqual([
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ]);
  });

  it("drops remote rows without ids", () => {
    expect(unionById([], [{ id: "", name: "X" }])).toEqual([]);
  });
});
