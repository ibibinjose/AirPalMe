import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./functions", () => ({
  liveBackendEnabled: vi.fn(() => true),
  updateBusinessProfileRemote: vi.fn(async () => ({ ok: true })),
  createBusinessProfileRemote: vi.fn(async () => ({ profileId: "bio-1", handle: "maya" })),
}));

vi.mock("./firebase", () => ({
  getFirebaseAuth: () => ({ currentUser: { uid: "uid-1" } }),
}));

import { persistOwnedProfile, profileToRemotePatch } from "./bio-persist";
import { createBusinessProfileRemote, updateBusinessProfileRemote } from "./functions";

const profile = {
  id: "bio-1",
  handle: "maya",
  kind: "person" as const,
  ownerUid: "uid-1",
  name: "Maya",
  shortWhy: "On AirPal",
  city: "Sydney",
  category: "services" as const,
  hours: "",
  openNow: true,
  products: [],
  services: [],
  deals: [],
  links: [
    { id: "ig", type: "instagram" as const, label: "Instagram", href: "https://instagram.com/maya" },
    { id: "x", type: "x" as const, label: "X", href: "https://x.com/maya" },
  ],
};

describe("persistOwnedProfile", () => {
  beforeEach(() => {
    vi.mocked(updateBusinessProfileRemote).mockClear();
    vi.mocked(createBusinessProfileRemote).mockClear();
  });

  it("sends social links with the profile patch", () => {
    const patch = profileToRemotePatch(profile);
    expect(patch.links?.map((row) => row.type)).toEqual(["instagram", "x"]);
  });

  it("writes the profile to Firebase", async () => {
    await persistOwnedProfile(profile);
    expect(updateBusinessProfileRemote).toHaveBeenCalledWith(expect.objectContaining({ handle: "maya" }));
    expect(createBusinessProfileRemote).not.toHaveBeenCalled();
  });

  it("creates the handle then writes when the account has no profile yet", async () => {
    vi.mocked(updateBusinessProfileRemote).mockRejectedValueOnce({
      code: "functions/not-found",
      message: "No handle.",
    });
    await persistOwnedProfile(profile);
    expect(createBusinessProfileRemote).toHaveBeenCalled();
    expect(updateBusinessProfileRemote).toHaveBeenCalledTimes(2);
  });
});
