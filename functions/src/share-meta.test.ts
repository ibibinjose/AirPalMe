import { afterEach, describe, expect, it, vi } from "vitest";

const { fakes } = vi.hoisted(() => ({
  fakes: {
    docs: {} as Record<string, Record<string, unknown> | undefined>,
    invitePlans: [] as Record<string, unknown>[],
    fetchedUrls: [] as string[],
    fetchOk: true,
  },
}));

function docRef(path: string) {
  return {
    get: async () => {
      const data = fakes.docs[path];
      return { exists: Boolean(data), data: () => data };
    },
    collection: (sub: string) => ({
      doc: (id: string) => docRef(`${path}/${sub}/${id}`),
    }),
  };
}

vi.mock("./admin", () => ({
  db: {
    collection: (name: string) => ({
      doc: (id: string) => docRef(`${name}/${id}`),
      where: (field: string, op: string, value: unknown) => ({
        limit: (_n: number) => ({
          get: async () => {
            expect(field).toBe("inviteCode");
            expect(op).toBe("==");
            const docs = fakes.invitePlans
              .filter((p) => p.inviteCode === value)
              .map((data) => ({ data: () => data }));
            return { empty: docs.length === 0, docs };
          },
        }),
      }),
    }),
  },
}));

vi.mock("firebase-functions/v2/https", () => ({
  onRequest: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

import { resetShareMetaCacheForTests, shareMeta } from "./share-meta";

type Handler = (
  req: { method: string; path: string; headers: Record<string, string> },
  res: {
    set: (k: string, v: string) => void;
    status: (c: number) => { send: (b: string) => void };
    redirect: (c: number, u: string) => void;
  },
) => Promise<void>;

const BOT_UA = "facebookexternalhit/1.1";
const HUMAN_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)";

function run(path: string, ua: string) {
  const headers: Record<string, string> = {};
  let status = 0;
  let body = "";
  let redirected = "";
  const res = {
    set: (k: string, v: string) => {
      headers[k] = v;
    },
    status: (c: number) => ({
      send: (b: string) => {
        status = c;
        body = b;
      },
    }),
    redirect: (c: number, u: string) => {
      status = c;
      redirected = u;
    },
  };
  return (shareMeta as unknown as Handler)(
    { method: "GET", path, headers: { "user-agent": ua, host: "airpal.me" } },
    res,
  ).then(() => ({ status, body, headers, redirected }));
}

describe("shareMeta", () => {
  afterEach(() => {
    fakes.docs = {};
    fakes.invitePlans = [];
    fakes.fetchedUrls.length = 0;
    fakes.fetchOk = true;
    resetShareMetaCacheForTests();
    vi.unstubAllGlobals();
  });

  function stubIndexFetch() {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        fakes.fetchedUrls.push(url);
        return {
          ok: fakes.fetchOk,
          status: fakes.fetchOk ? 200 : 500,
          text: async () => "<!doctype html><html><body>app</body></html>",
        };
      }),
    );
  }

  it("passes humans through to the SPA", async () => {
    stubIndexFetch();
    const res = await run("/e/evt-1", HUMAN_UA);
    expect(res.status).toBe(200);
    expect(res.body).toContain("<body>app</body>");
    expect(res.headers["Content-Type"]).toBe("text/html; charset=utf-8");
    expect(res.headers["Cache-Control"]).toBe("no-cache");
    expect(fakes.fetchedUrls).toEqual(["https://airpal.me/index.html"]);
  });

  it("caches the passthrough shell across hits", async () => {
    stubIndexFetch();
    await run("/e/evt-1", HUMAN_UA);
    await run("/p/pl-1", HUMAN_UA);
    expect(fakes.fetchedUrls).toHaveLength(1);
  });

  it("falls back to home when the shell fetch fails", async () => {
    stubIndexFetch();
    fakes.fetchOk = false;
    const res = await run("/e/evt-1", HUMAN_UA);
    expect(res.status).toBe(302);
    expect(res.redirected).toBe("/");
  });

  it("serves event cards to crawlers", async () => {
    fakes.docs["events/evt-1"] = {
      name: "Rooftop Sessions",
      venue: "Demo Hotel",
      city: "Sydney",
      shortWhy: "Weekly set above the harbour.",
      coverImage: "/covers/roof.jpg",
      status: "live",
    };
    const res = await run("/e/evt-1", BOT_UA);
    expect(res.status).toBe(200);
    expect(res.body).toContain('<meta property="og:title" content="Rooftop Sessions">');
    expect(res.body).toContain('content="Weekly set above the harbour."');
    expect(res.body).toContain('<meta property="og:image" content="https://airpal.me/covers/roof.jpg">');
    expect(res.body).toContain('<link rel="canonical" href="https://airpal.me/e/evt-1">');
    expect(res.headers["Cache-Control"]).toBe("public, max-age=300");
  });

  it("serves generic cards for draft events", async () => {
    fakes.docs["events/evt-9"] = { name: "Secret Draft", status: "draft" };
    const res = await run("/e/evt-9", BOT_UA);
    expect(res.body).toContain("AirPal.me · Life Made Easy.");
    expect(res.body).not.toContain("Secret Draft");
  });

  it("serves pulse cards with property and question count", async () => {
    fakes.docs["pulseTokens/tok-1"] = {
      active: true,
      propertyId: "prop-1",
      deploymentId: "dep-1",
      pulseId: "pu-1",
    };
    fakes.docs["properties/prop-1"] = { name: "Harbour Hotel", heroImage: "/h.jpg" };
    fakes.docs["properties/prop-1/pulseDeployments/dep-1"] = { active: true };
    fakes.docs["properties/prop-1/pulses/pu-1"] = {
      status: "live",
      name: "Dinner check",
      branding: { title: "How was dinner?" },
      questions: [{}, {}],
    };
    const res = await run("/pulse/tok-1", BOT_UA);
    expect(res.body).toContain('<meta property="og:title" content="How was dinner?">');
    expect(res.body).toContain("Harbour Hotel · 2 quick questions");
    expect(res.body).toContain('<meta property="og:image" content="https://airpal.me/h.jpg">');
  });

  it("prefers the pulse cover image in pulse cards", async () => {
    fakes.docs["pulseTokens/tok-2"] = {
      active: true,
      propertyId: "prop-2",
      deploymentId: "dep-2",
      pulseId: "pu-2",
    };
    fakes.docs["properties/prop-2"] = { name: "Harbour Hotel", heroImage: "/h.jpg" };
    fakes.docs["properties/prop-2/pulseDeployments/dep-2"] = { active: true };
    fakes.docs["properties/prop-2/pulses/pu-2"] = {
      status: "live",
      name: "Dinner check",
      branding: { title: "How was dinner?", imageUrl: "https://cdn/pulse-cover.jpg" },
      questions: [{}, {}],
    };
    const res = await run("/pulse/tok-2", BOT_UA);
    expect(res.body).toContain('<meta property="og:image" content="https://cdn/pulse-cover.jpg">');
  });

  it("serves generic cards for inactive pulse tokens (no oracle)", async () => {
    fakes.docs["pulseTokens/tok-9"] = { active: false };
    const res = await run("/pulse/tok-9", BOT_UA);
    expect(res.body).toContain("AirPal.me · Life Made Easy.");
    const missing = await run("/pulse/nope", BOT_UA);
    expect(missing.body).toBe(res.body.replaceAll("/pulse/tok-9", "/pulse/nope"));
  });

  it("protects unshared private plan IDs from enumeration while unfurling invite codes", async () => {
    fakes.docs["plans/plan-1"] = { title: "Secret Birthday", isPublic: false };
    fakes.invitePlans = [
      {
        title: "Secret Birthday",
        inviteCode: "ABC123",
        isPublic: false,
        heroImage: "https://images.example/cake.jpg",
        date: "2026-10-15",
      },
    ];
    // Guessing a private plan ID directly does not reveal title
    const byId = await run("/plan/plan-1", BOT_UA);
    expect(byId.body).not.toContain("Secret Birthday");

    // The shared invitation link unfurls with title, metadata, and hero image
    const byInvite = await run("/invite/abc123", BOT_UA);
    expect(byInvite.body).toContain("Secret Birthday");
    expect(byInvite.body).toContain("https://images.example/cake.jpg");

    // Cancelled plan invites return generic card
    fakes.invitePlans.push({ title: "Cancelled Party", inviteCode: "XYZ999", status: "cancelled" });
    const cancelled = await run("/invite/xyz999", BOT_UA);
    expect(cancelled.body).not.toContain("Cancelled Party");
    expect(cancelled.body).toContain("AirPal.me · Life Made Easy.");
  });

  it("serves event cards for active events with heroImage", async () => {
    fakes.docs["events/evt-active"] = {
      title: "Harbour Jazz Night",
      venueName: "Pier One",
      city: "Sydney",
      heroImage: "https://images.example/jazz.jpg",
      status: "active",
    };
    const res = await run("/e/evt-active", BOT_UA);
    expect(res.status).toBe(200);
    expect(res.body).toContain('<meta property="og:title" content="Harbour Jazz Night">');
    expect(res.body).toContain('<meta property="og:image" content="https://images.example/jazz.jpg">');
  });

  it("serves public plan and bio cards", async () => {
    fakes.docs["plans/plan-2"] = { title: "Bondi Sunrise", destination: "Bondi Beach", isPublic: true };
    const plan = await run("/plan/plan-2", BOT_UA);
    expect(plan.body).toContain('<meta property="og:title" content="Bondi Sunrise">');
    fakes.docs["handles/ava"] = { profileId: "prof-1" };
    fakes.docs["profiles/prof-1"] = { name: "Ava", shortWhy: "Bondi local" };
    const bio = await run("/@ava", BOT_UA);
    expect(bio.body).toContain("Ava (@ava)");
  });

  it("serves property cards without host secrets", async () => {
    fakes.docs["properties/prop-7"] = {
      name: "Harbour Hotel",
      tagline: "Stay on the water",
      heroImage: "/hero.jpg",
      wifi: { password: "s3cret", network: "Hotel" },
    };
    const res = await run("/stay/prop-7", BOT_UA);
    expect(res.body).toContain("Harbour Hotel");
    expect(res.body).not.toContain("s3cret");
  });

  it("rejects non-GET methods", async () => {
    let status = 0;
    await (shareMeta as unknown as Handler)(
      { method: "POST", path: "/e/evt-1", headers: { "user-agent": BOT_UA } },
      {
        set: () => undefined,
        status: (c: number) => ({
          send: () => {
            status = c;
          },
        }),
        redirect: () => undefined,
      },
    );
    expect(status).toBe(405);
  });
});
