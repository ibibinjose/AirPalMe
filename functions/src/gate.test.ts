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
      bookings: {} as Record<string, Record<string, unknown>>,
      events: {} as Record<string, Record<string, unknown>>,
      plans: {} as Record<string, Record<string, unknown>>,
      writes: [] as { id: string; data: Record<string, unknown> }[],
      transactions: 0,
      audits: [] as unknown[],
      rateLimited: [] as string[],
      guestlistMarks: [] as unknown[][],
    },
  };
});

vi.mock("./admin", () => ({
  CALLABLE: {},
  requireAccount: (request: { auth?: { uid?: string } }) => {
    const uid = request.auth?.uid;
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in.");
    return uid;
  },
  isPlatformAdmin: () => fakes.isAdmin,
  db: {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          const store = name === "bookings" ? fakes.bookings : fakes.events;
          const data = store[id];
          return { exists: Boolean(data), id, data: () => data };
        },
        set: async (data: Record<string, unknown>) => {
          fakes.writes.push({ id: `${name}/${id}`, data });
          if (name === "bookings") fakes.bookings[id] = { ...fakes.bookings[id], ...data };
        },
      }),
    }),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      fakes.transactions += 1;
      return fn({
        get: (ref: { get: () => Promise<unknown> }) => ref.get(),
        set: (ref: { set: (data: unknown) => Promise<void> }, data: unknown) => ref.set(data),
      });
    },
  },
}));

vi.mock("./abuse", () => ({
  noteAppCheck: async () => undefined,
  enforceRateLimit: async (uid: string, action: string) => {
    fakes.rateLimited.push(`${uid}:${action}`);
  },
  writeAudit: async (row: unknown) => {
    fakes.audits.push(row);
  },
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: FakeHttpsError,
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

vi.mock("./guestlist", () => ({
  markTicketCheckedIn: (...args: unknown[]) => {
    fakes.guestlistMarks.push(args);
    return Promise.resolve();
  },
  scopeHostUids: async (scope: string, id: string) => {
    if (scope === "event") {
      const e = fakes.events[id] as { organiserUid?: string; coHostUids?: string[] } | undefined;
      if (!e?.organiserUid) return null;
      return { ownerUid: e.organiserUid, coHostUids: e.coHostUids || [] };
    }
    const p = fakes.plans[id] as { creator?: { uid?: string }; coHostUids?: string[] } | undefined;
    if (!p?.creator?.uid) return null;
    return { ownerUid: p.creator.uid, coHostUids: p.coHostUids || [] };
  },
}));

import { admitTicket, verifyTicket } from "./gate";

type Handler = (request: unknown) => Promise<Record<string, unknown>>;

const PAID_BOOKING = {
  title: "Rooftop Sessions",
  date: "2026-10-03",
  time: "19:00",
  priceCents: 8000,
  feeCents: 1200,
  paymentStatus: "paid",
  status: "confirmed",
  providerUid: "org-1",
  customerUid: "guest-9",
  eventId: "evt-1",
  spots: 2,
};

function run(handler: unknown, uid: string | undefined, data: unknown) {
  return (handler as unknown as Handler)({ auth: uid ? { uid, token: {} } : {}, data });
}

describe("gate scan", () => {
  afterEach(() => {
    fakes.isAdmin = false;
    fakes.bookings = {};
    fakes.events = {};
    fakes.plans = {};
    fakes.writes.length = 0;
    fakes.transactions = 0;
    fakes.audits.length = 0;
    fakes.rateLimited.length = 0;
    fakes.guestlistMarks.length = 0;
  });

  it("verifyTicket requires sign-in", async () => {
    await expect(run(verifyTicket, undefined, { ticketId: "bk-1" })).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("verifyTicket reports missing tickets as not-found", async () => {
    await expect(run(verifyTicket, "org-1", { ticketId: "bk-nope" })).rejects.toMatchObject({
      code: "not-found",
    });
  });

  it("verifyTicket denies strangers and the ticket owner", async () => {
    fakes.bookings = { "bk-1": { ...PAID_BOOKING } };
    fakes.events = { "evt-1": { organiserUid: "org-1" } };
    await expect(run(verifyTicket, "stranger", { ticketId: "bk-1" })).rejects.toMatchObject({
      code: "permission-denied",
    });
    await expect(run(verifyTicket, "guest-9", { ticketId: "bk-1" })).rejects.toMatchObject({
      code: "permission-denied",
    });
    expect(fakes.writes).toEqual([]);
  });

  it("verifyTicket admits event co-hosts and plan hosts", async () => {
    fakes.bookings = {
      "bk-1": { ...PAID_BOOKING },
      "bk-2": { ...PAID_BOOKING, eventId: undefined, planId: "plan-1", providerUid: "prov-9" },
    };
    fakes.events = { "evt-1": { organiserUid: "org-1", coHostUids: ["co-1"] } };
    fakes.plans = { "plan-1": { creator: { uid: "own-1" }, coHostUids: ["co-2"] } };
    const co = await run(verifyTicket, "co-1", { ticketId: "bk-1" });
    expect(co.ticketId).toBe("bk-1");
    const ph = await run(verifyTicket, "co-2", { ticketId: "bk-2" });
    expect(ph.ticketId).toBe("bk-2");
    await expect(run(verifyTicket, "stranger", { ticketId: "bk-2" })).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("verifyTicket returns the gate card for the organiser", async () => {
    fakes.bookings = { "bk-1": { ...PAID_BOOKING } };
    fakes.events = { "evt-1": { name: "Rooftop Sessions", organiserUid: "org-1" } };
    const res = await run(verifyTicket, "org-1", { ticketId: "bk-1" });
    expect(res).toMatchObject({
      ticketId: "bk-1",
      eventId: "evt-1",
      eventName: "Rooftop Sessions",
      title: "Rooftop Sessions",
      spots: 2,
      displayPaid: true,
      valid: true,
      reason: null,
      admittedAt: null,
    });
    expect(res).not.toHaveProperty("customerUid");
    expect(fakes.rateLimited).toContain("org-1:gate");
  });

  it("verifyTicket admits via the organiser fallback on legacy rows", async () => {
    fakes.bookings = { "bk-1": { ...PAID_BOOKING, providerUid: "legacy-provider" } };
    fakes.events = { "evt-1": { organiserUid: "org-1" } };
    const res = await run(verifyTicket, "org-1", { ticketId: "bk-1" });
    expect(res).toMatchObject({ ticketId: "bk-1", valid: true });
  });

  it("verifyTicket reports unpaid tickets with a reason, never valid", async () => {
    fakes.bookings = { "bk-1": { ...PAID_BOOKING, paymentStatus: "unpaid" } };
    const res = await run(verifyTicket, "org-1", { ticketId: "bk-1" });
    expect(res).toMatchObject({ valid: false, reason: "unpaid", displayPaid: false });
  });

  it("admitTicket stamps admission once and audits it", async () => {
    fakes.bookings = { "bk-1": { ...PAID_BOOKING } };
    const res = await run(admitTicket, "org-1", { ticketId: "bk-1" });
    expect(res).toMatchObject({ ticketId: "bk-1", already: false });
    expect(typeof res.admittedAt).toBe("string");
    expect(fakes.writes).toHaveLength(1);
    expect(fakes.writes[0]).toMatchObject({
      id: "bookings/bk-1",
      data: { admittedByUid: "org-1" },
    });
    expect(fakes.writes[0]!.data.admittedAt).toBe(res.admittedAt);
    expect(fakes.audits).toHaveLength(1);
    expect(fakes.guestlistMarks).toEqual([["event", "evt-1", "bk-1", "guest-9"]]);
  });

  it("admitTicket is idempotent on double scans", async () => {
    fakes.bookings = { "bk-1": { ...PAID_BOOKING, admittedAt: "2026-10-03T09:00:00Z" } };
    const res = await run(admitTicket, "org-1", { ticketId: "bk-1" });
    expect(res).toEqual({ ticketId: "bk-1", admittedAt: "2026-10-03T09:00:00Z", already: true });
    expect(fakes.writes).toEqual([]);
    expect(fakes.audits).toEqual([]);
    expect(fakes.guestlistMarks).toEqual([]);
  });

  it("admitTicket decides inside one transaction and keeps the first stamp on rescan", async () => {
    fakes.bookings = { "bk-1": { ...PAID_BOOKING } };
    const first = await run(admitTicket, "org-1", { ticketId: "bk-1" });
    const second = await run(admitTicket, "org-1", { ticketId: "bk-1" });
    expect(fakes.transactions).toBe(2);
    expect(second).toEqual({ ticketId: "bk-1", admittedAt: first.admittedAt, already: true });
    expect(fakes.writes).toHaveLength(1);
    expect(fakes.audits).toHaveLength(1);
    expect(fakes.guestlistMarks).toHaveLength(1);
  });

  it("admitTicket refuses cancelled tickets without writing", async () => {
    fakes.bookings = { "bk-1": { ...PAID_BOOKING, status: "cancelled" } };
    await expect(run(admitTicket, "org-1", { ticketId: "bk-1" })).rejects.toMatchObject({
      code: "failed-precondition",
    });
    expect(fakes.writes).toEqual([]);
  });

  it("admitTicket rejects empty ids", async () => {
    await expect(run(admitTicket, "org-1", { ticketId: " " })).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});
