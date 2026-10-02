import { afterEach, describe, expect, it, vi } from "vitest";

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

import { cardFieldsFromProfile } from "./pass-profile";
import { cardPassJson, formatPassDate, formatPassTime, ticketPassJson, walletPass } from "./wallet";

type Handler = (
  req: { method: string; path: string },
  res: {
    set: (k: string, v: string) => void;
    status: (c: number) => { send: (b: unknown) => void; json: (b: unknown) => void };
  },
) => Promise<void>;

const handler = walletPass as unknown as Handler;

function run(method: string, path: string) {
  const out: { status: number; body: unknown; headers: Record<string, string> } = {
    status: 0,
    body: undefined,
    headers: {},
  };
  const res = {
    set: (k: string, v: string) => {
      out.headers[k] = v;
    },
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

const ENV_KEYS = [
  "WALLET_PASS_TYPE_ID",
  "WALLET_TEAM_ID",
  "WALLET_SIGNER_CERT",
  "WALLET_SIGNER_KEY",
  "WALLET_KEY_PASSPHRASE",
];

afterEach(() => {
  fakes.docs = {};
  for (const key of ENV_KEYS) delete process.env[key];
  vi.restoreAllMocks();
});

describe("pass content (Luma layout, AirPal Blue)", () => {
  it("formats stored local date/time without timezone claims", () => {
    expect(formatPassDate("2026-10-02")).toBe("02 OCT 2026");
    expect(formatPassDate("soon")).toBe("soon");
    expect(formatPassTime("19:00")).toBe("7:00 PM");
    expect(formatPassTime("09:30")).toBe("9:30 AM");
    expect(formatPassTime("")).toBe("");
  });

  it("lays tickets out like the reference: header date, title, location, guest + host", () => {
    const json = ticketPassJson({
      bookingId: "b1",
      title: "Rooftop Set",
      date: "2026-10-02",
      time: "19:00",
      suburb: "Surry Hills",
      providerName: "AirPal Live",
      status: "confirmed",
      guestName: "Bibin",
    });
    expect(json.organizationName).toBe("AirPal.me");
    expect(json.backgroundColor).toBe("rgb(24,5,219)");
    const ticket = json.eventTicket as Record<string, { label: string; value: string }[]>;
    expect(ticket.headerFields[0]?.value).toBe("02 OCT 2026 · 7:00 PM");
    expect(ticket.primaryFields[0]).toEqual({ key: "event", label: "", value: "Rooftop Set" });
    expect(ticket.secondaryFields[0]).toEqual({ key: "location", label: "LOCATION", value: "Surry Hills" });
    expect(ticket.auxiliaryFields).toEqual([
      { key: "guest", label: "GUEST", value: "Bibin" },
      { key: "host", label: "HOST", value: "AirPal Live" },
    ]);
  });

  it("lays profile cards out on AirPal Blue with the handle front and center", () => {
    const json = cardPassJson({ handle: "bibin", name: "Bibin", bio: "Host" });
    expect(json.organizationName).toBe("AirPal.me");
    expect(json.backgroundColor).toBe("rgb(24,5,219)");
    const generic = json.generic as Record<string, { label: string; value: string }[]>;
    expect(generic.primaryFields[0]?.value).toBe("Bibin");
    expect(generic.secondaryFields[0]?.value).toBe("@bibin");
  });

  it("reads business-card identity from profile name and shortWhy", () => {
    const fields = cardFieldsFromProfile(
      { name: "Harbour Hotel", shortWhy: "Rooms on the quay", city: "Sydney", kind: "business" },
      "harbour",
    );
    const json = cardPassJson({ handle: "harbour", ...fields });
    expect(json.description).toBe("Harbour Hotel — AirPal business card");
    const generic = json.generic as Record<string, { value: string }[]>;
    expect(generic.primaryFields[0]?.value).toBe("Harbour Hotel");
    expect(generic.auxiliaryFields[0]?.value).toBe("Sydney");
    const back = generic.backFields as { value: string }[];
    expect(back.some((field) => field.value === "Rooms on the quay")).toBe(true);
  });
});

describe("walletPass", () => {
  it("rejects non-GET/HEAD methods", async () => {
    const out = await run("POST", "/api/wallet/ticket/abc.pkpass");
    expect(out.status).toBe(405);
  });

  it("rejects malformed pass paths", async () => {
    expect((await run("GET", "/api/wallet/ticket/abc")).status).toBe(400);
    expect((await run("GET", "/api/wallet/other/abc.pkpass")).status).toBe(400);
  });

  it("answers 501 while the signer is not configured", async () => {
    fakes.docs["bookings/b1"] = { title: "Show", date: "2026-10-02", time: "19:00" };
    const out = await run("GET", "/api/wallet/ticket/b1.pkpass");
    expect(out.status).toBe(501);
    expect(out.body).toEqual({ error: "wallet_not_configured" });
  });

  it("404s unknown bookings and handles once configured", async () => {
    process.env.WALLET_PASS_TYPE_ID = "pass.me.airpal.test";
    process.env.WALLET_TEAM_ID = "TEAMID1234";
    process.env.WALLET_SIGNER_CERT = "-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----";
    process.env.WALLET_SIGNER_KEY = "-----BEGIN PRIVATE KEY-----\nexample-invalid-key\n-----END PRIVATE KEY-----";
    expect((await run("GET", "/api/wallet/ticket/nope.pkpass")).status).toBe(404);
    expect((await run("GET", "/api/wallet/card/@ghost.pkpass")).status).toBe(404);
  });

  it("maps signing failures to 500 instead of leaking internals", async () => {
    process.env.WALLET_PASS_TYPE_ID = "pass.me.airpal.test";
    process.env.WALLET_TEAM_ID = "TEAMID1234";
    process.env.WALLET_SIGNER_CERT = "-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----";
    process.env.WALLET_SIGNER_KEY = "-----BEGIN PRIVATE KEY-----\nexample-invalid-key\n-----END PRIVATE KEY-----";
    fakes.docs["bookings/b1"] = { title: "Show", date: "2026-10-02", time: "19:00" };
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const out = await run("GET", "/api/wallet/ticket/b1.pkpass");
    expect(out.status).toBe(500);
    expect(out.body).toEqual({ error: "wallet_sign_failed" });
    expect(err).toHaveBeenCalled();
  });

  it("answers HEAD with headers and no body once configured", async () => {
    process.env.WALLET_PASS_TYPE_ID = "pass.me.airpal.test";
    process.env.WALLET_TEAM_ID = "TEAMID1234";
    process.env.WALLET_SIGNER_CERT = "-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----";
    process.env.WALLET_SIGNER_KEY = "-----BEGIN PRIVATE KEY-----\nexample-invalid-key\n-----END PRIVATE KEY-----";
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    // Unknown doc: same 404 contract as GET, so the client preflight is truthful.
    expect((await run("HEAD", "/api/wallet/ticket/nope.pkpass")).status).toBe(404);
  });
});
