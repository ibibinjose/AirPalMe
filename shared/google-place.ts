import { BIO_LINK_TYPES, type BioLink, type BioLinkType } from "./bio";
import { type BusinessCategoryId } from "./business";

/** Public Google listing details we can legally copy into an AirPal place. */
export type GooglePlaceImport = {
  placeId: string;
  name: string;
  address: string;
  city: string;
  geo?: { lat: number; lng: number };
  phone: string;
  website: string;
  googleMapsUri: string;
  hours: string;
  shortWhy: string;
  category: BusinessCategoryId;
  /** Places photo resource names, e.g. places/ChIJ…/photos/… */
  photoNames: string[];
  menuUrl: string;
  socials: Array<{ type: BioLinkType; href: string; label: string }>;
};

const TYPE_TO_CATEGORY: Array<{ match: string; category: BusinessCategoryId }> = [
  { match: "cafe", category: "coffee" },
  { match: "coffee", category: "coffee" },
  { match: "bakery", category: "coffee" },
  { match: "bar", category: "bar" },
  { match: "night_club", category: "club" },
  { match: "lodging", category: "stay" },
  { match: "hotel", category: "stay" },
  { match: "spa", category: "wellness" },
  { match: "gym", category: "wellness" },
  { match: "beauty", category: "wellness" },
  { match: "clothing", category: "fashion" },
  { match: "shoe_store", category: "fashion" },
  { match: "parking", category: "parking" },
  { match: "pharmacy", category: "services" },
  { match: "laundry", category: "services" },
  { match: "museum", category: "things" },
  { match: "park", category: "things" },
  { match: "tourist", category: "things" },
  { match: "art_gallery", category: "things" },
  { match: "store", category: "shops" },
  { match: "restaurant", category: "eat" },
  { match: "meal_", category: "eat" },
  { match: "food", category: "eat" },
];

export function categoryFromGoogleTypes(types: string[], primary?: string): BusinessCategoryId {
  const hay = [primary || "", ...types].map((t) => t.toLowerCase());
  for (const row of TYPE_TO_CATEGORY) {
    if (hay.some((t) => t.includes(row.match))) return row.category;
  }
  return "eat";
}

/** Streets, suburbs, and postcodes — not a business you can import. */
const ADDRESS_TYPES = new Set([
  "geocode",
  "street_address",
  "route",
  "plus_code",
  "premise",
  "subpremise",
  "intersection",
  "political",
  "locality",
  "sublocality",
  "sublocality_level_1",
  "neighborhood",
  "postal_code",
  "country",
  "administrative_area_level_1",
  "administrative_area_level_2",
  "colloquial_area",
]);

export function isGoogleBusinessPrediction(types: string[] | undefined): boolean {
  if (!types?.length) return true;
  return types.some((t) => !ADDRESS_TYPES.has(t.toLowerCase()));
}

export function hoursFromWeekdayDescriptions(rows: string[] | undefined): string {
  if (!rows?.length) return "";
  return rows
    .map((line) => line.replace(/\u2013/g, "-").trim())
    .filter(Boolean)
    .join("; ");
}

export function shortWhyFromGoogle(summary?: string, primaryType?: string): string {
  const text = (summary || "").replace(/\s+/g, " ").trim();
  if (text.length >= 10) return text.slice(0, 220);
  const fallback = (primaryType || "local place").replace(/_/g, " ");
  return `A ${fallback} — imported to AirPal.`;
}

export function cityFromAddressComponents(
  components: Array<{ longText?: string; types?: string[] }> | undefined,
  formattedAddress: string,
): string {
  const city =
    components?.find((c) => c.types?.includes("locality"))?.longText ||
    components?.find((c) => c.types?.includes("postal_town"))?.longText ||
    "";
  if (city.trim()) return city.trim();
  const parts = formattedAddress
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] || "Sydney" : "Sydney";
}

const HOST_TO_SOCIAL: Array<{ host: string; type: BioLinkType; label: string }> = [
  { host: "instagram.com", type: "instagram", label: "Instagram" },
  { host: "facebook.com", type: "facebook", label: "Facebook" },
  { host: "fb.com", type: "facebook", label: "Facebook" },
  { host: "tiktok.com", type: "tiktok", label: "TikTok" },
  { host: "youtube.com", type: "youtube", label: "YouTube" },
  { host: "youtu.be", type: "youtube", label: "YouTube" },
  { host: "linkedin.com", type: "linkedin", label: "LinkedIn" },
  { host: "x.com", type: "x", label: "X" },
  { host: "twitter.com", type: "x", label: "X" },
  { host: "threads.net", type: "threads", label: "Threads" },
];

export function socialsAndMenuFromWebsite(website: string): {
  socials: GooglePlaceImport["socials"];
  menuUrl: string;
} {
  const href = website.trim();
  if (!href) return { socials: [], menuUrl: "" };
  let host = "";
  let path = "";
  try {
    const u = new URL(href.startsWith("http") ? href : `https://${href}`);
    host = u.hostname.replace(/^www\./, "").toLowerCase();
    path = u.pathname.toLowerCase();
  } catch {
    return { socials: [], menuUrl: "" };
  }
  const social = HOST_TO_SOCIAL.find((row) => host === row.host || host.endsWith(`.${row.host}`));
  const socials = social ? [{ type: social.type, href, label: social.label }] : [];
  const menuUrl = /menu|menus|food-menu|our-menu/.test(path) ? href : "";
  return { socials, menuUrl };
}

export function emailMatchesWebsite(email: string, website: string): boolean {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain || !website.trim()) return false;
  try {
    const host = new URL(website.startsWith("http") ? website : `https://${website}`).hostname
      .replace(/^www\./, "")
      .toLowerCase();
    return host === domain || host.endsWith(`.${domain}`) || domain.endsWith(`.${host}`);
  } catch {
    return false;
  }
}

export function bioLinksFromGooglePlace(place: GooglePlaceImport): BioLink[] {
  const links: BioLink[] = [];
  if (place.website) {
    links.push({ id: "website", type: "website", label: "Website", href: place.website });
  }
  if (place.phone) {
    const tel = place.phone.replace(/\s+/g, "");
    links.push({ id: "call", type: "call", label: "Call", href: `tel:${tel}` });
  }
  if (place.googleMapsUri) {
    links.push({ id: "maps", type: "maps", label: "Maps", href: place.googleMapsUri });
  }
  if (place.menuUrl) {
    links.push({ id: "menu", type: "menu", label: "Menu", href: place.menuUrl });
  }
  for (const social of place.socials) {
    links.push({
      id: social.type,
      type: social.type,
      label: social.label,
      href: social.href,
    });
  }
  return links.filter((l) => BIO_LINK_TYPES.some((t) => t.id === l.type));
}

export function mergeBioLinks(existing: BioLink[], imported: BioLink[]): BioLink[] {
  const byType = new Map<string, BioLink>();
  for (const link of existing) byType.set(link.type, link);
  for (const link of imported) byType.set(link.type, link);
  return Array.from(byType.values());
}
