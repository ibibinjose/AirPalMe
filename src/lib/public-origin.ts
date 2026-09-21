import { LEGAL } from "./legal";

/** Canonical public site. Shared links never use capacitor:// or localhost. */
export function publicSiteOrigin(): string {
  return String(LEGAL.site || "https://airpal.me").replace(/\/$/, "");
}

function isLocalHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

function isAirpalHost(host: string): boolean {
  const h = host.replace(/^www\./, "");
  return h === "airpal.me" || h === "airpalme-app.web.app" || h === "airpalme-app.firebaseapp.com";
}

/**
 * Turn a Capacitor / relative / localhost href into https://airpal.me/…
 * External https URLs (maps, WhatsApp) are left alone.
 */
export function toPublicUrl(href?: string | null): string {
  const origin = publicSiteOrigin();
  const fallbackPath =
    typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}${window.location.hash}` : "/";
  const raw = (href && String(href).trim()) || fallbackPath;
  try {
    const u = new URL(raw, `${origin}/`);
    const path = `${u.pathname}${u.search}${u.hash}` || "/";
    if (u.protocol === "https:" || u.protocol === "http:") {
      if (isAirpalHost(u.hostname) || isLocalHost(u.hostname)) return `${origin}${path}`;
      if (u.protocol === "https:") return u.toString();
    }
    return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
  } catch {
    return raw.startsWith("/") ? `${origin}${raw}` : origin;
  }
}
