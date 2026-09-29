import { afterEach, describe, expect, it, vi } from "vitest";

const { fakes } = vi.hoisted(() => ({
  fakes: {
    isAdmin: true,
    queriedCols: [] as string[],
    deletedRefs: [] as string[],
    subDeletes: [] as string[],
    audits: [] as unknown[],
    docsByCol: {} as Record<string, { id: string; subs?: Record<string, string[]> }[]>,
  },
}));

vi.mock("./admin", () => ({
  CALLABLE: {},
  requireAccount: () => "admin-1",
  isPlatformAdmin: () => fakes.isAdmin,
  db: {
    collection: (name: string) => {
      fakes.queriedCols.push(name);
      return {
        where: (field: string, op: string, value: unknown) => {
          expect(field).toBe("demo");
          expect(op).toBe("==");
          expect(value).toBe(true);
          return {
            get: async () => ({
              docs: (fakes.docsByCol[name] || []).map((d) => ({
                id: d.id,
                ref: {
                  id: d.id,
                  delete: async () => {
                    fakes.deletedRefs.push(`${name}/${d.id}`);
                  },
                  collection: (sub: string) => ({
                    get: async () => {
                      const ids = d.subs?.[sub] || [];
                      return {
                        empty: ids.length === 0,
                        docs: ids.map((sid: string) => ({
                          ref: { id: sid, path: `${name}/${d.id}/${sub}/${sid}` },
                        })),
                      };
                    },
                  }),
                },
              })),
            }),
          };
        },
      };
    },
    batch: () => ({
      delete: (ref: { path: string }) => {
        fakes.subDeletes.push(ref.path);
      },
      commit: async () => undefined,
    }),
  },
}));

vi.mock("./abuse", () => ({
  writeAudit: async (row: unknown) => {
    fakes.audits.push(row);
  },
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

import { teardownDemoBusiness } from "./demo";

type Handler = (request: unknown) => Promise<{ deleted: Record<string, number> }>;

function run() {
  return (teardownDemoBusiness as unknown as Handler)({ auth: { uid: "admin-1", token: {} }, data: {} });
}

describe("teardownDemoBusiness", () => {
  afterEach(() => {
    fakes.isAdmin = true;
    fakes.queriedCols.length = 0;
    fakes.deletedRefs.length = 0;
    fakes.subDeletes.length = 0;
    fakes.audits.length = 0;
    fakes.docsByCol = {};
  });

  it("rejects non-admins", async () => {
    fakes.isAdmin = false;
    await expect(run()).rejects.toMatchObject({ code: "permission-denied" });
    expect(fakes.queriedCols).toEqual([]);
  });

  it("sweeps every demo collection, subcollections, and audits", async () => {
    fakes.docsByCol = {
      listings: [{ id: "demo-list-a" }],
      events: [{ id: "demo-evt-b" }],
      properties: [{ id: "demo-p_x", subs: { menu: ["m1"], private: ["secrets"], qrCodes: ["q1"] } }],
    };
    const res = await run();
    for (const col of ["listings", "places", "events", "properties", "markers", "partnerVenues"]) {
      expect(fakes.queriedCols).toContain(col);
    }
    expect(res.deleted).toMatchObject({ listings: 1, events: 1, properties: 1, places: 0 });
    expect(fakes.deletedRefs).toContain("listings/demo-list-a");
    expect(fakes.deletedRefs).toContain("properties/demo-p_x");
    expect(fakes.subDeletes).toContain("properties/demo-p_x/menu/m1");
    expect(fakes.subDeletes).toContain("properties/demo-p_x/private/secrets");
    expect(fakes.subDeletes).toContain("properties/demo-p_x/qrCodes/q1");
    expect(fakes.audits).toHaveLength(6);
  });
});
