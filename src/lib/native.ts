import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Share } from "@capacitor/share";
import { App } from "@capacitor/app";

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

/**
 * Returns true if the application is running inside a Capacitor native iOS or Android shell.
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Returns the platform name: 'ios', 'android', or 'web'.
 */
export function getNativePlatform(): "ios" | "android" | "web" {
  const p = Capacitor.getPlatform();
  if (p === "ios" || p === "android") return p;
  return "web";
}

/**
 * Trigger subtle, tactile haptic feedback on native devices.
 * Gracefully degrades to a silent no-op or web vibration.
 */
export async function triggerHaptic(
  style: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light",
): Promise<void> {
  if (!isNativeApp()) {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        if (style === "light") navigator.vibrate(10);
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
    /* ignore native haptics failure */
  }
}

/**
 * Universal share function. Uses native iOS/Android system share sheet on native,
 * and navigator.share or clipboard fallback on web.
 */
export async function shareNative(options: {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}): Promise<boolean> {
  if (isNativeApp()) {
    try {
      await Share.share({
        title: options.title,
        text: options.text,
        url: options.url,
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
        url: options.url,
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
 * Sets status bar overlays, brand background, hides splash, and registers back button handlers.
 */
export async function initNativeApp(options: {
  fadeOutDuration?: number;
  deferSplashHide?: boolean;
} = {}): Promise<void> {
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
      const { registerNativePush } = await import("./notifications");
      await registerNativePush();
    } catch {
      /* inbox still works */
    }

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
