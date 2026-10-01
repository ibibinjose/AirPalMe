import { generateKeyPairSync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

const { fakes } = vi.hoisted(() => ({
  fakes: { docs: {} as Record<string, Record<string, unknown> | undefined> },
}));

function docRef(path: string) {
  return {
    get: async () => {
      const data = fakes.docs[path];
      return { exists: Boolean(data), data: () => data };
    },
  };
}

vi.mock("./admin", () => ({
  db: { collection: (name: string) => ({ doc: (id: string) => docRef(`${name}/${id}`) }) },
}));

vi.mock("firebase-functions/v2/https", () => ({
  onRequest: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

vi.mock("firebase-functions/params", () => ({
  defineSecret: vi.fn(() => ({
    value: () => {
      throw new Error("no secret");
    },
  })),
}));

import { cardSavePayload, googleWalletPass, sanitizeObjectId, ticketSavePayload } from "./google-wallet";

type Handler = (
  req: { method: string; path: string },
  res: {
    status: (c: number) => { send: (b: unknown) => void; json: (b: unknown) => void };
  },
) => Promise<void>;

const handler = googleWalletPass as unknown as Handler;

function run(method: string, path: string) {
  const out: { status: number; body: unknown } = { status: 0, body: undefined };
  const res = {
    status: (c: number) => ({
      send: (b: unknown) => {
        out.status = c;
        out.body = b;
      },
      json: (b: unknown) => {
        out.status = c;
        out.body = b;
      },
    }),
  };
  return handler({ method, path }, res).then(() => out);
}

afterEach(() => {
  fakes.docs = {};
  delete process.env.GOOGLE_WALLET_SA_JSON;
  delete process.env.GOOGLE_WALLET_ISSUER_ID;
});

function configure() {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  process.env.GOOGLE_WALLET_ISSUER_ID = "issuer123";
  process.env.GOOGLE_WALLET_SA_JSON = JSON.stringify({
    client_email: "wallet@test.iam.gserviceaccount.com",
    private_key: privateKey,
  });
}

describe("googleWalletPass", () => {
  it("rejects non-GET methods and malformed paths", async () => {
    expect((await run("POST", "/api/wallet/google/ticket/b1")).status).toBe(405);
    expect((await run("GET", "/api/wallet/google/other/b1")).status).toBe(400);
  });

  it("answers 501 while the service account is not configured", async () => {
    const out = await run("GET", "/api/wallet/google/ticket/b1");
    expect(out.status).toBe(501);
    expect(out.body).toEqual({ error: "google_wallet_not_configured" });
  });

  it("404s unknown bookings and handles once configured", async () => {
    configure();
    expect((await run("GET", "/api/wallet/google/ticket/nope")).status).toBe(404);
    expect((await run("GET", "/api/wallet/google/card/@ghost")).status).toBe(404);
  });

  it("mints a signed save link for a live booking", async () => {
    configure();
    fakes.docs["bookings/b1"] = {
      title: "Rooftop Set",
      date: "2026-10-02",
      time: "19:00",
      suburb: "Surry Hills",
      providerName: "AirPal Live",
      customerUid: "u1",
    };
    fakes.docs["users/u1"] = { displayName: "Bibin" };
    const out = await run("GET", "/api/wallet/google/ticket/b1");
    expect(out.status).toBe(200);
    const saveUrl = (out.body as { saveUrl: string }).saveUrl;
    expect(saveUrl.startsWith("https://pay.google.com/gp/v/save/")).toBe(true);
    const decoded = jwt.decode(saveUrl.split("/save/")[1] as string) as {
      iss: string;
      aud: string;
      payload: { eventTicketObjects: Record<string, unknown>[] };
    };
    expect(decoded.iss).toBe("wallet@test.iam.gserviceaccount.com");
    expect(decoded.aud).toBe("google");
    const obj = decoded.payload.eventTicketObjects[0] as Record<string, unknown>;
    expect(obj.ticketNumber).toBe("b1");
    expect(obj.hexBackgroundColor).toBe("#1805db");
    expect(obj.barcode).toEqual({ type: "QR_CODE", value: "b1" });
  });

  it("mints a profile card save link for a known handle", async () => {
    configure();
    fakes.docs["handles/bibin"] = { profileId: "p1" };
    fakes.docs["profiles/p1"] = { displayName: "Bibin", bio: "Host" };
    const out = await run("GET", "/api/wallet/google/card/bibin");
    expect(out.status).toBe(200);
    const saveUrl = (out.body as { saveUrl: string }).saveUrl;
    const decoded = jwt.decode(saveUrl.split("/save/")[1] as string) as {
      payload: { genericObjects: Record<string, unknown>[] };
    };
    const obj = decoded.payload.genericObjects[0] as Record<string, unknown>;
    expect(obj.hexBackgroundColor).toBe("#1805db");
    expect(obj.barcode).toEqual({ type: "QR_CODE", value: "https://airpal.me/@bibin" });
  });
});

describe("wallet payload builders", () => {
  it("sanitizes object ids to Wallet-safe characters", () => {
    expect(sanitizeObjectId("abc 123/xy")).toBe("abc_123_xy");
    expect(sanitizeObjectId("")).toBe("unknown");
  });

  it("builds Sydney-timezoned ticket payloads on AirPal Blue", () => {
    const payload = ticketSavePayload({
      issuerId: "issuer123",
      bookingId: "b1",
      title: "Show",
      date: "2026-10-02",
      time: "19:00",
      venue: "Enmore",
      guestName: "Bibin",
    });
    const obj = (payload.eventTicketObjects as Record<string, unknown>[])[0] as Record<string, unknown>;
    expect(obj.id).toBe("issuer123.b1");
    expect(obj.hexBackgroundColor).toBe("#1805db");
    expect(obj.dateTime).toEqual({
      start: { date: "2026-10-02", time: { hours: 19, minutes: 0 }, timeZone: { id: "Australia/Sydney" } },
    });
  });

  it("builds profile card payloads with a profile link", () => {
    const payload = cardSavePayload({ issuerId: "issuer123", handle: "bibin", name: "Bibin", bio: "" });
    const obj = (payload.genericObjects as Record<string, unknown>[])[0] as Record<string, unknown>;
    expect(obj.id).toBe("issuer123.bibin");
    expect(obj.linksModuleData).toEqual({ uris: [{ uri: "https://airpal.me/@bibin", description: "View profile" }] });
  });
});
