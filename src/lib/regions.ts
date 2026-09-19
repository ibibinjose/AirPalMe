/** Global region config: one canonical source for country → currency, locale,
 *  timezone, dial code, and emergency numbers.
 *
 *  English UI everywhere (per scope); locale only drives number/date/currency
 *  formatting so INR/AED display correctly alongside AUD.
 */

export type SupportedCountryCode = "AU" | "IN" | "AE" | "GB" | "US" | "CA" | "FR" | "DE" | "ES" | "IT" | "NL" | "IE";

export interface RegionInfo {
  code: SupportedCountryCode;
  country: string;
  flag: string;
  dial: string;
  currency: string;
  /** BCP-47 locale used for Intl formatting when the user is in this region. */
  locale: string;
  /** Default IANA timezone for the region's primary city. */
  timeZone: string;
  /** Emergency numbers shown on safety surfaces. */
  emergency: { label: string; number: string }[];
}

export const SUPPORTED_REGIONS: RegionInfo[] = [
  {
    code: "AU",
    country: "Australia",
    flag: "🇦🇺",
    dial: "+61",
    currency: "AUD",
    locale: "en-AU",
    timeZone: "Australia/Sydney",
    emergency: [{ label: "Emergency (Police / Fire / Ambulance)", number: "000" }],
  },
  {
    code: "IN",
    country: "India",
    flag: "🇮🇳",
    dial: "+91",
    currency: "INR",
    locale: "en-IN",
    timeZone: "Asia/Kolkata",
    emergency: [
      { label: "Emergency (single number)", number: "112" },
      { label: "Police", number: "100" },
      { label: "Ambulance", number: "102" },
    ],
  },
  {
    code: "AE",
    country: "United Arab Emirates",
    flag: "🇦🇪",
    dial: "+971",
    currency: "AED",
    locale: "en-AE",
    timeZone: "Asia/Dubai",
    emergency: [
      { label: "Police", number: "999" },
      { label: "Ambulance", number: "998" },
      { label: "Fire", number: "997" },
    ],
  },
  {
    code: "GB",
    country: "United Kingdom",
    flag: "🇬🇧",
    dial: "+44",
    currency: "GBP",
    locale: "en-GB",
    timeZone: "Europe/London",
    emergency: [
      { label: "Emergency (Police / Fire / Ambulance)", number: "999" },
      { label: "EU-wide emergency", number: "112" },
    ],
  },
  {
    code: "US",
    country: "United States",
    flag: "🇺🇸",
    dial: "+1",
    currency: "USD",
    locale: "en-US",
    timeZone: "America/New_York",
    emergency: [{ label: "Emergency (Police / Fire / Ambulance)", number: "911" }],
  },
  {
    code: "CA",
    country: "Canada",
    flag: "🇨🇦",
    dial: "+1",
    currency: "CAD",
    locale: "en-CA",
    timeZone: "America/Toronto",
    emergency: [{ label: "Emergency (Police / Fire / Ambulance)", number: "911" }],
  },
  {
    code: "FR",
    country: "France",
    flag: "🇫🇷",
    dial: "+33",
    currency: "EUR",
    locale: "en-FR",
    timeZone: "Europe/Paris",
    emergency: [
      { label: "EU-wide emergency", number: "112" },
      { label: "Medical (SAMU)", number: "15" },
      { label: "Police", number: "17" },
      { label: "Fire", number: "18" },
    ],
  },
  {
    code: "DE",
    country: "Germany",
    flag: "🇩🇪",
    dial: "+49",
    currency: "EUR",
    locale: "en-DE",
    timeZone: "Europe/Berlin",
    emergency: [
      { label: "Police", number: "110" },
      { label: "Fire / Medical", number: "112" },
    ],
  },
  {
    code: "ES",
    country: "Spain",
    flag: "🇪🇸",
    dial: "+34",
    currency: "EUR",
    locale: "en-ES",
    timeZone: "Europe/Madrid",
    emergency: [
      { label: "EU-wide emergency", number: "112" },
      { label: "National Police", number: "091" },
    ],
  },
  {
    code: "IT",
    country: "Italy",
    flag: "🇮🇹",
    dial: "+39",
    currency: "EUR",
    locale: "en-IT",
    timeZone: "Europe/Rome",
    emergency: [
      { label: "EU-wide emergency", number: "112" },
      { label: "Police", number: "113" },
    ],
  },
  {
    code: "NL",
    country: "Netherlands",
    flag: "🇳🇱",
    dial: "+31",
    currency: "EUR",
    locale: "en-NL",
    timeZone: "Europe/Amsterdam",
    emergency: [{ label: "Emergency (Police / Fire / Ambulance)", number: "112" }],
  },
  {
    code: "IE",
    country: "Ireland",
    flag: "🇮🇪",
    dial: "+353",
    currency: "EUR",
    locale: "en-IE",
    timeZone: "Europe/Dublin",
    emergency: [
      { label: "Emergency (Police / Fire / Ambulance)", number: "999" },
      { label: "EU-wide emergency", number: "112" },
    ],
  },
];

const BY_CODE: Record<string, RegionInfo> = Object.fromEntries(SUPPORTED_REGIONS.map((r) => [r.code, r]));

const BY_COUNTRY: Record<string, RegionInfo> = Object.fromEntries(
  SUPPORTED_REGIONS.map((r) => [r.country.toLowerCase(), r]),
);

export function regionForCountryCode(code?: string): RegionInfo | undefined {
  if (!code) return undefined;
  return BY_CODE[code.trim().toUpperCase()];
}

export function regionForCountryName(name?: string): RegionInfo | undefined {
  if (!name) return undefined;
  return BY_COUNTRY[name.trim().toLowerCase()];
}

export function currencyForCountryCode(code?: string, fallback = "AUD"): string {
  return regionForCountryCode(code)?.currency || fallback;
}

/** Locale for Intl formatting. Prefers the region's locale; falls back to the
 *  device locale so formatting still works for unsupported regions. */
export function localeForCountryCode(code?: string): string {
  const regional = regionForCountryCode(code)?.locale;
  if (regional) return regional;
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || "en";
  } catch {
    return "en";
  }
}

export function timeZoneForCountryCode(code?: string, fallback?: string): string {
  const regional = regionForCountryCode(code)?.timeZone;
  if (regional) return regional;
  if (fallback) return fallback;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Australia/Sydney";
  } catch {
    return "Australia/Sydney";
  }
}

const DEFAULT_LOCALE_FOR_CURRENCY: Record<string, string> = {
  AUD: "en-AU",
  INR: "en-IN",
  AED: "en-AE",
  GBP: "en-GB",
  USD: "en-US",
  CAD: "en-CA",
  EUR: "en-IE",
  NZD: "en-NZ",
};

/** Format a money amount in the given currency using the region-aware locale.
 *  Display only — charging/payouts remain AUD-routed (out of scope). */
export function formatMoney(amount: number, currency = "AUD", locale?: string): string {
  const resolved =
    locale ||
    DEFAULT_LOCALE_FOR_CURRENCY[currency.toUpperCase()] ||
    (() => {
      const region = SUPPORTED_REGIONS.find((r) => r.currency === currency);
      if (region) return region.locale;
      try {
        return Intl.DateTimeFormat().resolvedOptions().locale || "en";
      } catch {
        return "en";
      }
    })();
  try {
    return new Intl.NumberFormat(resolved, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
