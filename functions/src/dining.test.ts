import { describe, expect, it, vi } from "vitest";

vi.mock("firebase-functions/params", () => ({
  defineSecret: () => ({ value: () => "" }),
}));

vi.mock("stripe", () => ({
  default: class StripeMock {
    static webhooks = { constructEvent: vi.fn() };
  },
}));

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
  onRequest: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

import type { MenuItem } from "../../shared/airpal-data";
import { validateOrderLines } from "./dining";
import { recordDiningOrderPaid } from "./stripe";

const MENU: MenuItem[] = [
  { id: "m-butter-chicken", name: "Butter Chicken", category: "Mains", price: 26, description: "", available: true },
  { id: "m-naan", name: "Garlic Naan", category: "Starters", price: 6, description: "", available: true },
  { id: "m-gone", name: "Old Special", category: "Mains", price: 20, description: "", available: false },
];

describe("validateOrderLines", () => {
  it("resolves prices server-side from the live menu", () => {
    const { lines, totalCents } = validateOrderLines(
      [
        { menuItemId: "m-butter-chicken", qty: 2 },
        { menuItemId: "m-naan", qty: 1 },
      ],
      MENU,
    );
    expect(lines).toEqual([
      { menuItemId: "m-butter-chicken", name: "Butter Chicken", unitCents: 2600, qty: 2 },
      { menuItemId: "m-naan", name: "Garlic Naan", unitCents: 600, qty: 1 },
    ]);
    expect(totalCents).toBe(5800);
  });

  it("rejects unknown dishes, unavailable dishes, and bad quantities", () => {
    expect(() => validateOrderLines([], MENU)).toThrow();
    expect(() => validateOrderLines([{ menuItemId: "m-nope", qty: 1 }], MENU)).toThrow();
    expect(() => validateOrderLines([{ menuItemId: "m-gone", qty: 1 }], MENU)).toThrow();
    expect(() => validateOrderLines([{ menuItemId: "m-naan", qty: 0 }], MENU)).toThrow();
    expect(() => validateOrderLines([{ menuItemId: "m-naan", qty: 21 }], MENU)).toThrow();
  });
});

interface FakeDoc {
  get: () => Promise<{ exists: boolean; data: () => unknown }>;
  set: (data: unknown) => Promise<void>;
  collection: (sub: string) => { doc: (subId: string) => FakeDoc };
}

function fakeOrderStore(status: string | null) {
  const sets: Array<{ data: unknown }> = [];
  const makeDoc = (): FakeDoc => ({
    get: () => Promise.resolve({ exists: status !== null, data: () => ({ status }) as unknown }),
    set: (data: unknown) => {
      sets.push({ data });
      return Promise.resolve();
    },
    collection: () => ({ doc: () => makeDoc() }),
  });
  const store = { collection: () => ({ doc: () => makeDoc() }) };
  return { store, sets };
}

function paidSession() {
  return {
    id: "cs_test_order",
    customer: "cus_1",
    payment_intent: "pi_1",
  } as unknown as Parameters<typeof recordDiningOrderPaid>[0]["session"];
}

describe("recordDiningOrderPaid", () => {
  it("marks a pending order paid with Stripe ids", async () => {
    const { store, sets } = fakeOrderStore("pending");
    const ok = await recordDiningOrderPaid({
      propertyId: "harbour-hotel",
      orderId: "dor_1",
      session: paidSession(),
      paymentIntentId: "pi_1",
      store,
    });
    expect(ok).toBe(true);
    expect(sets).toHaveLength(1);
    const write = sets[0]!.data as Record<string, unknown>;
    expect(write.status).toBe("paid");
    expect(write.stripePaymentIntentId).toBe("pi_1");
    expect(write.stripeCustomerId).toBe("cus_1");
  });

  it("skips non-pending orders and unknown orders", async () => {
    const preparing = fakeOrderStore("preparing");
    expect(
      await recordDiningOrderPaid({
        propertyId: "p",
        orderId: "o",
        session: paidSession(),
        paymentIntentId: "pi_1",
        store: preparing.store,
      }),
    ).toBe(false);
    expect(preparing.sets).toHaveLength(0);
    const missing = fakeOrderStore(null);
    expect(
      await recordDiningOrderPaid({
        propertyId: "p",
        orderId: "o",
        session: paidSession(),
        paymentIntentId: "pi_1",
        store: missing.store,
      }),
    ).toBe(false);
  });
});
