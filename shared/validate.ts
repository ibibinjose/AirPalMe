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
