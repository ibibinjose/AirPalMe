import { onRequest } from "firebase-functions/v2/https";
import {
  buildShareMetaHtml,
  isCrawlerUserAgent,
  SHARE_DEFAULTS,
  shareCardFor,
  type ShareCard,
} from "../../shared/share-meta";
import { db } from "./admin";

/**
 * Server-rendered link previews. firebase.json rewrites shareable deep links
 * here: crawler user-agents get static OG/Twitter HTML for the actual doc,
 * humans pass through to the SPA. Misses and gated docs (drafts, private
 * plans, inactive pulse tokens) all render the same generic brand card, so
 * the endpoint is not an existence oracle.
 */

type DocData = Record<string, unknown> | null;

async function getDocData(collection: string, id: string): Promise<DocData> {
  if (!id) return null;
  const snap = await db.collection(collection).doc(id).get();
  return snap.exists ? (snap.data() as Record<string, unknown>) : null;
}

function genericCard(origin: string): ShareCard {
  return {
    title: SHARE_DEFAULTS.title,
    description: SHARE_DEFAULTS.description,
    image: `${origin.replace(/\/$/, "")}${SHARE_DEFAULTS.image}`,
  };
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function resolveEventCard(id: string, origin: string): Promise<ShareCard> {
  const doc = await getDocData("events", id);
  if (!doc || (doc.status !== "live" && doc.status !== "ended")) return genericCard(origin);
  return shareCardFor("event", doc, origin);
}

async function resolvePlaceCard(id: string, origin: string): Promise<ShareCard> {
  const place = await getDocData("places", id);
  if (place && place.status === "active") return shareCardFor("place", place, origin);
  const listing = await getDocData("listings", id);
  if (listing && listing.status === "active") return shareCardFor("place", listing, origin);
  return genericCard(origin);
}

async function resolvePulseCard(token: string, origin: string): Promise<ShareCard> {
  const link = await getDocData("pulseTokens", token);
  const propertyId = str(link?.propertyId);
  const deploymentId = str(link?.deploymentId);
  const pulseId = str(link?.pulseId);
  if (link?.active !== true || !propertyId || !deploymentId || !pulseId) return genericCard(origin);
  const [property, deployment, pulse] = await Promise.all([
    getDocData("properties", propertyId),
    db
      .collection("properties")
      .doc(propertyId)
      .collection("pulseDeployments")
      .doc(deploymentId)
      .get()
      .then((snap) => (snap.exists ? (snap.data() as Record<string, unknown>) : null)),
    db
      .collection("properties")
      .doc(propertyId)
      .collection("pulses")
      .doc(pulseId)
      .get()
      .then((snap) => (snap.exists ? (snap.data() as Record<string, unknown>) : null)),
  ]);
  if (deployment?.active !== true || pulse?.status !== "live") return genericCard(origin);
  const branding = (pulse?.branding as Record<string, unknown> | undefined) || {};
  return shareCardFor(
    "pulse",
    {
      title: str(branding.title) || str(pulse?.name),
      name: str(pulse?.name),
      propertyName: str(property?.name),
      imageUrl: str(branding.imageUrl),
      propertyHeroImage: property?.heroImage,
      questions: pulse?.questions,
    },
    origin,
  );
}

async function resolvePlanCardById(id: string, origin: string): Promise<ShareCard> {
  const doc = await getDocData("plans", id);
  if (!doc || doc.isPublic !== true) return genericCard(origin);
  return shareCardFor("plan", doc, origin);
}

async function resolvePlanCardByInvite(code: string, origin: string): Promise<ShareCard> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return genericCard(origin);
  const snap = await db.collection("plans").where("inviteCode", "==", normalized).limit(1).get();
  const doc = snap.empty ? null : (snap.docs[0]!.data() as Record<string, unknown>);
  if (!doc || doc.isPublic !== true) return genericCard(origin);
  return shareCardFor("plan", doc, origin);
}

async function resolveBioCard(handle: string, origin: string): Promise<ShareCard> {
  const normalized = handle.trim().toLowerCase();
  if (!normalized) return genericCard(origin);
  const link = await getDocData("handles", normalized);
  const profileId = str(link?.profileId);
  if (!profileId) return genericCard(origin);
  const profile = await getDocData("profiles", profileId);
  if (!profile) return genericCard(origin);
  return shareCardFor("bio", { ...profile, handle: normalized }, origin);
}

async function resolvePropertyCard(id: string, origin: string): Promise<ShareCard> {
  let doc = await getDocData("properties", id);
  if (!doc) {
    const key = id.trim().replace(/^@+/, "");
    for (const field of ["handle", "slug"]) {
      if (doc) break;
      for (const candidate of [key, key.toLowerCase()]) {
        try {
          const snap = await db.collection("properties").where(field, "==", candidate).limit(1).get();
          if (!snap.empty) doc = snap.docs[0]!.data() as Record<string, unknown>;
        } catch {
          /* keep generic */
        }
        if (doc) break;
      }
    }
  }
  if (!doc) return genericCard(origin);
  // Pick public fields only — the raw doc carries host secrets (wifi).
  return shareCardFor(
    "property",
    { name: doc.name, tagline: doc.tagline, city: doc.city, heroImage: doc.heroImage },
    origin,
  );
}

async function resolveDemoHotelCard(origin: string): Promise<ShareCard> {
  const doc = await getDocData("properties", "harbour-hotel");
  if (!doc) return shareCardFor("demoHotel", {}, origin);
  return shareCardFor("demoHotel", { name: doc.name, tagline: doc.tagline, heroImage: doc.heroImage }, origin);
}

/** Match a share path to its card. Null = not a share route (passthrough). */
async function resolveCard(pathname: string, origin: string): Promise<ShareCard | null> {
  const path = pathname.split("?")[0] || "/";
  let match: RegExpMatchArray | null;
  if ((match = /^\/e\/([^/]+)/.exec(path))) return resolveEventCard(match[1]!, origin);
  if ((match = /^\/p\/([^/]+)/.exec(path))) return resolvePlaceCard(match[1]!, origin);
  if ((match = /^\/pulse\/([^/]+)/.exec(path))) return resolvePulseCard(match[1]!, origin);
  if ((match = /^\/invite\/([^/]+)/.exec(path))) return resolvePlanCardByInvite(match[1]!, origin);
  if ((match = /^\/plan\/([^/]+)/.exec(path))) {
    const id = match[1]!;
    if (id === "new") return null;
    return resolvePlanCardById(id, origin);
  }
  if ((match = /^\/@([^/]+)/.exec(path))) return resolveBioCard(match[1]!, origin);
  if ((match = /^\/(?:stay|g)\/([^/]+)/.exec(path))) return resolvePropertyCard(match[1]!, origin);
  if (/^\/demohotel\/?$/i.test(path)) return resolveDemoHotelCard(origin);
  if (/^\/demo\/?$/i.test(path)) return shareCardFor("demo", {}, origin);
  return null;
}

function requestOrigin(req: { headers: Record<string, string | string[] | undefined> }): string {
  const header = (name: string): string => {
    const value = req.headers[name];
    return Array.isArray(value) ? value[0] || "" : value || "";
  };
  const proto = (header("x-forwarded-proto") || "https").split(",")[0]!.trim() || "https";
  const host = header("x-forwarded-host") || header("host") || "airpal.me";
  return `${proto}://${host}`;
}

let cachedIndex: { html: string; at: number } | null = null;

/** Test-only: drop the passthrough cache so fetch behavior is observable. */
export function resetShareMetaCacheForTests(): void {
  cachedIndex = null;
}

/** Humans pass through to the SPA: serve index.html with a short memory cache. */
async function serveApp(
  req: { headers: Record<string, string | string[] | undefined> },
  res: {
    set: (key: string, value: string) => unknown;
    status: (code: number) => { send: (body: string) => unknown };
    redirect: (code: number, url: string) => unknown;
  },
): Promise<void> {
  const now = Date.now();
  try {
    if (!cachedIndex || now - cachedIndex.at > 5 * 60_000) {
      const origin = requestOrigin(req);
      const fetched = await fetch(`${origin}/index.html`);
      if (!fetched.ok) throw new Error(`index fetch failed: ${fetched.status}`);
      cachedIndex = { html: await fetched.text(), at: now };
    }
    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "no-cache");
    res.status(200).send(cachedIndex.html);
  } catch {
    res.redirect(302, "/");
  }
}

export const shareMeta = onRequest({ invoker: "public" }, async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.status(405).send("Method not allowed");
    return;
  }
  const headers = req.headers as Record<string, string | string[] | undefined>;
  const ua = req.headers["user-agent"];
  if (!isCrawlerUserAgent(Array.isArray(ua) ? ua[0] : ua)) {
    await serveApp({ headers }, res);
    return;
  }
  const origin = requestOrigin({ headers });
  const pathname = (req.path || "/").split("?")[0] || "/";
  let card: ShareCard | null = null;
  try {
    card = await resolveCard(pathname, origin);
  } catch {
    card = null;
  }
  if (!card) {
    await serveApp({ headers }, res);
    return;
  }
  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Cache-Control", "public, max-age=300");
  res.status(200).send(buildShareMetaHtml(card, `${origin}${pathname}`));
});
