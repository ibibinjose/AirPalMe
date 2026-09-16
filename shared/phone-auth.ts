import { isValidPhone, splitPhone } from "./geo-address";

/** Firebase Phone Auth expects E.164 with no spaces. */
export function toE164(raw: string): string {
  const compact = raw.replace(/[^\d+]/g, "");
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  return compact.startsWith("+") ? compact : compact ? `+${compact}` : "";
}

export function isOtp(raw: string): boolean {
  return /^\d{6}$/.test(raw.replace(/\s/g, ""));
}

export function normalizeOtp(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

export function phoneReady(raw: string): boolean {
  return isValidPhone(toE164(raw));
}

export function formatPhoneDisplay(raw?: string | null): string {
  if (!raw) return "";
  const e164 = toE164(raw);
  const { dial, national } = splitPhone(e164);
  return national ? `${dial} ${national}` : e164;
}
