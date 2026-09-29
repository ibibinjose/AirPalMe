import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Share } from "@capacitor/share";
import { App } from "@capacitor/app";
import { registerNativePush } from "./notifications";
import { toPublicUrl } from "./public-origin";

/**
 * Modal back handler registry for Android hardware back button.
 * Modals register themselves on mount and unregister on unmount.
 */
let modalCloseHandler: (() => boolean) | null = null;

/**
 * Register a modal close handler for Android back button.
 * Returns true if modal was closed, false otherwise.
 */
export function registerModalBackHandler(handler: () => boolean): void {
  modalCloseHandler = handler;
}

/**
 * Unregister modal close handler when modal unmounts.
 */
export function unregisterModalBackHandler(): void {
  modalCloseHandler = null;
}

/** Re-exported from platform.ts so existing importers keep working. */
import { getNativePlatform, isNativeApp } from "./platform";
export { getNativePlatform, isNativeApp };

export type HapticStyle = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

/**
 * Trigger subtle, tactile haptic feedback on native devices.
 * Gracefully degrades to a silent no-op or web vibration.
 */
export async function triggerHaptic(
  style: HapticStyle = "light",
): Promise<void> {
  if (!isNativeApp()) {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        if (style === "light" || style === "selection") navigator.vibrate(10);
        else if (style === "medium") navigator.vibrate(20);
        else if (style === "heavy") navigator.vibrate(35);
        else if (style === "success") navigator.vibrate([15, 30, 25]);
        else if (style === "warning" || style === "error") navigator.vibrate([30, 40, 30]);
      } catch {
        /* ignore */
      }
    }
    return;
  }

  try {
    switch (style) {
      case "selection":
        await Haptics.selectionChanged();
        break;
      case "light":
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case "medium":
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case "heavy":
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case "success":
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case "warning":
        await Haptics.notification({ type: NotificationType.Warning });
        break;
      case "error":
        await Haptics.notification({ type: NotificationType.Error });
        break;
    }
  } catch {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      /* ignore native haptics failure */
    }
  }
}

/**
 * Trigger selection haptics on list item selection, tab switches, and filter chips.
 */
export async function triggerHapticSelection(): Promise<void> {
  return triggerHaptic("selection");
}

/**
import { toPublicUrl } from "./public-origin";

/**
 * Universal share function. Uses native iOS/Android system share sheet on native,
 * and navigator.share or clipboard fallback on web. Always normalizes URL to https://airpal.me/...
 */
export async function shareNative(options: {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}): Promise<boolean> {
  const url = toPublicUrl(options.url);
  if (isNativeApp()) {
    try {
      await Share.share({
        title: options.title,
        text: options.text,
        url,
        dialogTitle: options.dialogTitle || "Share via",
      });
      return true;
    } catch {
      return false;
    }
  }

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url,
      });
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Hide native splash screen with a branded fade-out transition.
 * Sets the fadeOutDuration on Capacitor's SplashScreen plugin.
 */
export async function hideNativeSplash(options: { fadeOutDuration?: number } = {}): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const fadeOutDuration = options.fadeOutDuration ?? 350;
    await SplashScreen.hide({ fadeOutDuration });
  } catch {
    /* web session continues without native plugins */
  }
}

/**
 * Initialize native device features upon app launch.
 * Sets status bar overlays, brand background, hides splash, registers back button and deep link handlers.
 */
export async function initNativeApp(
  options: {
    fadeOutDuration?: number;
    deferSplashHide?: boolean;
  } = {},
): Promise<void> {
  if (!isNativeApp()) return;

  try {
    // Light chrome to match the paper app theme (no dark flash on launch).
    await StatusBar.setStyle({ style: Style.Light });
    if (getNativePlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#ffffff" });
      await StatusBar.setOverlaysWebView({ overlay: false });
    }

    // Hide splash screen after initialization unless deferred for branded transition
    if (!options.deferSplashHide) {
      await hideNativeSplash({ fadeOutDuration: options.fadeOutDuration ?? 350 });
    }

    // Native push registration (no-op until @capacitor/push-notifications is installed).
    try {
      await registerNativePush();
    } catch {
      /* inbox still works */
    }

    // Handle incoming Universal Links & Deep Links (e.g. https://airpal.me/plan/plan-xyz or me.airpal.app://...)
    App.addListener("appUrlOpen", (data: { url: string }) => {
      if (!data?.url) return;
      try {
        const u = new URL(data.url);
        const targetPath = `${u.pathname}${u.search}${u.hash}`;
        if (targetPath && targetPath !== "/") {
          window.history.pushState(null, "", targetPath);
          window.dispatchEvent(new Event("popstate"));
        }
      } catch {
        const match = data.url.match(/^(?:https?:\/\/[^/]+|[a-z0-9.-]+:\/\/)(.*)$/i);
        if (match && match[1]) {
          const target = match[1].startsWith("/") ? match[1] : `/${match[1]}`;
          window.history.pushState(null, "", target);
          window.dispatchEvent(new Event("popstate"));
        }
      }
    });

    // Handle Android hardware back button with modal support
    App.addListener("backButton", ({ canGoBack }) => {
      // First try to close modal if handler exists
      if (modalCloseHandler && modalCloseHandler()) {
        return; // Modal was closed, don't navigate
      }

      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch {
    /* web session continues without native plugins */
  }
}
