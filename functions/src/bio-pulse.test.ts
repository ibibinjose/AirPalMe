import { afterEach, describe, expect, it, vi } from "vitest";

const { fakes } = vi.hoisted(() => ({
  fakes: {
    docs: {} as Record<string, Record<string, unknown> | undefined>,
    deployments: [] as Record<string, unknown>[],
    rateLimited: [] as string[],
  },
}));

vi.mock("firebase-functions/params", () => ({
  defineSecret: () => ({ value: () => "" }),
}));

vi.mock("firebase-admin/app", () => ({
  getApps: vi.fn().mockReturnValue([{}]),
  initializeApp: vi.fn(),
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn().mockReturnValue({}),
}));

vi.mock("firebase-admin/messaging", () => ({
  getMessaging: vi.fn().mockReturnValue({}),
}));

vi.mock("firebase-functions/v2", () => ({
  setGlobalOptions: vi.fn(),
}));

vi.mock("firebase-functions/v2/firestore", () => ({
  onDocumentCreated: vi.fn((_opts: unknown, handler: unknown) => handler),
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

vi.mock("./abuse", () => ({
  enforceRateLimit: async (uid: string, action: string) => {
    fakes.rateLimited.push(`${uid}:${action}`);
  },
  isAnonymousAuth: () => false,
  noteAppCheck: async () => undefined,
}));

vi.mock("./analytics", () => ({
  writeAuthoritativeEvent: async () => undefined,
}));

vi.mock("./admin", () => ({
  CALLABLE: {},
  requireAuth: (uid: string | undefined) => {
    if (!uid) throw new Error("Sign in required.");
    return uid;
  },
  isPlatformAdmin: () => false,
  db: {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          const data = fakes.docs[`${name}/${id}`];
          return { exists: Boolean(data), data: () => data };
        },
        collection: (sub: string) => ({
          doc: (subId: string) => ({
            get: async () => {
              const data = fakes.docs[`${name}/${id}/${sub}/${subId}`];
              return { exists: Boolean(data), data: () => data };
            },
          }),
          where: (field: string, op: string, value: unknown) => ({
            limit: (_n: number) => ({
              get: async () => {
                expect(field).toBe("active");
                expect(op).toBe("==");
                const docs = fakes.deployments
                  .filter((d) => d.active === value)
                  .map((data) => ({ data: () => data }));
                return { empty: docs.length === 0, docs };
              },
            }),
          }),
        }),
      }),
    }),
  },
}));

import { getBioPulse } from "./pulse";

type Handler = (request: unknown) => Promise<Record<string, unknown>>;

const TOKEN = "pls_0123456789ABCDEFGHIJ";

function run(uid: string | undefined, data: unknown) {
  return (getBioPulse as unknown as Handler)({ auth: uid ? { uid, token: {} } : {}, data });
}

describe("getBioPulse", () => {
  afterEach(() => {
    fakes.docs = {};
    fakes.deployments = [];
    fakes.rateLimited.length = 0;
  });

  it("rejects empty property ids", async () => {
    await expect(run("u1", { propertyId: " " })).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("returns found:false when no deployment is active", async () => {
    const res = await run(undefined, { propertyId: "prop-1" });
    expect(res).toEqual({ found: false });
    expect(fakes.rateLimited).toContain("bio:prop-1:pulse_scan");
  });

  it("returns found:false when the pulse is not live", async () => {
    fakes.deployments = [{ active: true, publicToken: TOKEN, pulseId: "pu-1" }];
    fakes.docs["properties/prop-1/pulses/pu-1"] = { status: "paused", name: "Old" };
    const res = await run(undefined, { propertyId: "prop-1" });
    expect(res).toEqual({ found: false });
  });

  it("resolves the live pulse for anonymous bio visitors", async () => {
    fakes.deployments = [{ active: true, publicToken: TOKEN, pulseId: "pu-1" }];
    fakes.docs["properties/prop-1"] = { name: "Harbour Hotel" };
    fakes.docs["properties/prop-1/pulses/pu-1"] = {
      status: "live",
      name: "Dinner check",
      branding: { title: "How was dinner?" },
    };
    const res = await run(undefined, { propertyId: "prop-1" });
    expect(res).toEqual({
      found: true,
      publicToken: TOKEN,
      title: "How was dinner?",
      propertyName: "Harbour Hotel",
    });
  });
});
