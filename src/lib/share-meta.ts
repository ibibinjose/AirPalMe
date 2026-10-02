import { toPublicUrl } from "./public-origin";

const DEFAULT_TITLE = "AirPal.Me · Life Made Easy.";
const DEFAULT_DESCRIPTION = "Life Made Easy. People, places, things and experiences — made easier.";

/** Static per-route titles so every public page shares well. Dynamic detail
 * pages (plans, events, bios) override these with their own setShareMeta. */
const ROUTE_META: Array<{ match: RegExp; title: string; description: string }> = [
  {
    match: /^\/[Dd]emo(\/|$)/,
    title: "AirPal.me in five minutes · Showcase tour",
    description: "Walk the full AirPal loop — mates, plans, stays, events, business — every stop live.",
  },
  {
    match: /^\/mate(\/|$)/,
    title: "AirPal Mate · Find someone to go with you",
    description:
      "Going alone? Find a verified local AirPal Mate for food, culture, fitness, events and more in your city.",
  },
  {
    match: /^\/plan(\/|$)/,
    title: "Plans · AirPal.Me",
    description: "Make plans with family and friends — pick a place, gather the crew, go.",
  },
  {
    match: /^\/experiences(\/|$)/,
    title: "Experiences · AirPal.Me",
    description: "Food, culture, fitness, art, music and local experiences near you.",
  },
  {
    match: /^\/events(\/|$)/,
    title: "Events · AirPal.Me",
    description: "Every upcoming event in one feed — at places, in the community, or from friends.",
  },
  {
    match: /^\/calendar(\/|$)/,
    title: "Event calendar · AirPal.Me",
    description: "What's on near you — month, week and day views for planning ahead.",
  },
  {
    match: /^\/event(\/|$)/,
    title: "Host an event · AirPal.Me",
    description: "List free or ticketed events on AirPal.Me — stalls, festivals, guest lists and door check-in.",
  },
  {
    match: /^\/stay$/,
    title: "Stays · AirPal.Me",
    description: "Hotels, motels, hostels and boutique stays — browse live listings and book direct with the property.",
  },
  {
    match: /^\/concierge(\/|$)|^\/stay(\/|$)/,
    title: "Stay & Guide · AirPal.Me",
    description: "Your guest companion — Wi-Fi, dining, the desk and what's around your stay.",
  },
  {
    match: /^\/discover(\/|$)|^\/explore(\/|$)|^\/$|^\/circle(\/|$)/,
    title: "Discover · AirPal.Me",
    description: "Discover places, events, experiences and people near you.",
  },
  {
    match: /^\/helpdesk(\/|$)/,
    title: "Help Desk Operations · AirPal.Me",
    description: "Live Help Desk Console for Stays, In-Room Dining, Event Hosts and Local Venues on AirPal.Me.",
  },
  {
    match: /^\/help(\/|$)/,
    title: "Help center · AirPal.Me",
    description: "Guides to plans, Mates, tickets, safety, and your account on AirPal.Me.",
  },
  {
    match: /^\/business(\/|$)/,
    title: "AirPal for Business",
    description: "List your place, publish experiences and offers, take bookings on AirPal.Me.",
  },
  {
    match: /^\/partners(\/|$)|^\/join(\/|$)/,
    title: "Partner with AirPal.Me",
    description: "Add your place or venue to AirPal.Me and reach guests already nearby.",
  },
  {
    match: /^\/club(\/|$)/,
    title: "Clubs · AirPal.Me",
    description: "Find your crowd — clubs, guest lists and community events.",
  },
  {
    match: /^\/giveaways(\/|$)|^\/promotions(\/|$)/,
    title: "Giveaways & Offers · AirPal.Me",
    description: "Win experiences and claim local offers on AirPal.Me.",
  },
  {
    match: /^\/guide(\/|$)|^\/solutions(\/|$)/,
    title: "Guides · AirPal.Me",
    description: "Local guides and curated ways to experience the city.",
  },
  {
    match: /^\/fashion(\/|$)/,
    title: "Fashion · AirPal.Me",
    description: "Brand fashion campaigns and drops on AirPal.Me. Rentals open with partner brands first.",
  },
  {
    match: /^\/scan(\/|$)/,
    title: "Scan · AirPal.Me",
    description: "Scan an AirPal code to open Wi-Fi, menus, events and offers.",
  },
  {
    match: /^\/trust(\/|$)/,
    title: "Trust · AirPal.Me",
    description: "Is AirPal.Me legit? Company facts, who runs it, and what it isn't.",
  },
  {
    match: /^\/alternatives\/meetup(\/|$)/,
    title: "Meetup alternative for casual plans · AirPal.Me",
    description: "Blend social planning with local discovery: group plans, verified Mates, and what's on nearby.",
  },
  {
    match: /^\/alternatives\/touch-stay(\/|$)/,
    title: "Touch Stay alternative · AirPal.Me",
    description: "Lighter QR guest concierge with no download: Wi-Fi, dining, housekeeping and local discovery.",
  },
  {
    match: /^\/alternatives\/hostfully(\/|$)/,
    title: "Hostfully alternative · AirPal.Me",
    description: "Simpler stay concierge plus local events and experiences for boutique hosts and rentals.",
  },
  {
    match: /^\/alternatives\/eventbrite(\/|$)/,
    title: "Eventbrite alternative · AirPal.Me",
    description: "List events and let groups coordinate plans around them: ticketing, check-in, payouts.",
  },
  {
    match: /^\/about(\/|$)/,
    title: "About · AirPal.Me",
    description: "One trusted marketplace for people, places, things and experiences.",
  },
  { match: /^\/contact(\/|$)/, title: "Contact · AirPal.Me", description: "Get in touch with the AirPal.Me team." },
  {
    match: /^\/assist(\/|$)/,
    title: "Help & support · AirPal.Me",
    description: "Contact AirPal.Me support: help guides, safety, and how to reach the Sydney team.",
  },
  {
    match: /^\/unsubscribe(\/|$)/,
    title: "Unsubscribe · AirPal.Me",
    description: "Leave the AirPal Guestlist in one tap.",
  },
  {
    match: /^\/(getAirPalApp|getAirPal)(\/|$)/,
    title: "Get the AirPal app",
    description: "Take AirPal.Me anywhere — get the app for iOS and Android.",
  },
  {
    match: /^\/marketing(\/|$)/,
    title: "Marketing · AirPal.Me",
    description: "Grow with AirPal.Me — campaigns, offers and local discovery.",
  },
  {
    match: /^\/studio(\/|$)/,
    title: "Studio · AirPal.Me",
    description: "Operate your listings, campaigns and bookings on AirPal.Me.",
  },
];

/** Detail pages own their tags (child effects run before AppShell's). */
const DYNAMIC_OWNED = [/^\/@/, /^\/(plan|e|invite|p|tour|c|solutions)\/[^/]/, /^\/marketing(\/|$)/, /^\/stay\/@/];

/** Pure route → static meta lookup. Null when a dynamic page owns the tags. */
export function routeMetaFor(pathname: string): { title: string; description: string; path: string } | null {
  const path = pathname.split("?")[0] || "/";
  if (DYNAMIC_OWNED.some((r) => r.test(path))) return null;
  const hit = ROUTE_META.find((r) => r.match.test(path));
  return {
    title: hit?.title || DEFAULT_TITLE,
    description: hit?.description || DEFAULT_DESCRIPTION,
    path,
  };
}

/** Apply the static route title/description/canonical for a pathname. */
export function applyRouteMeta(pathname: string) {
  if (typeof document === "undefined") return;
  const meta = routeMetaFor(pathname);
  if (!meta) return;
  setShareMeta({ ...meta, url: toPublicUrl(meta.path) });
}

export function setShareMeta(input: {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: "website" | "profile" | "event" | "article";
  imageWidth?: number;
  imageHeight?: number;
  imageAlt?: string;
  jsonLd?: Record<string, unknown>;
}) {
  if (typeof document === "undefined") return;
  document.title = input.title;

  const set = (key: string, value: string, prop = "property") => {
    let tag = document.head.querySelector(`meta[${prop}="${key}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(prop, key);
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", value);
  };

  set("og:site_name", "AirPal.Me");
  set("og:locale", "en_AU");
  set("og:type", input.type || "website");
  set("og:title", input.title);
  set("og:description", input.description);
  set("description", input.description, "name");

  set("twitter:card", "summary_large_image", "name");
  set("twitter:site", "@airpalme", "name");
  set("twitter:creator", "@airpalme", "name");
  set("twitter:title", input.title, "name");
  set("twitter:description", input.description, "name");

  if (input.image) {
    const rawImage = input.image.startsWith("idb:") ? undefined : input.image;
    if (rawImage) {
      const image = rawImage.startsWith("http") ? rawImage : toPublicUrl(rawImage);
      set("og:image", image);
      set("og:image:secure_url", image);
      set("og:image:width", String(input.imageWidth || 1200));
      set("og:image:height", String(input.imageHeight || 630));
      set("og:image:alt", input.imageAlt || input.title);
      set("twitter:image", image, "name");
      set("twitter:image:alt", input.imageAlt || input.title, "name");
    }
  }

  if (input.url) {
    const canonicalUrl = toPublicUrl(input.url);
    set("og:url", canonicalUrl);
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);
  }

  if (input.jsonLd) {
    let script = document.head.querySelector('script[id="dynamic-page-jsonld"]');
    if (!script) {
      script = document.createElement("script");
      script.setAttribute("type", "application/ld+json");
      script.setAttribute("id", "dynamic-page-jsonld");
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(input.jsonLd);
  }
}
