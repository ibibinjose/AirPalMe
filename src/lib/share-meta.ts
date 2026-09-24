import { toPublicUrl } from "./public-origin";

const DEFAULT_TITLE = "AirPal.Me · Life Made Easy.";
const DEFAULT_DESCRIPTION = "Life Made Easy. People, places, things and experiences — made easier.";

/** Static per-route titles so every public page shares well. Dynamic detail
 * pages (plans, events, bios) override these with their own setShareMeta. */
const ROUTE_META: Array<{ match: RegExp; title: string; description: string }> = [
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
    match: /^\/calendar(\/|$)|^\/events(\/|$)/,
    title: "Events · AirPal.Me",
    description: "What's on near you — upcoming events, experiences and things to do.",
  },
  {
    match: /^\/concierge(\/|$)|^\/stay(\/|$)/,
    title: "Stay concierge · AirPal.Me",
    description: "Your guest companion — Wi-Fi, dining, the desk and what's around your stay.",
  },
  {
    match: /^\/discover(\/|$)|^\/explore(\/|$)|^\/$|^\/circle(\/|$)/,
    title: "Discover · AirPal.Me",
    description: "Discover places, events, experiences and people near you.",
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
    description: "Share, rent, swap and discover fashion with AirPal.Me.",
  },
  {
    match: /^\/scan(\/|$)/,
    title: "Scan · AirPal.Me",
    description: "Scan an AirPal code to open Wi-Fi, menus, events and offers.",
  },
  {
    match: /^\/about(\/|$)/,
    title: "About · AirPal.Me",
    description: "One trusted marketplace for people, places, things and experiences.",
  },
  { match: /^\/contact(\/|$)/, title: "Contact · AirPal.Me", description: "Get in touch with the AirPal.Me team." },
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
const DYNAMIC_OWNED = [/^\/@/, /^\/(plan|e|invite|p|tour|c|solutions)\/[^/]/, /^\/marketing(\/|$)/];

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

export function setShareMeta(input: { title: string; description: string; image?: string; url?: string }) {
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
  set("og:title", input.title);
  set("og:description", input.description);
  set("description", input.description, "name");
  set("twitter:card", "summary_large_image", "name");
  set("twitter:title", input.title, "name");
  set("twitter:description", input.description, "name");
  if (input.image) {
    const image = input.image.startsWith("http") ? input.image : toPublicUrl(input.image);
    set("og:image", image);
    set("twitter:image", image, "name");
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
}
