export type PowerSaveMode = "auto" | "on" | "off";

export type BatteryState = {
  supported: boolean;
  level: number | null; // 0.0 to 1.0
  charging: boolean | null;
  chargingTime: number | null;
  dischargingTime: number | null;
};

export const POWER_SAVE_STORAGE_KEY = "airpal.power_save.mode";
export const LOW_BATTERY_THRESHOLD = 0.2; // 20%

/**
 * Checks if the Web Battery API is supported in the current environment.
 */
export function hasBatterySupport(): boolean {
  return typeof navigator !== "undefined" && typeof (navigator as NavigatorWithBattery).getBattery === "function";
}

export interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  onchargingchange: ((this: BatteryManager, ev: Event) => void) | null;
  onchargingtimechange: ((this: BatteryManager, ev: Event) => void) | null;
  ondischargingtimechange: ((this: BatteryManager, ev: Event) => void) | null;
  onlevelchange: ((this: BatteryManager, ev: Event) => void) | null;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

export type NavigatorWithBattery = Navigator & {
  getBattery?: () => Promise<BatteryManager>;
};

/**
 * Returns true if battery is at or below threshold and not actively charging.
 */
export function isLowBattery(
  level: number | null,
  charging: boolean | null,
  threshold: number = LOW_BATTERY_THRESHOLD,
): boolean {
  if (level === null) return false;
  if (charging === true) return false;
  return level <= threshold;
}

/**
 * Determines whether power save mode should be active.
 * - "on": explicitly enabled by user
 * - "off": explicitly disabled by user
 * - "auto": enabled when battery is low (<20% and discharging)
 */
export function isPowerSaveActive(mode: PowerSaveMode, isLow: boolean): boolean {
  if (mode === "on") return true;
  if (mode === "off") return false;
  return isLow;
}

let memoryMode: PowerSaveMode | null = null;

/**
 * Reads stored power save preference from localStorage (with in-memory fallback).
 */
export function getStoredPowerSaveMode(): PowerSaveMode {
  if (memoryMode !== null) return memoryMode;
  try {
    const val = typeof localStorage !== "undefined" ? localStorage.getItem(POWER_SAVE_STORAGE_KEY) : null;
    if (val === "on" || val === "off" || val === "auto") {
      memoryMode = val;
      return val;
    }
  } catch {
    /* ignore storage errors */
  }
  return "auto";
}

/**
 * Persists power save preference to localStorage (with in-memory fallback).
 */
export function savePowerSaveMode(mode: PowerSaveMode): void {
  memoryMode = mode;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(POWER_SAVE_STORAGE_KEY, mode);
    }
  } catch {
    /* ignore storage errors */
  }
}

/**
 * Resets in-memory mode cache (for tests).
 */
export function resetMemoryPowerSaveMode(): void {
  memoryMode = null;
}

/**
 * Formats battery level as percentage string (e.g., 0.18 -> "18%").
 */
export function formatBatteryPercentage(level: number | null): string {
  if (level === null || Number.isNaN(level)) return "—%";
  return `${Math.round(Math.max(0, Math.min(1, level)) * 100)}%`;
}

/**
 * Low-power retry backoff: expands delays to conserve mobile radio and CPU
 * during transit and long travel days.
 */
export function powerSaveRetryDelayMs(retries: number): number {
  return Math.min(120_000, 6000 * 2 ** Math.max(0, retries));
}

/**
 * Maximum sync retries permitted: reduced in power-save mode to prevent
 * draining the battery on bad cellular connections.
 */
export function maxSyncRetries(powerSave: boolean): number {
  return powerSave ? 2 : 3;
}
