import { describe, expect, it } from "vitest";
import { inviteLinkFor, normalizeInviteCode } from "./app-invites";

describe("app invites", () => {
  it("normalizes invite codes to handles", () => {
    expect(normalizeInviteCode("@Leo")).toBe("leo");
    expect(normalizeInviteCode("  MAYA_99 ")).toBe("maya_99");
    expect(normalizeInviteCode("")).toBeNull();
    expect(normalizeInviteCode(null)).toBeNull();
  });

  it("builds a shareable join link", () => {
    expect(inviteLinkFor("Leo", "https://airpal.me/")).toBe("https://airpal.me/start?tab=signup&ref=leo");
    expect(inviteLinkFor("maya_99", "https://airpal.me")).toBe("https://airpal.me/start?tab=signup&ref=maya_99");
    expect(inviteLinkFor("bibinjose", "capacitor://airpal.me")).toBe(
      "https://airpal.me/start?tab=signup&ref=bibinjose",
    );
    expect(inviteLinkFor("maya")).toBe("https://airpal.me/start?tab=signup&ref=maya");
  });
});
