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
  return (
    /iPhone|iPad|iPod|Macintosh/i.test(ua) ||
    /iPhone|iPad|iPod|Mac/i.test(platform)
  );
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
 * Opens or downloads the Apple Wallet pass.
 * On iOS/macOS Safari and native iOS Capacitor, navigating directly to a .pkpass
 * URL triggers the native PKAddPassesViewController dialog automatically.
 */
export async function openAppleWalletPass(url: string, title?: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    if (title) a.download = title.toLowerCase().replace(/[^a-z0-9]/g, "-") + ".pkpass";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (err) {
    console.error("Failed to open Apple Wallet pass:", err);
    return false;
  }
}
