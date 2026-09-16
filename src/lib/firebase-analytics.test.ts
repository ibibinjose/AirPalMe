import { describe, expect, it, vi, beforeEach } from "vitest";

const storageMap = new Map<string, string>();
const mockStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, val: string) => storageMap.set(key, String(val)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  get length() {
    return storageMap.size;
  },
  key: (i: number) => Array.from(storageMap.keys())[i] ?? null,
};

if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage.clear) {
  Object.defineProperty(globalThis, "localStorage", {
    value: mockStorage,
    writable: true,
  });
}

import {
  sanitizeAnalyticsParams,
  logFirebaseEvent,
  logFirebaseScreenView,
  logFeatureEngagement,
} from "./firebase-analytics";
import { setFirebaseAnalyticsForTesting } from "./firebase";
import { setAnalyticsConsent } from "./analytics";

describe("firebase-analytics", () => {
  const mockLogEvent = vi.fn();
  const mockSetUserId = vi.fn();
  const mockSetUserProperties = vi.fn();

  const fakeAnalytics = {
    app: { name: "[DEFAULT]" },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    storageMap.clear();
    setAnalyticsConsent("analytics");
    setFirebaseAnalyticsForTesting(fakeAnalytics);

    vi.doMock("firebase/analytics", () => ({
      getAnalytics: vi.fn(() => fakeAnalytics),
      isSupported: vi.fn().mockResolvedValue(true),
      logEvent: mockLogEvent,
      setUserId: mockSetUserId,
      setUserProperties: mockSetUserProperties,
    }));
  });

  describe("sanitizeAnalyticsParams", () => {
    it("strips sensitive keys such as password, wifiPassword, email, and tokens", () => {
      const raw = {
        city: "Sydney",
        wifiPassword: "supersecretpassword",
        token: "tok-12345",
        email: "user@example.com",
        phone: "+61400000000",
        count: 42,
        isActive: true,
      };

      const sanitized = sanitizeAnalyticsParams(raw);

      expect(sanitized).toEqual({
        city: "Sydney",
        count: 42,
        isActive: 1,
      });
      expect(sanitized.wifiPassword).toBeUndefined();
      expect(sanitized.token).toBeUndefined();
      expect(sanitized.email).toBeUndefined();
      expect(sanitized.phone).toBeUndefined();
    });

    it("strips full URLs down to origin and pathname", () => {
      const raw = {
        url: "https://airpal.me/guide?token=secret123",
        redirectUrl: "https://airpal.me/guide?token=secret123",
      };

      const sanitized = sanitizeAnalyticsParams(raw);
      expect(sanitized.url).toBeUndefined();
      expect(sanitized.redirectUrl).toBe("https://airpal.me/guide");
    });

    it("truncates strings exceeding 200 characters", () => {
      const longString = "a".repeat(300);
      const sanitized = sanitizeAnalyticsParams({ description: longString });
      expect(sanitized.description).toHaveLength(200);
    });
  });

  describe("logFirebaseEvent", () => {
    it("does not log if consent is denied", async () => {
      setAnalyticsConsent("denied");
      const logged = await logFirebaseEvent("test_event", { foo: "bar" });
      expect(logged).toBe(false);
      expect(mockLogEvent).not.toHaveBeenCalled();
    });
  });

  describe("helpers", () => {
    it("formats screen view parameters correctly", async () => {
      const raw = {
        screen_name: "Stay Concierge",
        page_path: "/stay",
      };
      const sanitized = sanitizeAnalyticsParams(raw);
      expect(sanitized.screen_name).toBe("Stay Concierge");
      expect(sanitized.page_path).toBe("/stay");
      await expect(logFirebaseScreenView("Stay Concierge", "AppShell")).resolves.not.toThrow();
    });

    it("formats feature engagement parameters correctly", async () => {
      const raw = {
        feature_name: "guide",
        action_type: "share_guide",
        city: "Sydney",
      };
      const sanitized = sanitizeAnalyticsParams(raw);
      expect(sanitized.feature_name).toBe("guide");
      expect(sanitized.action_type).toBe("share_guide");
      expect(sanitized.city).toBe("Sydney");
      await expect(logFeatureEngagement("guide", "share_guide", { city: "Sydney" })).resolves.not.toThrow();
    });
  });
});
