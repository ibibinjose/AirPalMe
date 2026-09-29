/**
 * Server-rendered link previews. Social crawlers never run the SPA's JS, so
 * shareable deep links are rewritten (firebase.json) to the `shareMeta`
 * function, which serves crawler user-agents static OG/Twitter HTML while
 * humans pass through to the app. Everything here is pure for testing; the
 * function adds Firestore reads and the passthrough.
 */

export const SHARE_SITE_NAME = "AirPal.me";

export const SHARE_DEFAULTS = {
  title: "AirPal.me · Life Made Easy.",
  description: "Life Made Easy. People, places, things and experiences — made easier.",
  image: "/brand/og-share-preview.jpg",
} as const;

/**
 * Link-preview fetchers. Search crawlers that execute JS (Googlebot, Bingbot)
 * are deliberately NOT here — they render the app like a human, so serving
 * them alternate HTML would be cloaking-adjacent. These bots only read tags.
 */
const CRAWLER_UA_SUBSTRINGS = [
  "facebookexternalhit",
  "facebot",
  "twitterbot",
  "linkedinbot",
  "slackbot",
  "discordbot",
  "whatsapp",
  "telegrambot",
  "pinterest",
  "redditbot",
  "tumblr",
  "viber",
  "skypeuripreview",
  "embedly",
  "iframely",
  "quora link preview",
] as const;

export function isCrawlerUserAgent(userAgent: string | undefined | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return CRAWLER_UA_SUBSTRINGS.some((bot) => ua.includes(bot));
}

/** Escape user content for OG tags/HTML. Caps length so cards stay tight. */
export function escapeShareText(value: unknown, maxLength: number): string {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const sliced = text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
  return sliced
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Absolute OG image URL. Accepts https/http URLs and site-relative paths;
 * anything else (data:, javascript:, empty) yields "" so callers fall back
 * to the brand image. Returned value is escaped for attribute use.
 */
export function absoluteShareImageUrl(image: unknown, origin: string): string {
  const raw = String(image || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return escapeShareText(raw, 500);
  if (raw.startsWith("/")) return escapeShareText(`${origin.replace(/\/$/, "")}${raw}`, 500);
  return "";
}

export type ShareCard = { title: string; description: string; image: string };

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Card copy per shareable surface. Inputs are raw Firestore fields; outputs
 * are escaped and fallback-filled. Privacy gates (draft events, private
 * plans, inactive pulse tokens) live in the function — this maps data that
 * already passed them.
 */
export function shareCardFor(
  kind: "event" | "place" | "pulse" | "plan" | "bio" | "property" | "demoHotel" | "demo",
  doc: Record<string, unknown>,
  origin: string,
): ShareCard {
  const fallbackImage = `${origin.replace(/\/$/, "")}${SHARE_DEFAULTS.image}`;
  const imageOf = (...candidates: unknown[]): string => {
    for (const candidate of candidates) {
      const url = absoluteShareImageUrl(candidate, origin);
      if (url) return url;
    }
    return fallbackImage;
  };
  switch (kind) {
    case "event": {
      const venueCity = [str(doc.venue), str(doc.city)].filter(Boolean).join(" · ");
      return {
        title: escapeShareText(doc.name, 90) || SHARE_DEFAULTS.title,
        description:
          escapeShareText(str(doc.shortWhy) || str(doc.description) || venueCity, 200) ||
          SHARE_DEFAULTS.description,
        image: imageOf(doc.coverImage),
      };
    }
    case "place":
      return {
        title: escapeShareText(doc.name, 90) || SHARE_DEFAULTS.title,
        description:
          escapeShareText(str(doc.shortWhy) || str(doc.address), 200) || SHARE_DEFAULTS.description,
        image: imageOf(doc.heroImage, doc.coverImage),
      };
    case "pulse": {
      const questions = Array.isArray(doc.questions) ? doc.questions.length : 0;
      const property = str(doc.propertyName);
      return {
        title: escapeShareText(str(doc.title) || str(doc.name) || "How is your stay?", 90),
        description: escapeShareText(
          [property, questions ? `${questions} quick questions` : "Quick check-in"]
            .filter(Boolean)
            .join(" · "),
          200,
        ),
        image: imageOf(doc.imageUrl, doc.propertyHeroImage),
      };
    }
    case "plan":
      return {
        title: escapeShareText(doc.title, 90) || SHARE_DEFAULTS.title,
        description:
          escapeShareText(str(doc.destination) || str(doc.date), 200) || SHARE_DEFAULTS.description,
        image: imageOf(doc.coverImage),
      };
    case "bio": {
      const handle = str(doc.handle);
      return {
        title: escapeShareText(
          str(doc.name) ? `${str(doc.name)} (@${handle || "airpal"})` : SHARE_DEFAULTS.title,
          90,
        ),
        description: escapeShareText(str(doc.shortWhy), 200) || SHARE_DEFAULTS.description,
        image: imageOf(doc.avatar),
      };
    }
    case "property":
      return {
        title: escapeShareText(doc.name, 90) || SHARE_DEFAULTS.title,
        description:
          escapeShareText(str(doc.tagline) || str(doc.city), 200) || SHARE_DEFAULTS.description,
        image: imageOf(doc.heroImage),
      };
    case "demoHotel":
      return {
        title: escapeShareText(str(doc.name) || "Demo Harbour Hotel", 90),
        description:
          escapeShareText(
            str(doc.tagline) || "Scan the lobby: Wi-Fi, dining, housekeeping — the live concierge.",
            200,
          ),
        image: imageOf(doc.heroImage),
      };
    case "demo":
      return {
        title: "AirPal.me in five minutes · Showcase tour",
        description:
          "Walk the full AirPal loop — mates, plans, stays, events, business — every stop live.",
        image: fallbackImage,
      };
  }
}

/** Minimal crawler HTML: tags only, plus a plain link for odd clients. */
export function buildShareMetaHtml(card: ShareCard, url: string): string {
  const large = Boolean(card.image);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${card.title}</title>
<link rel="canonical" href="${url}">
<meta name="description" content="${card.description}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SHARE_SITE_NAME}">
<meta property="og:title" content="${card.title}">
<meta property="og:description" content="${card.description}">
<meta property="og:url" content="${url}">
${large ? `<meta property="og:image" content="${card.image}">` : ""}
<meta name="twitter:card" content="${large ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${card.title}">
<meta name="twitter:description" content="${card.description}">
${large ? `<meta name="twitter:image" content="${card.image}">` : ""}
</head>
<body><p><a href="${url}">${card.title}</a></p></body>
</html>`;
}
