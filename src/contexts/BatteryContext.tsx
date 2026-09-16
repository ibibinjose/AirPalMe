import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  formatBatteryPercentage,
  getStoredPowerSaveMode,
  hasBatterySupport,
  isLowBattery,
  isPowerSaveActive,
  savePowerSaveMode,
  type BatteryManager,
  type NavigatorWithBattery,
  type PowerSaveMode,
} from "@/lib/battery";

export type BatteryContextValue = {
  supported: boolean;
  level: number | null;
  percentageText: string;
  charging: boolean | null;
  chargingTime: number | null;
  dischargingTime: number | null;
  isLowBattery: boolean;
  mode: PowerSaveMode;
  setMode: (mode: PowerSaveMode) => void;
  powerSaveActive: boolean;
  bannerDismissed: boolean;
  dismissBanner: () => void;
  togglePowerSave: () => void;
  /** For dev/testing or manual simulation */
  simulateBattery?: (level: number, charging: boolean) => void;
};

const BatteryContext = createContext<BatteryContextValue | undefined>(undefined);

export function BatteryProvider({ children }: { children: ReactNode }) {
  const [supported, setSupported] = useState(() => hasBatterySupport());
  const [level, setLevel] = useState<number | null>(null);
  const [charging, setCharging] = useState<boolean | null>(null);
  const [chargingTime, setChargingTime] = useState<number | null>(null);
  const [dischargingTime, setDischargingTime] = useState<number | null>(null);
  const [mode, setModeState] = useState<PowerSaveMode>(() => getStoredPowerSaveMode());
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (!hasBatterySupport()) {
      setSupported(false);
      return;
    }

    let active = true;
    let managerRef: BatteryManager | null = null;

    const nav = navigator as NavigatorWithBattery;
    nav
      .getBattery?.()
      .then((mgr) => {
        if (!active || !mgr) return;
        managerRef = mgr;
        setSupported(true);
        setLevel(mgr.level);
        setCharging(mgr.charging);
        setChargingTime(mgr.chargingTime);
        setDischargingTime(mgr.dischargingTime);

        const handleLevel = () => {
          setLevel(mgr.level);
        };
        const handleCharging = () => {
          setCharging(mgr.charging);
        };
        const handleChargingTime = () => {
          setChargingTime(mgr.chargingTime);
        };
        const handleDischargingTime = () => {
          setDischargingTime(mgr.dischargingTime);
        };

        mgr.addEventListener("levelchange", handleLevel);
        mgr.addEventListener("chargingchange", handleCharging);
        mgr.addEventListener("chargingtimechange", handleChargingTime);
        mgr.addEventListener("dischargingtimechange", handleDischargingTime);

        return () => {
          mgr.removeEventListener("levelchange", handleLevel);
          mgr.removeEventListener("chargingchange", handleCharging);
          mgr.removeEventListener("chargingtimechange", handleChargingTime);
          mgr.removeEventListener("dischargingtimechange", handleDischargingTime);
        };
      })
      .catch(() => {
        if (active) setSupported(false);
      });

    return () => {
      active = false;
      if (managerRef) {
        // manager event listeners cleaned up if promise resolved
      }
    };
  }, []);

  const setMode = useCallback((next: PowerSaveMode) => {
    setModeState(next);
    savePowerSaveMode(next);
  }, []);

  const togglePowerSave = useCallback(() => {
    setModeState((current) => {
      const low = isLowBattery(level, charging);
      const activeNow = isPowerSaveActive(current, low);
      const next: PowerSaveMode = activeNow ? "off" : "on";
      savePowerSaveMode(next);
      return next;
    });
  }, [charging, level]);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
  }, []);

  const simulateBattery = useCallback((simLevel: number, simCharging: boolean) => {
    setSupported(true);
    setLevel(Math.max(0, Math.min(1, simLevel)));
    setCharging(simCharging);
  }, []);

  const isLow = useMemo(() => isLowBattery(level, charging), [level, charging]);
  const powerSaveActive = useMemo(() => isPowerSaveActive(mode, isLow), [mode, isLow]);
  const percentageText = useMemo(() => formatBatteryPercentage(level), [level]);

  const value = useMemo<BatteryContextValue>(
    () => ({
      supported,
      level,
      percentageText,
      charging,
      chargingTime,
      dischargingTime,
      isLowBattery: isLow,
      mode,
      setMode,
      powerSaveActive,
      bannerDismissed,
      dismissBanner,
      togglePowerSave,
      simulateBattery,
    }),
    [
      bannerDismissed,
      charging,
      chargingTime,
      dischargingTime,
      dismissBanner,
      isLow,
      level,
      mode,
      percentageText,
      powerSaveActive,
      setMode,
      simulateBattery,
      supported,
      togglePowerSave,
    ],
  );

  return <BatteryContext.Provider value={value}>{children}</BatteryContext.Provider>;
}

export function useBattery(): BatteryContextValue {
  const ctx = useContext(BatteryContext);
  if (!ctx) throw new Error("useBattery must be used within a BatteryProvider");
  return ctx;
}

export function useOptionalBattery(): BatteryContextValue | undefined {
  return useContext(BatteryContext);
}
