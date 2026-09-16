import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("firebase-admin/app", () => ({
  getApps: vi.fn().mockReturnValue([{}]),
  initializeApp: vi.fn(),
}));
vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn().mockReturnValue({}),
}));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: vi.fn().mockReturnValue({}),
}));
vi.mock("firebase-functions/v2", () => ({
  setGlobalOptions: vi.fn(),
}));
vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: class HttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

import { sandboxBookingsAllowed } from "./stripe";

describe("sandboxBookingsAllowed", () => {
  afterEach(() => {
    delete process.env.ALLOW_SANDBOX_BOOKINGS;
    delete process.env.FUNCTIONS_EMULATOR;
  });

  it("is disabled by default so unpaid bookings never confirm in production", () => {
    expect(sandboxBookingsAllowed()).toBe(false);
  });

  it("enables only with explicit opt-in or the emulator", () => {
    process.env.ALLOW_SANDBOX_BOOKINGS = "true";
    expect(sandboxBookingsAllowed()).toBe(true);
    delete process.env.ALLOW_SANDBOX_BOOKINGS;
    process.env.FUNCTIONS_EMULATOR = "true";
    expect(sandboxBookingsAllowed()).toBe(true);
  });
});
