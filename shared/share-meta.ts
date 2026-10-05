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
      const title = str(doc.title || doc.name);
      const venueCity = [str(doc.venue || doc.venueName), str(doc.city)].filter(Boolean).join(" · ");
      const when = str(doc.timeLabel || doc.when || doc.startsAt);
      const detail = str(doc.shortWhy || doc.description || doc.detail);
      const descParts = [detail, [when, venueCity].filter(Boolean).join(" · ")].filter(Boolean);
      const description = descParts.join(" — ") || venueCity || SHARE_DEFAULTS.description;
      const firstPhoto = Array.isArray(doc.photos) ? doc.photos[0] : doc.photo;
      return {
        title: escapeShareText(title, 90) || SHARE_DEFAULTS.title,
        description: escapeShareText(description, 200) || SHARE_DEFAULTS.description,
        image: imageOf(doc.coverImage, doc.heroImage, doc.imageUrl, doc.image, firstPhoto),
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
    case "plan": {
      const rawTitle = str(doc.title);
      const isInvite = Boolean(doc.inviteCode) || doc._isInvite === true;
      const title = rawTitle
        ? isInvite && !rawTitle.toLowerCase().startsWith("you're invited")
          ? `You're invited: ${rawTitle}`
          : rawTitle
        : SHARE_DEFAULTS.title;

      const creator = doc.creator as { name?: string } | undefined;
      const host = str(doc.hostName || creator?.name);
      const when = [str(doc.date), str(doc.time)].filter(Boolean).join(" at ");
      const where = [str(doc.destination), str(doc.city)].filter(Boolean).join(", ");
      const stops = Array.isArray(doc.stops) ? doc.stops : [];
      const stopsCount = stops.length > 0 ? `${stops.length} stop${stops.length === 1 ? "" : "s"}` : "";

      const parts: string[] = [];
      if (host) parts.push(`Join ${host}`);
      if (when) parts.push(`on ${when}`);
      if (where) parts.push(`at ${where}`);
      if (stopsCount) parts.push(`(${stopsCount})`);
      const inviteLine = parts.join(" ");

      const notes = str(doc.notes);
      const descLine = [inviteLine, notes, isInvite ? "RSVP on AirPal.me · Life Made Easy." : "AirPal.me"]
        .filter(Boolean)
        .join(" — ");

      const firstStopPhoto = stops.length > 0 ? (stops[0]?.photo || stops[0]?.image) : undefined;
      return {
        title: escapeShareText(title, 90) || SHARE_DEFAULTS.title,
        description: escapeShareText(descLine || where || when, 200) || SHARE_DEFAULTS.description,
        image: imageOf(doc.heroImage, doc.coverImage, doc.imageUrl, doc.image, firstStopPhoto),
      };
    }
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
export function buildShareMetaHtml(card: ShareCard, url: string, ogType: "website" | "event" | "profile" = "website"): string {
  const large = Boolean(card.image);
  const secureImage = card.image && card.image.startsWith("https://") ? card.image : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${card.title}</title>
<link rel="canonical" href="${url}">
<meta name="description" content="${card.description}">
<meta name="theme-color" content="#1805db">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${SHARE_SITE_NAME}">
<meta property="og:locale" content="en_AU">
<meta property="og:title" content="${card.title}">
<meta property="og:description" content="${card.description}">
<meta property="og:url" content="${url}">
${large ? `<meta property="og:image" content="${card.image}">` : ""}
${secureImage ? `<meta property="og:image:secure_url" content="${secureImage}">` : ""}
${large ? `<meta property="og:image:width" content="1200">` : ""}
${large ? `<meta property="og:image:height" content="630">` : ""}
${large ? `<meta property="og:image:type" content="image/jpeg">` : ""}
${large ? `<meta property="og:image:alt" content="${card.title}">` : ""}
<meta name="twitter:card" content="${large ? "summary_large_image" : "summary"}">
<meta name="twitter:site" content="@airpalme">
<meta name="twitter:title" content="${card.title}">
<meta name="twitter:description" content="${card.description}">
${large ? `<meta name="twitter:image" content="${card.image}">` : ""}
${large ? `<meta name="twitter:image:alt" content="${card.title}">` : ""}
</head>
<body><p><a href="${url}">${card.title}</a></p></body>
</html>`;
}
