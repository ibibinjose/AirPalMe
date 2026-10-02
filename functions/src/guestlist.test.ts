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
      events: {} as Record<string, Record<string, unknown>>,
      guestlist: {} as Record<string, Record<string, Record<string, unknown>>>,
      users: {} as Record<string, Record<string, unknown>>,
      audits: [] as unknown[],
    },
  };
});

function rowsOf(eventId: string, only?: string[]) {
  return Object.entries(fakes.guestlist[eventId] || {})
    .filter(([, d]) => !only || only.includes(String(d.status)))
    .map(([id, d]) => ({
      id,
      data: () => d,
      ref: {
        set: async (data: Record<string, unknown>) => {
          fakes.guestlist[eventId][id] = { ...fakes.guestlist[eventId][id], ...data };
        },
      },
    }));
}

function guestCol(eventId: string) {
  const store = () => {
    if (!fakes.guestlist[eventId]) fakes.guestlist[eventId] = {};
    return fakes.guestlist[eventId];
  };
  return {
    doc: (entryId: string) => ({
      get: async () => {
        const data = store()[entryId];
        return { exists: Boolean(data), data: () => data };
      },
      set: async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
        store()[entryId] = opts?.merge ? { ...store()[entryId], ...data } : data;
      },
    }),
    get: async () => ({ docs: rowsOf(eventId) }),
    where: (_field: string, _op: string, values: string[]) => ({
      get: async () => ({ docs: rowsOf(eventId, values) }),
    }),
  };
}

vi.mock("./admin", () => ({
  CALLABLE: {},
  requireAccount: (request: { auth?: { uid?: string } }) => {
    const uid = request.auth?.uid;
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in.");
    return uid;
  },
  isPlatformAdmin: () => fakes.isAdmin,
  db: {
    collection: (name: string) => {
      if (name === "events") {
        return {
          doc: (id: string) => ({
            get: async () => {
              const data = fakes.events[id];
              return { exists: Boolean(data), data: () => data };
            },
            set: async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
              fakes.events[id] = opts?.merge ? { ...fakes.events[id], ...data } : data;
            },
            collection: (sub: string) => {
              if (sub !== "guestlist") throw new Error(`unexpected subcollection ${sub}`);
              return guestCol(id);
            },
          }),
        };
      }
      if (name === "users") {
        return {
          doc: (id: string) => ({
            get: async () => {
              const data = fakes.users[id];
              return { exists: Boolean(data), data: () => data };
            },
          }),
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
    batch: () => {
      const ops: (() => Promise<void>)[] = [];
      return {
        set: (
          ref: { set: (d: Record<string, unknown>, o?: unknown) => Promise<void> },
          data: Record<string, unknown>,
          opts?: unknown,
        ) => {
          ops.push(() => ref.set(data, opts));
        },
        commit: async () => {
          for (const op of ops) await op();
        },
      };
    },
  },
}));

vi.mock("./abuse", () => ({
  noteAppCheck: async () => undefined,
  enforceRateLimit: async () => undefined,
  writeAudit: async (row: unknown) => {
    fakes.audits.push(row);
  },
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: FakeHttpsError,
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

vi.mock("firebase-functions/v2/firestore", () => ({
  onDocumentWritten: vi.fn((_path: unknown, handler: unknown) => handler),
}));

import {
  checkInGuest,
  closeGuestlist,
  markTicketCheckedIn,
  onGuestBookingWritten,
  onGuestRsvpWritten,
} from "./guestlist";

type Handler = (request: unknown) => Promise<Record<string, unknown>>;
type Trigger = (event: unknown) => Promise<void>;

function run(handler: unknown, uid: string | undefined, data: unknown) {
  return (handler as unknown as Handler)({ auth: uid ? { uid, token: {} } : {}, data });
}

function fire(trigger: unknown, params: Record<string, string>, afterData?: Record<string, unknown>) {
  return (trigger as unknown as Trigger)({
    params,
    data: { after: { data: () => afterData } },
  });
}

describe("guestlist server", () => {
  afterEach(() => {
    fakes.isAdmin = false;
    fakes.events = {};
    fakes.guestlist = {};
    fakes.users = {};
    fakes.audits.length = 0;
  });

  it("checkInGuest requires sign-in and the organiser", async () => {
    fakes.events = { "evt-1": { organiserUid: "org-1" } };
    await expect(run(checkInGuest, undefined, { eventId: "evt-1", entryId: "a" })).rejects.toMatchObject({
      code: "unauthenticated",
    });
    await expect(run(checkInGuest, "stranger", { eventId: "evt-1", entryId: "a" })).rejects.toMatchObject({
      code: "permission-denied",
    });
    await expect(run(checkInGuest, "org-1", { eventId: "nope", entryId: "a" })).rejects.toMatchObject({
      code: "not-found",
    });
  });

  it("checkInGuest flips going rows and is idempotent", async () => {
    fakes.events = { "evt-1": { organiserUid: "org-1" } };
    fakes.guestlist = { "evt-1": { door1: { name: "Walk In", status: "going", partySize: 2 } } };
    const first = await run(checkInGuest, "org-1", { eventId: "evt-1", entryId: "door1" });
    expect(first.already).toBe(false);
    expect(fakes.guestlist["evt-1"].door1.status).toBe("checked-in");
    const second = await run(checkInGuest, "org-1", { eventId: "evt-1", entryId: "door1" });
    expect(second.already).toBe(true);
    expect(fakes.events["evt-1"].guestCounts).toMatchObject({ checkedInHeads: 2 });
  });

  it("closeGuestlist turns the waiting into no-shows, never the checked-in", async () => {
    fakes.events = { "evt-1": { organiserUid: "org-1" } };
    fakes.guestlist = {
      "evt-1": {
        a: { name: "A", status: "going", partySize: 1 },
        b: { name: "B", status: "invited", partySize: 2 },
        c: { name: "C", status: "checked-in", partySize: 1 },
      },
    };
    await expect(run(closeGuestlist, "stranger", { eventId: "evt-1" })).rejects.toMatchObject({
      code: "permission-denied",
    });
    const done = await run(closeGuestlist, "org-1", { eventId: "evt-1" });
    expect(done.closed).toBe(2);
    expect(fakes.guestlist["evt-1"].a.status).toBe("no-show");
    expect(fakes.guestlist["evt-1"].b.status).toBe("no-show");
    expect(fakes.guestlist["evt-1"].c.status).toBe("checked-in");
    expect(fakes.events["evt-1"].guestCounts).toMatchObject({ noshowHeads: 3, checkedInHeads: 1 });
  });

  it("RSVP going upserts the account row with the profile name", async () => {
    fakes.events = { "evt-1": { organiserUid: "org-1" } };
    fakes.users = { "u-9": { displayName: "Ava Stone", handle: "ava", isVerified: true } };
    await fire(onGuestRsvpWritten, { uid: "u-9", eventId: "evt-1" }, { status: "going" });
    expect(fakes.guestlist["evt-1"]["rsvp_u-9"]).toMatchObject({
      name: "Ava Stone",
      handle: "ava",
      verified: true,
      status: "going",
      source: "rsvp",
    });
    expect(fakes.events["evt-1"].guestCounts).toMatchObject({ goingHeads: 1 });
  });

  it("RSVP withdrawal cancels the row but never a checked-in guest", async () => {
    fakes.events = { "evt-1": { organiserUid: "org-1" } };
    fakes.guestlist = {
      "evt-1": {
        rsvp_u1: { name: "A", status: "going", partySize: 1, source: "rsvp" },
        rsvp_u2: { name: "B", status: "checked-in", partySize: 1, source: "rsvp" },
      },
    };
    await fire(onGuestRsvpWritten, { uid: "u1", eventId: "evt-1" }, { status: "interested" });
    await fire(onGuestRsvpWritten, { uid: "u2", eventId: "evt-1" }, { status: null } as never);
    expect(fakes.guestlist["evt-1"].rsvp_u1.status).toBe("cancelled");
    expect(fakes.guestlist["evt-1"].rsvp_u2.status).toBe("checked-in");
  });

  it("RSVP for an unknown event is skipped", async () => {
    await fire(onGuestRsvpWritten, { uid: "u-9", eventId: "local-only" }, { status: "going" });
    expect(fakes.guestlist["local-only"]).toBeUndefined();
  });

  it("paid ticket bookings upsert the ticket row; pending ones wait", async () => {
    fakes.events = { "evt-1": { organiserUid: "org-1" } };
    fakes.users = { "g-1": { displayName: "Theo" } };
    await fire(
      onGuestBookingWritten,
      { bookingId: "bk-1" },
      {
        eventId: "evt-1",
        customerUid: "g-1",
        priceCents: 5000,
        paymentStatus: "paid",
        status: "confirmed",
        spots: 3,
      },
    );
    expect(fakes.guestlist["evt-1"]["t_bk-1"]).toMatchObject({
      name: "Theo",
      status: "going",
      partySize: 3,
      ticketId: "bk-1",
      source: "ticket",
    });
    await fire(
      onGuestBookingWritten,
      { bookingId: "bk-2" },
      { eventId: "evt-1", customerUid: "g-2", priceCents: 5000, paymentStatus: "unpaid", status: "pending" },
    );
    expect(fakes.guestlist["evt-1"]["t_bk-2"]).toBeUndefined();
  });

  it("refunded bookings cancel the ticket row", async () => {
    fakes.events = { "evt-1": { organiserUid: "org-1" } };
    fakes.guestlist = { "evt-1": { "t_bk-1": { name: "T", status: "going", partySize: 1 } } };
    await fire(
      onGuestBookingWritten,
      { bookingId: "bk-1" },
      { eventId: "evt-1", customerUid: "g-1", priceCents: 5000, paymentStatus: "refunded", status: "refunded" },
    );
    expect(fakes.guestlist["evt-1"]["t_bk-1"].status).toBe("cancelled");
  });

  it("markTicketCheckedIn prefers the ticket row, then the RSVP row", async () => {
    fakes.events = { "evt-1": { organiserUid: "org-1" } };
    fakes.guestlist = {
      "evt-1": {
        "t_bk-1": { name: "T", status: "going", partySize: 2 },
        rsvp_g2: { name: "G", status: "going", partySize: 1 },
      },
    };
    await markTicketCheckedIn("evt-1", "bk-1", "g-1");
    expect(fakes.guestlist["evt-1"]["t_bk-1"].status).toBe("checked-in");
    await markTicketCheckedIn("evt-1", "bk-9", "g2");
    expect(fakes.guestlist["evt-1"].rsvp_g2.status).toBe("checked-in");
    expect(fakes.guestlist["evt-1"].rsvp_g2.ticketId).toBe("bk-9");
  });
});
