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

import {
  DIGITAL_GOODS_TAX_CODE,
  buildCheckoutSessionParams,
  buildProductCreateParams,
  normalizeCurrency,
  normalizeTaxCode,
} from "./managed-payments";
import { recordManagedCheckoutCompleted } from "./stripe";

describe("managed product params", () => {
  it("creates a digital product with an eligible tax code and default price", () => {
    const params = buildProductCreateParams({
      name: "Harbour Walk (e-guide)",
      description: "A self-guided walk",
      amountCents: 1000,
      currency: "aud",
      taxCode: DIGITAL_GOODS_TAX_CODE,
    });
    expect(params.name).toBe("Harbour Walk (e-guide)");
    expect(params.tax_code).toBe("txcd_10103100");
    expect(params.default_price_data).toEqual({ unit_amount: 1000, currency: "aud" });
  });

  it("defaults currency and tax code, rejecting bad values", () => {
    expect(normalizeCurrency(undefined)).toBe("aud");
    expect(normalizeCurrency("USD")).toBe("usd");
    expect(() => normalizeCurrency("xx1")).toThrow();
    expect(normalizeTaxCode(undefined)).toBe(DIGITAL_GOODS_TAX_CODE);
    expect(normalizeTaxCode("txcd_10103100")).toBe("txcd_10103100");
    expect(() => normalizeTaxCode("nope")).toThrow();
  });
});

describe("managed checkout session params", () => {
  it("enables managed payments and reuses the stored price id", () => {
    const params = buildCheckoutSessionParams({
      priceId: "price_stored_123",
      buyerUid: "buyer-1",
      paymentId: "mpay_1",
      productId: "mp_1",
      origin: "https://airpal.me",
    });
    expect(params.mode).toBe("payment");
    expect(params.managed_payments).toEqual({ enabled: true });
    expect(params.line_items).toEqual([{ price: "price_stored_123", quantity: 1 }]);
    expect(params.metadata?.managedPaymentId).toBe("mpay_1");
  });

  it("reuses the stored customer id, else falls back to email", () => {
    const withCustomer = buildCheckoutSessionParams({
      priceId: "price_1",
      buyerUid: "buyer-1",
      paymentId: "mpay_1",
      productId: "mp_1",
      customerId: "cus_123",
      customerEmail: "guest@example.com",
      origin: "https://airpal.me",
    });
    expect(withCustomer.customer).toBe("cus_123");
    expect(withCustomer.customer_email).toBeUndefined();

    const withEmail = buildCheckoutSessionParams({
      priceId: "price_1",
      buyerUid: "buyer-1",
      paymentId: "mpay_1",
      productId: "mp_1",
      customerEmail: "guest@example.com",
      origin: "https://airpal.me",
    });
    expect(withEmail.customer).toBeUndefined();
    expect(withEmail.customer_email).toBe("guest@example.com");
  });
});

function fakeStore(ledger: Record<string, unknown> | null) {
  const sets: Array<{ collection: string; id: string; data: unknown }> = [];
  const makeDoc = (collectionName: string, id: string) => ({
    get: () => Promise.resolve({ exists: ledger !== null, data: () => ledger as unknown }),
    set: (data: unknown) => {
      sets.push({ collection: collectionName, id, data });
      return Promise.resolve();
    },
    collection: (sub: string) => ({ doc: (subId: string) => makeDoc(`${collectionName}/${sub}`, subId) }),
  });
  const store = { collection: (name: string) => ({ doc: (id: string) => makeDoc(name, id) }) };
  return { store, sets };
}

function completedSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_test_123",
    payment_status: "paid",
    amount_total: 1000,
    currency: "aud",
    customer: "cus_123",
    payment_intent: "pi_123",
    metadata: { managedPaymentId: "mpay_1" },
    ...overrides,
  } as unknown as Parameters<typeof recordManagedCheckoutCompleted>[0];
}

describe("recordManagedCheckoutCompleted", () => {
  it("ignores sessions without a managed payment id or without collection", async () => {
    const { store, sets } = fakeStore({ status: "pending", buyerUid: "buyer-1" });
    expect(await recordManagedCheckoutCompleted(completedSession({ metadata: {} }), store)).toBe(false);
    expect(await recordManagedCheckoutCompleted(completedSession({ payment_status: "unpaid" }), store)).toBe(false);
    expect(sets).toHaveLength(0);
  });

  it("marks the ledger paid, persists the customer, and writes the payment record", async () => {
    const { store, sets } = fakeStore({ status: "pending", buyerUid: "buyer-1", productId: "mp_1" });
    expect(await recordManagedCheckoutCompleted(completedSession(), store)).toBe(true);
    const byCollection = (name: string) => sets.filter((s) => s.collection === name);
    expect(byCollection("managed_payments")).toHaveLength(1);
    expect(byCollection("users")).toHaveLength(1);
    expect(byCollection("payments")).toHaveLength(1);
    const ledgerWrite = byCollection("managed_payments")[0]!.data as Record<string, unknown>;
    expect(ledgerWrite.status).toBe("paid");
    expect(ledgerWrite.stripeCustomerId).toBe("cus_123");
    const userWrite = byCollection("users")[0]!;
    expect(userWrite.id).toBe("buyer-1");
  });

  it("is idempotent and skips unknown ledgers", async () => {
    const paid = fakeStore({ status: "paid", buyerUid: "buyer-1" });
    expect(await recordManagedCheckoutCompleted(completedSession(), paid.store)).toBe(false);
    expect(paid.sets).toHaveLength(0);
    const missing = fakeStore(null);
    expect(await recordManagedCheckoutCompleted(completedSession(), missing.store)).toBe(false);
  });
});
