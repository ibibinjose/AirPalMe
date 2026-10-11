import { toast } from "sonner";
import { publicSiteOrigin } from "./public-origin";
import { getNativePlatform } from "./native";

/**
 * Checks if the current environment is an Apple device (iOS, iPadOS, macOS)
 * where .pkpass files are natively recognized and added to Apple Wallet.
 */
export function isApplePlatform(): boolean {
  if (getNativePlatform() === "ios") return true;
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const platform =
    (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    "";
  return /iPhone|iPad|iPod|Macintosh/i.test(ua) || /iPhone|iPad|iPod|Mac/i.test(platform);
}

/**
 * Returns the public URL for a ticket's Apple Wallet .pkpass bundle.
 */
export function ticketWalletPassUrl(bookingId: string): string {
  const origin = publicSiteOrigin();
  return origin + "/api/wallet/ticket/" + encodeURIComponent(bookingId) + ".pkpass";
}

/**
 * Returns the public URL for an AirPal profile / business card Apple Wallet .pkpass bundle.
 */
export function businessCardWalletPassUrl(handle: string): string {
  const origin = publicSiteOrigin();
  return origin + "/api/wallet/card/" + encodeURIComponent(handle) + ".pkpass";
}

/**
 * Google Wallet save-link endpoints (answer `{ saveUrl }` JSON — the client
 * opens the pay.google.com save link, which installs the pass).
 */
export function googleWalletTicketUrl(bookingId: string): string {
  const origin = publicSiteOrigin();
  return origin + "/api/wallet/google/ticket/" + encodeURIComponent(bookingId);
}

export function googleWalletCardUrl(handle: string): string {
  const origin = publicSiteOrigin();
  return origin + "/api/wallet/google/card/" + encodeURIComponent(handle);
}

/**
 * In local development, rewrites public airpal.me URL to relative /api/wallet
 * so requests route via the Vite dev server proxy without CORS complications.
 */
function normalizeWalletUrl(url: string): string {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    return url.replace(/^https?:\/\/airpal\.me/, "");
  }
  return url;
}

/**
 * Fetches the signed Google save link and opens it. Honest toasts for the
 * unconfigured (501) and missing (404) states — never a dead link.
 */
export async function openGoogleWalletPass(url: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const targetUrl = normalizeWalletUrl(url);
    const res = await fetch(targetUrl);
    if (!res.ok) {
      toast.error(
        res.status === 501
          ? "Google Wallet isn't set up yet — ask your host for another ticket option."
          : res.status === 404
            ? "This pass is not yet available in your account."
            : "Couldn't load the Wallet pass — try again.",
      );
      return false;
    }
    const { saveUrl } = (await res.json()) as { saveUrl?: string };
    if (!saveUrl) {
      toast.error("Couldn't load the Wallet pass — try again.");
      return false;
    }
    window.open(saveUrl, "_blank", "noopener,noreferrer");
    return true;
  } catch (err) {
    console.error("Failed to open Google Wallet pass:", err);
    toast.error("Couldn't load the Wallet pass — try again.");
    return false;
  }
}

/**
 * Opens or downloads the Apple Wallet pass.
 * On iOS/macOS Safari and native iOS Capacitor, navigating directly to a .pkpass
 * URL triggers the native PKAddPassesViewController dialog automatically.
 *
 * A HEAD preflight runs first so a missing pass or an unconfigured signer
 * shows an honest toast instead of downloading an error page as a "pass".
 */
export async function openAppleWalletPass(url: string, title?: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const targetUrl = normalizeWalletUrl(url);
    const head = await fetch(targetUrl, { method: "HEAD" });
    if (!head.ok) {
      toast.error(
        head.status === 501
          ? "Apple Wallet isn't set up yet — ask your host for another ticket option."
          : head.status === 404
            ? "This pass is not yet available in your account."
            : "Couldn't load the Wallet pass — try again.",
      );
      return false;
    }
    if (getNativePlatform() === "ios") {
      // In iOS WKWebView / Capacitor, opening with target '_system' delegates
      // the .pkpass mime type to iOS Safari, which automatically displays
      // the native PKAddPassesViewController "Add to Apple Wallet" sheet.
      window.open(targetUrl, "_system");
      return true;
    }
    const a = document.createElement("a");
    a.href = targetUrl;
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    if (title) a.download = title.toLowerCase().replace(/[^a-z0-9]/g, "-") + ".pkpass";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (err) {
    console.error("Failed to open Apple Wallet pass:", err);
    toast.error("Couldn't load the Wallet pass — try again.");
    return false;
  }
}
