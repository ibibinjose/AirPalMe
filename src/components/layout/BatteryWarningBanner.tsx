import { AnimatePresence, motion } from "framer-motion";
import { BatteryCharging, BatteryLow, BatteryWarning, X } from "lucide-react";
import { useBattery } from "@/hooks/useBattery";
import { useLocale } from "@/contexts/LocaleContext";
import { useAnalytics } from "@/contexts/AnalyticsContext";

export function BatteryWarningBanner() {
  const {
    percentageText,
    charging,
    isLowBattery,
    powerSaveActive,
    bannerDismissed,
    dismissBanner,
    togglePowerSave,
  } = useBattery();
  const { t } = useLocale();
  const { trackFeatureEngagement } = useAnalytics();

  const handleToggle = () => {
    void trackFeatureEngagement("battery_saver", "toggle_power_save", {
      active: !powerSaveActive,
    });
    togglePowerSave();
  };

  const handleDismiss = () => {
    void trackFeatureEngagement("battery_saver", "dismiss_banner");
    dismissBanner();
  };

  const shouldShow = (isLowBattery || powerSaveActive) && !bannerDismissed;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.aside
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="status"
          aria-live="polite"
          className="border-b border-amber-900/10 bg-amber-50/80 text-amber-950 backdrop-blur-md"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-1.5 text-xs sm:px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100/90 text-amber-800 ring-1 ring-amber-300/60">
                {charging ? (
                  <BatteryCharging size={12} className="animate-pulse" />
                ) : isLowBattery ? (
                  <BatteryLow size={12} className="text-amber-700" />
                ) : (
                  <BatteryWarning size={12} className="text-amber-700" />
                )}
              </span>
              <div className="flex min-w-0 items-baseline gap-1.5 truncate">
                <strong className="font-semibold text-amber-900">
                  {isLowBattery ? t("battery.low") || "Low Battery" : t("battery.powerSaver") || "Power Saver"}
                  {percentageText !== "—%" ? ` (${percentageText})` : ""}
                </strong>
                <span className="hidden text-amber-800/90 sm:inline">
                  — {t("battery.saving") || "Background sync reduced to conserve battery on travel days."}
                </span>
                <span className="text-amber-800/90 sm:hidden">
                  — {t("battery.savingMobile") || "Sync throttled to save power."}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleToggle}
                className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[11px] font-medium text-amber-900 hover:bg-amber-300/80 active:scale-95 transition"
                aria-label={powerSaveActive ? "Turn off Power Saver" : "Turn on Power Saver"}
              >
                {powerSaveActive
                  ? t("battery.turnOff") || "Turn Off"
                  : t("battery.turnOn") || "Turn On"}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="grid h-5 w-5 place-items-center rounded-full text-amber-800 hover:bg-amber-200/60 hover:text-amber-950 transition"
                aria-label="Dismiss low battery alert"
                title="Dismiss"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
