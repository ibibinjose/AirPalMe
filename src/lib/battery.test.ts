import { describe, expect, it, beforeEach } from "vitest";
import {
  formatBatteryPercentage,
  getStoredPowerSaveMode,
  isLowBattery,
  isPowerSaveActive,
  maxSyncRetries,
  powerSaveRetryDelayMs,
  resetMemoryPowerSaveMode,
  savePowerSaveMode,
  POWER_SAVE_STORAGE_KEY,
} from "./battery";

describe("battery status monitor & power save logic", () => {
  beforeEach(() => {
    resetMemoryPowerSaveMode();
    try {
      localStorage.removeItem(POWER_SAVE_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  });

  describe("isLowBattery", () => {
    it("identifies low battery when <= 20% and not charging", () => {
      expect(isLowBattery(0.2, false)).toBe(true);
      expect(isLowBattery(0.15, false)).toBe(true);
      expect(isLowBattery(0.05, false)).toBe(true);
    });

    it("returns false if battery is charging, regardless of level", () => {
      expect(isLowBattery(0.1, true)).toBe(false);
      expect(isLowBattery(0.01, true)).toBe(false);
    });

    it("returns false if battery is above threshold", () => {
      expect(isLowBattery(0.21, false)).toBe(false);
      expect(isLowBattery(0.8, false)).toBe(false);
      expect(isLowBattery(1.0, false)).toBe(false);
    });

    it("returns false if level is unknown (null)", () => {
      expect(isLowBattery(null, false)).toBe(false);
      expect(isLowBattery(null, null)).toBe(false);
    });

    it("supports custom threshold if specified", () => {
      expect(isLowBattery(0.25, false, 0.3)).toBe(true);
      expect(isLowBattery(0.35, false, 0.3)).toBe(false);
    });
  });

  describe("isPowerSaveActive", () => {
    it("respects 'on' mode explicitly regardless of battery", () => {
      expect(isPowerSaveActive("on", false)).toBe(true);
      expect(isPowerSaveActive("on", true)).toBe(true);
    });

    it("respects 'off' mode explicitly regardless of battery", () => {
      expect(isPowerSaveActive("off", false)).toBe(false);
      expect(isPowerSaveActive("off", true)).toBe(false);
    });

    it("evaluates to isLow when mode is 'auto'", () => {
      expect(isPowerSaveActive("auto", true)).toBe(true);
      expect(isPowerSaveActive("auto", false)).toBe(false);
    });
  });

  describe("formatBatteryPercentage", () => {
    it("formats fractional level into human-readable percentage", () => {
      expect(formatBatteryPercentage(0.18)).toBe("18%");
      expect(formatBatteryPercentage(1)).toBe("100%");
      expect(formatBatteryPercentage(0)).toBe("0%");
      expect(formatBatteryPercentage(0.054)).toBe("5%");
    });

    it("handles null or invalid levels safely", () => {
      expect(formatBatteryPercentage(null)).toBe("—%");
      expect(formatBatteryPercentage(Number.NaN)).toBe("—%");
    });
  });

  describe("powerSaveRetryDelayMs & maxSyncRetries", () => {
    it("provides extended backoff delays to reduce cellular radio wakeups", () => {
      expect(powerSaveRetryDelayMs(0)).toBe(6000);
      expect(powerSaveRetryDelayMs(1)).toBe(12000);
      expect(powerSaveRetryDelayMs(2)).toBe(24000);
      expect(powerSaveRetryDelayMs(3)).toBe(48000);
      expect(powerSaveRetryDelayMs(10)).toBe(120000);
    });

    it("reduces maximum retries in power save mode to prevent battery drain", () => {
      expect(maxSyncRetries(true)).toBe(2);
      expect(maxSyncRetries(false)).toBe(3);
    });
  });

  describe("power save mode storage", () => {
    it("defaults to 'auto' when no stored preference exists", () => {
      expect(getStoredPowerSaveMode()).toBe("auto");
    });

    it("saves and retrieves 'on', 'off', and 'auto'", () => {
      savePowerSaveMode("on");
      expect(getStoredPowerSaveMode()).toBe("on");

      savePowerSaveMode("off");
      expect(getStoredPowerSaveMode()).toBe("off");

      savePowerSaveMode("auto");
      expect(getStoredPowerSaveMode()).toBe("auto");
    });
  });
});
