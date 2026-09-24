import { describe, expect, it } from "vitest";
import { pingPushTarget } from "./pings";

describe("pingPushTarget", () => {
  it("notifies the recipient on a new sent ping", () => {
    expect(pingPushTarget(null, { status: "sent", toUid: "b", fromUid: "a" })).toEqual({
      toUid: "b",
      event: "pinged",
    });
  });

  it("stays silent when the new ping has no recipient or status", () => {
    expect(pingPushTarget(null, { status: "sent" })).toBeNull();
    expect(pingPushTarget(null, { status: "draft", toUid: "b" })).toBeNull();
    expect(pingPushTarget(null, null)).toBeNull();
  });

  it("notifies the original sender on the pinged_back transition", () => {
    expect(
      pingPushTarget({ status: "sent", fromUid: "a", toUid: "b" }, { status: "pinged_back", fromUid: "a", toUid: "b" }),
    ).toEqual({ toUid: "a", event: "pinged_back" });
  });

  it("stays silent on unrelated updates and repeats", () => {
    expect(
      pingPushTarget({ status: "sent", fromUid: "a" }, { status: "seen", fromUid: "a", toUid: "b" }),
    ).toBeNull();
    expect(
      pingPushTarget(
        { status: "pinged_back", fromUid: "a", toUid: "b" },
        { status: "pinged_back", fromUid: "a", toUid: "b" },
      ),
    ).toBeNull();
  });
});
