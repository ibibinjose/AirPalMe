import { isValidPhone, splitPhone } from "./geo-address";

/** Firebase Phone Auth expects E.164 with no spaces. */
export function toE164(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";
  const compact = raw.replace(/[^\d+]/g, "");
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  return compact.startsWith("+") ? compact : compact ? `+${compact}` : "";
}

export function isOtp(raw?: string | null): boolean {
  if (!raw || typeof raw !== "string") return false;
  return /^\d{6}$/.test(raw.replace(/\s/g, ""));
}

export function normalizeOtp(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";
  return raw.replace(/\D/g, "").slice(0, 6);
}

export function phoneReady(raw?: string | null): boolean {
  if (!raw || typeof raw !== "string") return false;
  return isValidPhone(toE164(raw));
}

export function formatPhoneDisplay(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";
  const e164 = toE164(raw);
  if (!e164) return "";
  const { dial, national } = splitPhone(e164);
  return national ? `${dial} ${national}` : e164;
}

/** Public Firebase web API key (Identity Toolkit). Same value as the client app. */
const WEB_API_KEY_RE = /^AIza[0-9A-Za-z_-]{20,}$/;

/** Prefer Functions env; otherwise a valid client-supplied public web key. */
export function resolveFirebaseWebApiKey(envKey?: string | null, clientKey?: string | null): string {
  const fromEnv = String(envKey || "").trim();
  if (WEB_API_KEY_RE.test(fromEnv)) return fromEnv;
  const fromClient = String(clientKey || "").trim();
  return WEB_API_KEY_RE.test(fromClient) ? fromClient : "";
}

/** Phone+password callable failed in a way SMS can finish. */
export function phonePasswordNeedsSms(err: unknown): boolean {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code || "") : "";
  const msg = (err instanceof Error ? err.message : String(err || "")).toLowerCase();
  return (
    code.includes("failed-precondition") ||
    msg.includes("not configured") ||
    msg.includes("signs in with sms") ||
    msg.includes("use the sms")
  );
}
