import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  getMeasurementId,
  logFeatureEngagement,
  logFirebaseEvent,
  logFirebaseScreenView,
  setFirebaseUserId,
  setFirebaseUserProperties,
  type CoreFeature,
} from "@/lib/firebase-analytics";
import { getFirebaseAnalytics, isFirebaseConfigured } from "@/lib/firebase";
import { track } from "@/lib/analytics";
import { useAuth } from "./AuthContext";
import { useLocale } from "./LocaleContext";
import { useLocalNow } from "./LocalNowContext";
import { useBattery } from "./BatteryContext";

export type { CoreFeature };

export interface AnalyticsContextValue {
  /** The Firebase Analytics measurement ID from the environment (e.g. G-XXXXX). */
  measurementId: string | undefined;
  /** Whether Firebase is configured and Analytics is loaded/supported. */
  isReady: boolean;
  /** Direct event logger for Firebase Analytics */
  trackEvent: (name: string, params?: Record<string, unknown>) => Promise<boolean>;
  /** High-level tracker for engagement with core product features */
  trackFeatureEngagement: (feature: CoreFeature, action: string, details?: Record<string, unknown>) => Promise<void>;
  /** Manual screen/page view logger */
  trackScreen: (screenName: string, path?: string) => Promise<void>;
}

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

/** Maps pathname patterns to human-readable screen names for analytics. */
function screenNameForPath(path: string): string {
  if (path === "/" || path === "") return "Discover";
  if (path === "/stay") return "Stay Concierge";
  if (path === "/explore") return "Explore Precinct";
  if (path === "/guide") return "Curated Guide";
  if (path.startsWith("/tour/")) return "Walking Tour";
  if (path === "/scan") return "QR Scanner";
  if (path === "/calendar") return "Local Events Calendar";
  if (path === "/plan") return "Plan Hub";
  if (path === "/plan/new") return "New Plan";
  if (path.startsWith("/plan/")) return "Plan Detail";
  if (path === "/companion") return "Travel Companion";
  if (path === "/zoo") return "Zoo Hunt";
  if (path === "/club") return "Clubs";
  if (path === "/settings") return "Settings";
  if (path.startsWith("/p/")) return "Place Detail";
  if (path.startsWith("/e/")) return "Event Detail";
  if (path.startsWith("/host")) return "Host Workspace";
  if (path.startsWith("/bio/")) return "Bio Profile";
  if (path.startsWith("/campus/")) return "Campus View";
  if (path.startsWith("/marker/")) return "Street Marker";
  if (path === "/circle") return "Guest Circle";
  if (path === "/about") return "About";
  if (path === "/contact") return "Contact";
  if (path === "/privacy") return "Privacy Policy";
  if (path === "/terms") return "Terms of Service";
  if (path === "/cookies") return "Cookie Policy";
  return path.slice(0, 50);
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const measurementId = useMemo(() => getMeasurementId(), []);
  const [isReady, setIsReady] = useState(false);

  // Safely consume router location
  let currentPath = "/";
  try {
    const [loc] = useLocation();
    currentPath = loc;
  } catch {
    /* Outside Wouter router */
  }

  // Safely consume surrounding contexts if available
  let authUid: string | null = null;
  try {
    const auth = useAuth();
    authUid = auth?.user?.uid || null;
  } catch {
    /* AuthContext not ready */
  }

  let localeCode = "en";
  try {
    const localeCtx = useLocale();
    localeCode = localeCtx?.lang || "en";
  } catch {
    /* LocaleContext not ready */
  }

  let activeCity = "Sydney";
  try {
    const localNow = useLocalNow();
    activeCity = localNow?.city || "Sydney";
  } catch {
    /* LocalNowContext not ready */
  }

  let isPowerSave = false;
  try {
    const battery = useBattery();
    isPowerSave = Boolean(battery?.powerSaveActive);
  } catch {
    /* BatteryContext not ready */
  }

  // 1. Initialize Firebase Analytics on mount if configured
  useEffect(() => {
    let active = true;
    void (async () => {
      if (!isFirebaseConfigured || !measurementId) {
        if (active) setIsReady(false);
        return;
      }
      try {
        const instance = await getFirebaseAnalytics();
        if (active) setIsReady(Boolean(instance));
      } catch {
        if (active) setIsReady(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [measurementId]);

  // 2. Sync user ID when auth state changes
  useEffect(() => {
    if (isReady && authUid) {
      void setFirebaseUserId(authUid);
    }
  }, [isReady, authUid]);

  // 3. Sync user properties (language, city, power-save mode)
  useEffect(() => {
    if (!isReady) return;
    void setFirebaseUserProperties({
      preferred_language: localeCode,
      active_city: activeCity,
      battery_saver_active: isPowerSave,
    });
  }, [isReady, localeCode, activeCity, isPowerSave]);

  // 4. Automatic Screen / Page View Tracking
  const lastTrackedPath = useRef<string | null>(null);
  useEffect(() => {
    if (!currentPath || lastTrackedPath.current === currentPath) return;
    lastTrackedPath.current = currentPath;

    const screenName = screenNameForPath(currentPath);
    void logFirebaseScreenView(screenName, "AppShell", {
      screen_name: screenName,
      page_path: currentPath,
      city: activeCity,
      lang: localeCode,
    });
  }, [currentPath, activeCity, localeCode]);

  // 5. Active Engagement Time Monitoring
  useEffect(() => {
    let engagementStart = Date.now();

    const recordEngagement = () => {
      const now = Date.now();
      const elapsed = now - engagementStart;
      engagementStart = now;

      // Only record meaningful active periods (e.g. between 1 second and 1 hour)
      if (elapsed >= 1000 && elapsed <= 3_600_000) {
        void logFirebaseEvent("user_engagement", {
          engagement_time_msec: Math.round(elapsed),
          screen_name: screenNameForPath(currentPath),
          page_path: currentPath,
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        recordEngagement();
      } else {
        engagementStart = Date.now();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", recordEngagement);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", recordEngagement);
      recordEngagement();
    };
  }, [currentPath]);

  // Core API: Track custom Firebase Analytics events
  const trackEvent = useCallback(async (name: string, params?: Record<string, unknown>) => {
    return logFirebaseEvent(name, params);
  }, []);

  // Core API: Track core feature engagement
  const trackFeatureEngagement = useCallback(
    async (feature: CoreFeature, action: string, details: Record<string, unknown> = {}) => {
      // 1. Log to Firebase Analytics with measurement ID
      await logFeatureEngagement(feature, action, {
        city: activeCity,
        screen_name: screenNameForPath(currentPath),
        ...details,
      });

      // 2. Also record to AirPal internal ledger if applicable
      try {
        void track(
          "content_action",
          {
            actionType: "place_open",
            contextId: (details.contextId as string) || feature,
            featureName: feature,
            featureAction: action,
          },
          {
            contextId: (details.contextId as string) || feature,
            source: "internal",
          },
        );
      } catch {
        /* ignore */
      }
    },
    [activeCity, currentPath],
  );

  // Core API: Track manual screen
  const trackScreen = useCallback(
    async (screenName: string, path = currentPath) => {
      await logFirebaseScreenView(screenName, "AppShell", {
        screen_name: screenName,
        page_path: path,
        city: activeCity,
      });
    },
    [activeCity, currentPath],
  );

  const value = useMemo<AnalyticsContextValue>(
    () => ({
      measurementId,
      isReady,
      trackEvent,
      trackFeatureEngagement,
      trackScreen,
    }),
    [measurementId, isReady, trackEvent, trackFeatureEngagement, trackScreen],
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) {
    // Return safe fallback so components can call useAnalytics() anywhere without crashing
    return {
      measurementId: getMeasurementId(),
      isReady: false,
      trackEvent: async () => false,
      trackFeatureEngagement: async () => {},
      trackScreen: async () => {},
    };
  }
  return ctx;
}
