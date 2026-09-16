import { parseAtHandle } from "@shared/bio";

/**
 * Routes where the comprehensive site footer should NOT be displayed:
 * - /scan: Fullscreen camera QR viewfinder.
 * - /@handle: Public bio link-in-bio card (has its own dedicated minimal bio footer).
 * - /start: Focused auth flow (sign in / sign up / password reset).
 * - /admin: Platform super-admin console with dense data tables.
 */
const EXCLUDED_PREFIXES = ["/scan", "/admin", "/start"];

/**
 * Determines whether the comprehensive site footer should be rendered
 * for the given route path.
 */
export function shouldShowFooter(path: string): boolean {
  if (!path) return false;

  const pathname = (path.split("?")[0] || "").trim();

  // Bio public profiles (e.g. /@theglenmore) have a dedicated standalone profile footer
  if (parseAtHandle(pathname)) return false;

  // Check excluded functional/utility views
  for (const prefix of EXCLUDED_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return false;
    }
  }

  return true;
}
