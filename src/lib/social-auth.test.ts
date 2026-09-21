import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPopup = vi.fn();
const signInWithCredential = vi.fn();

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {
    addScope = vi.fn();
    setCustomParameters = vi.fn();
    static credential = vi.fn((token: string) => ({ idToken: token }));
  },
  OAuthProvider: class {
    constructor(public providerId: string) {}
    addScope = vi.fn();
    credential = vi.fn((opts: unknown) => opts);
  },
  signInWithPopup: (...args: unknown[]) => signInWithPopup(...args),
  signInWithCredential: (...args: unknown[]) => signInWithCredential(...args),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}));

vi.mock("./firebase", () => ({
  getFirebaseAuth: vi.fn(() => ({ app: { name: "[DEFAULT]" } })),
}));

import { Capacitor } from "@capacitor/core";
import { signInWithSocial } from "./social-auth";

describe("social-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    signInWithPopup.mockResolvedValue({ user: { uid: "g1" } });
  });

  it("uses a popup for Google on web", async () => {
    const cred = await signInWithSocial("google");
    expect(signInWithPopup).toHaveBeenCalledTimes(1);
    expect(cred.user.uid).toBe("g1");
  });

  it("uses a popup for Apple on web", async () => {
    signInWithPopup.mockResolvedValue({ user: { uid: "a1" } });
    const cred = await signInWithSocial("apple");
    expect(signInWithPopup).toHaveBeenCalledTimes(1);
    expect(cred.user.uid).toBe("a1");
  });
});
