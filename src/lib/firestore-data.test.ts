import { describe, expect, it } from "vitest";
import { omitUndefinedDeep } from "./firestore-data";

describe("omitUndefinedDeep", () => {
  it("drops endTime and nested undefined before Firestore writes", () => {
    const plan = omitUndefinedDeep({
      id: "plan-1",
      endTime: undefined,
      geo: undefined,
      creator: { name: "Maya", handle: undefined },
      stops: [{ name: "Cafe", time: undefined }],
    });
    expect(plan).toEqual({
      id: "plan-1",
      creator: { name: "Maya" },
      stops: [{ name: "Cafe" }],
    });
    expect("endTime" in plan).toBe(false);
  });
});
