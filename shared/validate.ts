const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isEmail(raw: string): boolean {
  const email = normalizeEmail(raw);
  if (!email || email.length > 254) return false;
  if (email.includes("..")) return false;
  const [local, domain] = email.split("@");
  if (!local || !domain) return false;
  if (local.startsWith(".") || local.endsWith(".")) return false;
  if (local.startsWith("-") || local.endsWith("-")) return false;
  if (domain.startsWith(".") || domain.startsWith("-") || domain.endsWith("-")) return false;
  return EMAIL_RE.test(email);
}

export type PasswordRule = "length" | "letter" | "number";

export const PASSWORD_RULES: Array<{ id: PasswordRule; label: string }> = [
  { id: "length", label: "At least 8 characters" },
  { id: "letter", label: "Contains a letter (a–z)" },
  { id: "number", label: "Contains a number (0–9)" },
];

/** Unmet signup rules, in display order. Empty means the password is acceptable. */
export function passwordIssues(raw: string): PasswordRule[] {
  const missing: PasswordRule[] = [];
  if (raw.length < 8) missing.push("length");
  if (!/[a-zA-Z]/.test(raw)) missing.push("letter");
  if (!/[0-9]/.test(raw)) missing.push("number");
  return missing;
}

export function passwordOk(raw: string): boolean {
  return passwordIssues(raw).length === 0;
}

/** Minimum account age. AirPal involves meeting strangers and payments, so accounts are 18+. */
export const ADULT_AGE = 18;

/** Sydney-calendar "today" as YYYY-MM-DD. Works in browsers and Cloud Functions. */
export function sydneyToday(from: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(from);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * True when a YYYY-MM-DD birth date is at least 18 years before today.
 * Lexicographic compare is calendar-safe on zero-padded ISO dates, and the
 * round-trip guard rejects impossible dates like Feb 30.
 */
export function isAdultBirthDate(dob: string, todayYmd: string = sydneyToday()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;
  const [y, m, d] = dob.split("-").map(Number);
  if (!y || !m || !d || m > 12 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(date.getTime())) return false;
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return false;
  return `${y + ADULT_AGE}-${dob.slice(5)}` <= todayYmd;
}
