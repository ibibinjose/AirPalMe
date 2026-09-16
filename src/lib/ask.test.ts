import { describe, expect, it } from "vitest";
import { askLocal } from "./ask";

describe("askLocal", () => {
  it("does not leak a seed Wi-Fi password", () => {
    const res = askLocal("wifi password");
    expect(res.title).toBe("Wi-Fi");
    expect(res.body.toLowerCase()).not.toMatch(/rockssydney|surfbondi|secret/);
    expect(res.body).toMatch(/desk|scan/i);
  });
});
