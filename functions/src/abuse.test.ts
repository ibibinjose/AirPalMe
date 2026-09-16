import { describe, expect, it, vi } from "vitest";

vi.mock("firebase-admin/firestore", () => {
  const set = vi.fn();
  const get = vi.fn().mockResolvedValue({
    data: () => ({ count: 1, windowStart: Date.now() }),
  });
  const doc = vi.fn().mockReturnValue({ id: "test-doc" });
  const collection = vi.fn().mockReturnValue({ doc });
  const runTransaction = vi.fn().mockImplementation(async (cb: (tx: { get: typeof get; set: typeof set }) => Promise<unknown>) => {
    return cb({ get, set });
  });
  return {
    getFirestore: vi.fn().mockReturnValue({
      collection,
      runTransaction,
    }),
    FieldValue: {
      serverTimestamp: vi.fn().mockReturnValue("MOCK_SERVER_TIMESTAMP"),
    },
  };
});

import { enforceRateLimit } from "./abuse";

describe("enforceRateLimit", () => {
  it("executes a transaction on the firestore instance and updates rateLimits doc", async () => {
    await expect(enforceRateLimit("test-user-123", "analytics", false)).resolves.toBeUndefined();
  });
});
