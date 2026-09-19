import { SENSITIVE_PROPERTY_KEYS, ANALYTICS_MAX_STRING } from "@shared/analytics";
import { analyticsEnabled, analyticsEnvironment, getFirebaseAnalytics, getMeasurementId } from "./firebase";
import { getAnalyticsConsent } from "./analytics";

const SENSITIVE = new Set<string>(SENSITIVE_PROPERTY_KEYS);

export type CoreFeature =
  | "stay"
  | "explore"
  | "guide"
  | "calendar"
  | "scan"
  | "plan"
  | "companion"
  | "weather"
  | "battery_saver"
  | "share"
  | "bio"
  | "club"
  | "zoo";

/** Sanitizes parameters for Firebase Analytics according to privacy policy. */
export function sanitizeAnalyticsParams(raw: Record<string, unknown> = {}): Record<string, string | number> {
  const clean: Record<string, string | number> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (value == null) continue;
    if (SENSITIVE.has(key)) continue;

    if (typeof value === "boolean") {
      clean[key] = value ? 1 : 0;
    } else if (typeof value === "number") {
      if (Number.isFinite(value)) clean[key] = value;
    } else if (typeof value === "string") {
      // Do not emit full URLs or query params with tokens
      if (value.startsWith("http://") || value.startsWith("https://")) {
        try {
          const u = new URL(value);
          clean[key] = (u.origin + u.pathname).slice(0, ANALYTICS_MAX_STRING);
        } catch {
          clean[key] = value.slice(0, ANALYTICS_MAX_STRING);
        }
      } else {
        clean[key] = value.slice(0, ANALYTICS_MAX_STRING);
      }
    }
  }

  return clean;
}

/**
 * Log an event directly to Firebase Analytics (GA4) with measurement ID.
 */
export async function logFirebaseEvent(eventName: string, eventParams: Record<string, unknown> = {}): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (getAnalyticsConsent() === "denied") return false;
  if (!analyticsEnabled()) return false;

  try {
    const analytics = await getFirebaseAnalytics();
    if (!analytics) return false;

    const { logEvent } = await import("firebase/analytics");
    const sanitized = sanitizeAnalyticsParams({
      env: analyticsEnvironment(),
      ...eventParams,
    });

    logEvent(analytics, eventName, sanitized);
    return true;
  } catch {
    /* never break app flow if analytics fails or is blocked */
    return false;
  }
}

/**
 * Set user ID in Firebase Analytics.
 */
export async function setFirebaseUserId(userId: string | null): Promise<void> {
  if (typeof window === "undefined") return;
  if (getAnalyticsConsent() === "denied") return;
  if (!analyticsEnabled()) return;

  try {
    const analytics = await getFirebaseAnalytics();
    if (!analytics) return;
    const { setUserId } = await import("firebase/analytics");
    setUserId(analytics, userId);
  } catch {
    /* ignore */
  }
}

/**
 * Set user properties in Firebase Analytics.
 */
export async function setFirebaseUserProperties(properties: Record<string, string | number | boolean>): Promise<void> {
  if (typeof window === "undefined") return;
  if (getAnalyticsConsent() === "denied") return;
  if (!analyticsEnabled()) return;

  try {
    const analytics = await getFirebaseAnalytics();
    if (!analytics) return;
    const { setUserProperties } = await import("firebase/analytics");
    const sanitized: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(properties)) {
      if (v == null || SENSITIVE.has(k)) continue;
      sanitized[k] = typeof v === "boolean" ? (v ? 1 : 0) : v;
    }
    setUserProperties(analytics, sanitized);
  } catch {
    /* ignore */
  }
}

/**
 * Log a screen/page view to Firebase Analytics.
 */
export async function logFirebaseScreenView(
  screenName: string,
  screenClass = "WebPage",
  extra: Record<string, unknown> = {},
): Promise<void> {
  await logFirebaseEvent("screen_view", {
    firebase_screen: screenName,
    firebase_screen_class: screenClass,
    screen_name: screenName,
    ...extra,
  });
}

/**
 * Log engagement with core product features to Firebase Analytics.
 */
export async function logFeatureEngagement(
  feature: CoreFeature,
  action: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  await logFirebaseEvent("feature_engagement", {
    feature_name: feature,
    action_type: action,
    ...details,
  });
}

export { getMeasurementId };
