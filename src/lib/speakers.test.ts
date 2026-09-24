import { describe, expect, it } from "vitest";
import { mergeSpeakerBio } from "./speakers";

describe("mergeSpeakerBio", () => {
  it("prefers the live bio name and photo", () => {
    expect(mergeSpeakerBio({ name: "Stored Name", role: "CEO", handle: "sarah" }, { name: "Sarah J", avatar: "https://img" })).toEqual({
      name: "Stored Name",
      role: "CEO",
      handle: "sarah",
      displayName: "Sarah J",
      photoUrl: "https://img",
    });
  });

  it("falls back to stored data without a bio", () => {
    expect(mergeSpeakerBio({ name: "Roy Green" }, null)).toEqual({ name: "Roy Green", displayName: "Roy Green" });
  });

  it("keeps the stored name when the bio has none", () => {
    expect(mergeSpeakerBio({ name: "Stored", handle: "x" }, { name: "", avatar: undefined })).toMatchObject({
      displayName: "Stored",
      photoUrl: undefined,
    });
  });
});
