import { afterEach, describe, expect, it, vi } from "vitest";

const { fakes, FakeHttpsError } = vi.hoisted(() => {
  class FakeHttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }
  return {
    FakeHttpsError,
    fakes: {
      isAdmin: false,
      signups: {} as Record<string, Record<string, unknown>>,
    },
  };
});

vi.mock("./admin", () => ({
  CALLABLE: {},
  requireAuth: (uid: string | undefined) => {
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in.");
    return uid;
  },
  requireAccount: (request: { auth?: { uid?: string } }) => {
    const uid = request.auth?.uid;
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in.");
    return uid;
  },
  isPlatformAdmin: () => fakes.isAdmin,
  db: {
    collection: (name: string) => {
      if (name !== "guestlist_signups") throw new Error(`unexpected collection ${name}`);
      return {
        doc: (id: string) => ({
          get: async () => {
            const data = fakes.signups[id];
            return { exists: Boolean(data), data: () => data };
          },
          set: async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
            fakes.signups[id] = opts?.merge ? { ...fakes.signups[id], ...data } : data;
          },
        }),
        limit: (_n: number) => ({
          get: async () => ({
            docs: Object.entries(fakes.signups).map(([id, d]) => ({ id, data: () => d })),
          }),
        }),
      };
    },
  },
}));

vi.mock("./abuse", () => ({
  noteAppCheck: async () => undefined,
  enforceRateLimit: async () => undefined,
  isAnonymousAuth: () => false,
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: FakeHttpsError,
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

import { joinGuestlistSignup, listGuestlistSignups, unsubscribeGuestlist } from "./guestlist-signups";

type Handler = (request: unknown) => Promise<Record<string, unknown>>;

function run(handler: unknown, uid: string | undefined, data: unknown, admin = false) {
  fakes.isAdmin = admin;
  return (handler as unknown as Handler)({ auth: uid ? { uid, token: {} } : {}, data });
}

const GOOD = { name: "Ava", city: "Sydney", email: "ava@example.com", interests: ["events", "nightlife"] };

describe("guestlist signups", () => {
  afterEach(() => {
    fakes.isAdmin = false;
    fakes.signups = {};
  });

  it("join requires auth and valid input", async () => {
    await expect(run(joinGuestlistSignup, undefined, GOOD)).rejects.toMatchObject({
      code: "unauthenticated",
    });
    await expect(run(joinGuestlistSignup, "anon-1", { ...GOOD, email: "nope" })).rejects.toMatchObject({
      code: "invalid-argument",
    });
    expect(fakes.signups).toEqual({});
  });

  it("join stores the signup keyed by normalized email with consent", async () => {
    const res = await run(joinGuestlistSignup, "anon-1", {
      ...GOOD,
      email: "  Ava@Example.COM ",
      source: "harbourbar",
    });
    expect(res).toEqual({ ok: true, email: "ava@example.com" });
    expect(fakes.signups["ava@example.com"]).toMatchObject({
      email: "ava@example.com",
      name: "Ava",
      city: "Sydney",
      interests: ["events", "nightlife"],
      invites: true,
      source: "harbourbar",
      unsubscribedAt: null,
    });
    expect(typeof fakes.signups["ava@example.com"]?.consentAt).toBe("string");
  });

  it("join re-subscribes and clears unsubscribedAt", async () => {
    fakes.signups["ava@example.com"] = { ...GOOD, unsubscribedAt: "2026-09-01T00:00:00Z" };
    await run(joinGuestlistSignup, "anon-1", GOOD);
    expect(fakes.signups["ava@example.com"]?.unsubscribedAt).toBeNull();
  });

  it("list is admin-only with city and interest filters", async () => {
    fakes.signups = {
      "a@example.com": { email: "a@example.com", name: "A", city: "Sydney", interests: ["nightlife"] },
      "b@example.com": { email: "b@example.com", name: "B", city: "Melbourne", interests: ["events"] },
      "c@example.com": {
        email: "c@example.com",
        name: "C",
        city: "Sydney",
        interests: ["events"],
        unsubscribedAt: "2026-09-01T00:00:00Z",
      },
    };
    await expect(run(listGuestlistSignups, "u-1", {})).rejects.toMatchObject({ code: "permission-denied" });
    const all = (await run(listGuestlistSignups, "admin-1", {}, true)) as unknown as {
      rows: unknown[];
      total: number;
      hasMore: boolean;
    };
    expect(all.total).toBe(2);
    expect(all.hasMore).toBe(false);
    const sydney = (await run(listGuestlistSignups, "admin-1", { city: "sydney" }, true)) as unknown as {
      rows: Array<{ email: string }>;
    };
    expect(sydney.rows.map((r) => r.email)).toEqual(["a@example.com"]);
    const events = (await run(listGuestlistSignups, "admin-1", { interest: "events" }, true)) as unknown as {
      rows: Array<{ email: string }>;
    };
    expect(events.rows.map((r) => r.email)).toEqual(["b@example.com"]);
  });

  it("unsubscribe is idempotent and never oracles membership", async () => {
    fakes.signups["ava@example.com"] = { ...GOOD };
    await expect(run(unsubscribeGuestlist, "anon-1", { email: "ava@example.com" })).resolves.toEqual({
      ok: true,
    });
    expect(typeof fakes.signups["ava@example.com"]?.unsubscribedAt).toBe("string");
    await expect(run(unsubscribeGuestlist, "anon-1", { email: "ghost@example.com" })).resolves.toEqual({
      ok: true,
    });
    expect(fakes.signups["ghost@example.com"]).toBeUndefined();
    await expect(run(unsubscribeGuestlist, "anon-1", { email: "not-an-email" })).resolves.toEqual({
      ok: true,
    });
  });
});
