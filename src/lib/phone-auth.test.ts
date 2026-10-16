import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPhoneNumber = vi.fn();
const awaitPendingAnonymousSession = vi.fn();

vi.mock("firebase/auth", () => ({
  PhoneAuthProvider: class {},
  RecaptchaVerifier: class {
    clear() {}
  },
  linkWithCredential: vi.fn(),
  signInWithPhoneNumber: (...args: unknown[]) => signInWithPhoneNumber(...args),
  unlink: vi.fn(),
  updatePhoneNumber: vi.fn(),
}));

vi.mock("./firebase", () => ({
  getFirebaseAuth: () => ({}),
  awaitPendingAnonymousSession: () => awaitPendingAnonymousSession(),
}));

const fakeDoc = {
  getElementById: () => null,
  createElement: () => ({ dataset: {} as Record<string, string> }),
  body: { appendChild: () => undefined },
};

describe("sendPhoneCode", () => {
  beforeEach(() => {
    vi.resetModules();
    signInWithPhoneNumber.mockReset();
    awaitPendingAnonymousSession.mockReset();
    vi.stubGlobal("document", fakeDoc);
  });

  it("still sends the SMS when anonymous sign-in fails", async () => {
    awaitPendingAnonymousSession.mockRejectedValue(
      Object.assign(new Error("400"), { code: "auth/admin-restricted-operation" }),
    );
    signInWithPhoneNumber.mockResolvedValue({ confirm: vi.fn() });
    const mod = await import("./phone-auth");
    await expect(mod.sendPhoneCode("+61412345678")).resolves.toBeUndefined();
    expect(signInWithPhoneNumber).toHaveBeenCalledTimes(1);
    expect(mod.phoneCodePending()).toBe(true);
  });

  it("surfaces a send failure and allows a retry", async () => {
    awaitPendingAnonymousSession.mockResolvedValue(undefined);
    signInWithPhoneNumber.mockRejectedValueOnce(Object.assign(new Error("bad"), { code: "auth/invalid-phone-number" }));
    const mod = await import("./phone-auth");
    await expect(mod.sendPhoneCode("+61412345678")).rejects.toThrow("bad");
    signInWithPhoneNumber.mockResolvedValue({ confirm: vi.fn() });
    await expect(mod.sendPhoneCode("+61412345678")).resolves.toBeUndefined();
  });

  it("withTimeout rejects a hung step", async () => {
    vi.useFakeTimers();
    const { withTimeout } = await import("./phone-auth");
    const p = withTimeout(new Promise(() => undefined), 1000, "too slow");
    vi.advanceTimersByTime(1001);
    await expect(p).rejects.toThrow("too slow");
    vi.useRealTimers();
  });
});
