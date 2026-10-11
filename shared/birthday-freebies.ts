/**
 * Birthday Month Freebies — curated loyalty/birthday rewards by region.
 * Discover → redeem with a Mate. Not an events directory.
 */

export const BIRTHDAY_REGION_CODES = ["au", "in", "us", "uae", "eu"] as const;
export type BirthdayRegionCode = (typeof BIRTHDAY_REGION_CODES)[number];

export const BIRTHDAY_REGIONS: Array<{
  code: BirthdayRegionCode;
  label: string;
  flagEmoji?: string;
}> = [
  { code: "au", label: "Australia", flagEmoji: "🇦🇺" },
  { code: "in", label: "India", flagEmoji: "🇮🇳" },
  { code: "us", label: "United States", flagEmoji: "🇺🇸" },
  { code: "uae", label: "UAE", flagEmoji: "🇦🇪" },
  { code: "eu", label: "Europe", flagEmoji: "🇪🇺" },
];

export const BIRTHDAY_MONTHS: Array<{ value: number; label: string; short: string }> = [
  { value: 1, label: "January", short: "Jan" },
  { value: 2, label: "February", short: "Feb" },
  { value: 3, label: "March", short: "Mar" },
  { value: 4, label: "April", short: "Apr" },
  { value: 5, label: "May", short: "May" },
  { value: 6, label: "June", short: "Jun" },
  { value: 7, label: "July", short: "Jul" },
  { value: 8, label: "August", short: "Aug" },
  { value: 9, label: "September", short: "Sep" },
  { value: 10, label: "October", short: "Oct" },
  { value: 11, label: "November", short: "Nov" },
  { value: 12, label: "December", short: "Dec" },
];

const BIRTHDAY_OFFER_CATEGORIES = ["food", "beauty", "retail", "stay", "activity", "other"] as const;
type BirthdayOfferCategory = (typeof BIRTHDAY_OFFER_CATEGORIES)[number];

const BIRTHDAY_OFFER_STATUSES = ["draft", "live", "archived"] as const;
type BirthdayOfferStatus = (typeof BIRTHDAY_OFFER_STATUSES)[number];

type BirthdayOwnerType = "admin" | "business";

interface BirthdayOffer {
  id: string;
  brand: string;
  title: string;
  description: string;
  rewardText: string;
  category: BirthdayOfferCategory;
  /** Region codes this offer applies to (au|in|us|uae|eu). */
  regions: string[];
  /** Months 1–12; empty = all months. */
  birthdayMonths: number[];
  howToClaim: string;
  claimUrl?: string;
  status: BirthdayOfferStatus;
  ownerUid: string;
  ownerType: BirthdayOwnerType;
  businessId?: string;
  placeId?: string;
  featured?: boolean;
  /** Alcoholic / 18+ rewards; default true for safety. */
  adultOnly: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  /** Editorial seed marker; optional. */
  editorial?: boolean;
  seedKey?: string;
}

/** Derive birthday month 1–12 from YYYY-MM-DD. Returns null if invalid. */
export function monthFromBirthDate(ymd: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const month = Number(ymd.slice(5, 7));
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  const day = Number(ymd.slice(8, 10));
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  const y = Number(ymd.slice(0, 4));
  const date = new Date(Date.UTC(y, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return month;
}

export function isBirthdayRegionCode(value: string): value is BirthdayRegionCode {
  return (BIRTHDAY_REGION_CODES as readonly string[]).includes(value);
}

export function offerVisibleFor(
  offer: Pick<BirthdayOffer, "regions" | "birthdayMonths" | "status">,
  month: number,
  region: string,
): boolean {
  if (offer.status !== "live") return false;
  if (!Number.isInteger(month) || month < 1 || month > 12) return false;
  const regionNorm = String(region || "")
    .trim()
    .toLowerCase();
  if (!regionNorm || !offer.regions.map((r) => r.toLowerCase()).includes(regionNorm)) return false;
  if (!offer.birthdayMonths.length) return true;
  return offer.birthdayMonths.includes(month);
}

export function validateBirthdayOfferDraft(input: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!String(input.brand || "").trim()) errors.push("Brand is required.");
  if (!String(input.title || "").trim()) errors.push("Title is required.");
  if (!String(input.rewardText || "").trim()) errors.push("Reward text is required.");
  if (!String(input.howToClaim || "").trim()) errors.push("How to claim is required.");

  const category = String(input.category || "");
  if (!(BIRTHDAY_OFFER_CATEGORIES as readonly string[]).includes(category)) {
    errors.push("Category must be food, beauty, retail, stay, activity, or other.");
  }

  const regions = Array.isArray(input.regions) ? input.regions.map((r) => String(r).toLowerCase()) : [];
  if (!regions.length) errors.push("At least one region is required.");
  for (const r of regions) {
    if (!isBirthdayRegionCode(r)) errors.push(`Unknown region: ${r}.`);
  }

  const months = Array.isArray(input.birthdayMonths) ? input.birthdayMonths.map((m) => Number(m)) : [];
  for (const m of months) {
    if (!Number.isInteger(m) || m < 1 || m > 12) {
      errors.push("Birthday months must be integers from 1 to 12.");
      break;
    }
  }

  const claimUrl = String(input.claimUrl || "").trim();
  if (claimUrl && !/^https?:\/\//i.test(claimUrl)) {
    errors.push("Claim URL must start with http:// or https://.");
  }

  const status = input.status == null ? "draft" : String(input.status);
  if (!(BIRTHDAY_OFFER_STATUSES as readonly string[]).includes(status)) {
    errors.push("Status must be draft, live, or archived.");
  }

  return Array.from(new Set(errors));
}

export type CreateBirthdayOfferRequest = {
  brand: string;
  title: string;
  description?: string;
  rewardText: string;
  category: BirthdayOfferCategory;
  regions: string[];
  birthdayMonths?: number[];
  howToClaim: string;
  claimUrl?: string;
  businessId?: string;
  placeId?: string;
  featured?: boolean;
  adultOnly?: boolean;
  /** Business drafts default to draft; admins may create live. */
  status?: BirthdayOfferStatus;
};

export type UpdateBirthdayOfferRequest = {
  offerId: string;
  patch: Partial<
    Pick<
      BirthdayOffer,
      | "brand"
      | "title"
      | "description"
      | "rewardText"
      | "category"
      | "regions"
      | "birthdayMonths"
      | "howToClaim"
      | "claimUrl"
      | "businessId"
      | "placeId"
      | "featured"
      | "adultOnly"
      | "status"
    >
  >;
};

export type ListBirthdayOffersRequest = {
  region?: string;
  month?: number;
  status?: BirthdayOfferStatus | "any";
};

export type AdminSetBirthdayOfferStatusRequest = {
  offerId: string;
  status: BirthdayOfferStatus;
};

/** Mate meetup CTA — Life Made Easy framing. */
export const BIRTHDAY_MATE_CTA = {
  label: "Redeem with a Mate",
  href: "https://airpal.me",
  inAppHref: "/mate",
  blurb: "Find someone to go with — Life Made Easy.",
} as const;

export const BIRTHDAY_DISCLAIMER =
  "Offers change and may require joining a rewards programme before your birthday. Always confirm terms with the brand.";

/** Prefs + tracking on users/{uid} for birthday-month freebie alerts. */
export type SetBirthdayAlertPrefsRequest = {
  birthdayAlertsEnabled?: boolean;
  birthdayAlertsRegion?: string;
};

export type BirthdayAlertKind = "start" | "mid";

export type BirthdayAlertCandidate = {
  birthdayMonth?: number | null;
  adultConsent?: boolean | null;
  adultConfirmed?: boolean | null;
  birthdayAlertsEnabled?: boolean | null;
  birthdayAlertsRegion?: string | null;
  lastBirthdayMonthAlertAt?: string | null;
  lastBirthdayMidMonthAlertAt?: string | null;
};

/** Sydney calendar Y-M-D parts (never UTC-sliced for "this month"). */
export function sydneyCalendarParts(now: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  ymd: string;
} {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month, day] = ymd.split("-").map(Number);
  return { year, month, day, ymd };
}

function isoInSydneyMonth(iso: string | null | undefined, year: number, month: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  const parts = sydneyCalendarParts(new Date(t));
  return parts.year === year && parts.month === month;
}

function isAdultForAlerts(user: BirthdayAlertCandidate): boolean {
  return user.adultConsent === true || user.adultConfirmed === true;
}

function alertsEnabled(user: BirthdayAlertCandidate): boolean {
  // Default on when birthdayMonth is set (enabled !== false).
  return user.birthdayAlertsEnabled !== false;
}

/**
 * Should we send the birthday-month arrival alert (Sydney calendar)?
 * Requires matching birthdayMonth, adult consent, alerts enabled, and no
 * alert already stamped this calendar month.
 */
export function shouldAlertBirthdayMonth(user: BirthdayAlertCandidate, now: Date = new Date()): boolean {
  const { year, month } = sydneyCalendarParts(now);
  const bm = Number(user.birthdayMonth);
  if (!Number.isInteger(bm) || bm < 1 || bm > 12) return false;
  if (bm !== month) return false;
  if (!isAdultForAlerts(user)) return false;
  if (!alertsEnabled(user)) return false;
  if (isoInSydneyMonth(user.lastBirthdayMonthAlertAt, year, month)) return false;
  return true;
}

/**
 * Optional mid-month nudge (Sydney day >= 15). Fires once per birthday month
 * after the start alert (or as a catch-up if start was skipped).
 */
export function shouldAlertBirthdayMidMonth(user: BirthdayAlertCandidate, now: Date = new Date()): boolean {
  const { year, month, day } = sydneyCalendarParts(now);
  if (day < 15) return false;
  const bm = Number(user.birthdayMonth);
  if (!Number.isInteger(bm) || bm < 1 || bm > 12) return false;
  if (bm !== month) return false;
  if (!isAdultForAlerts(user)) return false;
  if (!alertsEnabled(user)) return false;
  if (isoInSydneyMonth(user.lastBirthdayMidMonthAlertAt, year, month)) return false;
  return true;
}

export function birthdayAlertsHref(region?: string | null): string {
  const code = String(region || "au")
    .trim()
    .toLowerCase();
  return `/birthday-freebies/${isBirthdayRegionCode(code) ? code : "au"}`;
}

export function buildBirthdayMonthAlert(
  kind: BirthdayAlertKind,
  region?: string | null,
): {
  title: string;
  body: string;
  href: string;
} {
  const href = birthdayAlertsHref(region);
  if (kind === "mid") {
    return {
      title: "Birthday freebies still waiting",
      body: `${BIRTHDAY_MATE_CTA.blurb} Your month's freebies are live — redeem with a Mate.`,
      href,
    };
  }
  return {
    title: "Your birthday month freebies are live",
    body: `${BIRTHDAY_MATE_CTA.blurb} Open freebies and go with a Mate.`,
    href,
  };
}

/** Daily send cap for the scheduled birthday-month job. */
export const BIRTHDAY_ALERT_DAILY_CAP = 500;
