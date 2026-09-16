import { describe, expect, it } from "vitest";
import { hostWatchPropertyIds, hostWorkspacePropertyId, roomTokenEntries } from "./host-workspace";

describe("host workspace", () => {
  it("does not invent a demo room token", () => {
    expect(roomTokenEntries(undefined)).toEqual([]);
    expect(roomTokenEntries({})).toEqual([]);
    expect(roomTokenEntries({ "tok-101-demo": "101" })).toEqual([["tok-101-demo", "101"]]);
  });

  it("lets platform admins operate the live Harbour stay", () => {
    expect(hostWorkspacePropertyId([], true)).toBe("harbour-hotel");
    expect(hostWorkspacePropertyId(["mine"], true)).toBe("mine");
    expect(hostWorkspacePropertyId([], false)).toBe("");
    expect(hostWatchPropertyIds([], true)).toEqual(["harbour-hotel"]);
    expect(hostWatchPropertyIds(["mine"], true)).toEqual(["mine", "harbour-hotel"]);
  });
});
