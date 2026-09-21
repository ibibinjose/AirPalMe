import { toast } from "sonner";
import { Share } from "@capacitor/share";
import { isNativeApp } from "./native";
import { publicSiteOrigin, toPublicUrl } from "./public-origin";

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
  copiedMessage?: string;
}

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

/**
 * Checks if the environment supports native/system share sheets via
 * @capacitor/share or Web Share API (navigator.share).
 */
export function isShareSupported(): boolean {
  if (isNativeApp()) return true;
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/**
 * Universal share function prioritizing native/system share sheets
 * (@capacitor/share on iOS/Android, Web Share API on modern browsers)
 * with an automatic fallback to clipboard copy + toast when unsupported.
 */
export async function shareContent(options: ShareOptions): Promise<ShareResult> {
  const url = toPublicUrl(options.url || (typeof window !== "undefined" ? window.location.href : publicSiteOrigin()));
  const title = options.title || "AirPal";
  const text = options.text;
  const dialogTitle = options.dialogTitle || "Share via";
  const copiedMessage = options.copiedMessage || "Link copied to clipboard";

  // 1. Native Capacitor platform (iOS / Android)
  if (isNativeApp()) {
    try {
      await Share.share({
        title,
        text,
        url,
        dialogTitle,
      });
      return "shared";
    } catch (err: unknown) {
      if (isAbortOrCancel(err)) {
        return "cancelled";
      }
      // Fall through to clipboard if share failed on native
    }
  }

  // 2. Web Share API (navigator.share)
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      // Some browsers require url, title, or text
      const shareData: ShareData = { title, url };
      if (text) shareData.text = text;

      // Check navigator.canShare if available
      if (!navigator.canShare || navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return "shared";
      }
    } catch (err: unknown) {
      if (isAbortOrCancel(err)) {
        return "cancelled";
      }
      // On non-abort error (e.g. permission/iframe constraint), proceed to clipboard fallback
    }
  }

  // 3. Fallback: Copy URL to clipboard and show toast
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      toast.success(copiedMessage);
      return "copied";
    }

    // Legacy execCommand fallback if clipboard API is unavailable
    if (typeof document !== "undefined") {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success(copiedMessage);
      return "copied";
    }
  } catch {
    toast.error("Could not share or copy link");
    return "failed";
  }

  toast.error("Could not share or copy link");
  return "failed";
}

function isAbortOrCancel(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === "object") {
    const errorObj = err as { name?: string; message?: string };
    if (errorObj.name === "AbortError") return true;
    const msg = errorObj.message?.toLowerCase() || "";
    if (msg.includes("abort") || msg.includes("cancel") || msg.includes("dismiss")) {
      return true;
    }
  }
  return false;
}

/**
 * Share the user's current city/location and corresponding precinct guide.
 */
export async function shareCurrentLocation(city: string, _options?: { source?: string }): Promise<ShareResult> {
  const origin = publicSiteOrigin();
  const targetCity = city || "Sydney";
  const url = `${origin}/guide?city=${encodeURIComponent(targetCity)}`;
  const title = `Exploring ${targetCity} · AirPal`;
  const text = `I'm exploring ${targetCity} on AirPal! Check out what's around and the curated precinct guide:`;

  return shareContent({
    title,
    text,
    url,
    dialogTitle: `Share ${targetCity} Guide`,
    copiedMessage: `${targetCity} guide link copied to clipboard`,
  });
}

/**
 * Share the curated local guide page for a city or precinct.
 */
export async function shareCuratedGuide(city?: string): Promise<ShareResult> {
  const origin = publicSiteOrigin();
  const targetCity = city || "Sydney";
  const url = `${origin}/guide?city=${encodeURIComponent(targetCity)}`;
  const title = `${targetCity} Curated Local Guide · AirPal`;
  const text = `Explore curated walking tours, hidden laneways, and top sights in ${targetCity} on AirPal:`;

  return shareContent({
    title,
    text,
    url,
    dialogTitle: `Share ${targetCity} Guide`,
    copiedMessage: "Curated guide link copied to clipboard",
  });
}

/**
 * Share a specific walking tour or experience.
 */
export async function shareTour(tour: {
  id: string;
  title: string;
  duration?: string;
  city?: string;
}): Promise<ShareResult> {
  const origin = publicSiteOrigin();
  const url = `${origin}/tour/${tour.id}`;
  const title = `${tour.title} · Curated Walk`;
  const text = `Take the "${tour.title}" walking tour (${tour.duration || "Self-guided"}) on AirPal:`;

  return shareContent({
    title,
    text,
    url,
    dialogTitle: `Share ${tour.title}`,
    copiedMessage: "Walking tour link copied to clipboard",
  });
}
