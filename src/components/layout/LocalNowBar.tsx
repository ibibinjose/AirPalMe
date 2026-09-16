import {
  BatteryLow,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  MapPin,
  Moon,
  Share2,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { useLocalNow } from "@/hooks/useLocalNow";
import { useBattery } from "@/hooks/useBattery";
import { shareCurrentLocation } from "@/lib/share";
import { weatherLabelKey } from "@/lib/weather";
import { cn } from "@/lib/cn";
import { useLocale } from "@/contexts/LocaleContext";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { LocationSheet } from "./LocationSheet";

function SkyIcon({ code, isDay, size = 14 }: { code: number; isDay: boolean; size?: number }) {
  if (code === 0) return isDay ? <Sun size={size} /> : <Moon size={size} />;
  if (code <= 2) return isDay ? <CloudSun size={size} /> : <Cloud size={size} />;
  if (code === 3) return <Cloud size={size} />;
  if (code <= 48) return <CloudFog size={size} />;
  if (code <= 67 || (code >= 80 && code <= 82)) return <CloudRain size={size} />;
  if (code <= 77 || (code >= 85 && code <= 86)) return <CloudSnow size={size} />;
  if (code >= 95) return <CloudLightning size={size} />;
  return <CloudSun size={size} />;
}

export function LocalNowBar() {
  const { weather, time, day, loading, city, source, shareLocation } = useLocalNow();
  const { isLowBattery, powerSaveActive, percentageText, togglePowerSave } = useBattery();
  const { t } = useLocale();
  const { trackFeatureEngagement } = useAnalytics();
  const [picker, setPicker] = useState(false);
  const today = weather?.days[0];
  const condition = weather ? t(weatherLabelKey(weather.code, weather.isDay)) : "";
  const placeLabel = weather?.city || city || (loading ? t("locating") : t("nearYou"));

  return (
    <div className="border-b border-line/70 bg-paper/95 backdrop-blur-xl">
      <LocationSheet open={picker} onClose={() => setPicker(false)} />
      <div className="mx-auto flex h-8 max-w-6xl items-center gap-2 px-3 sm:h-9 sm:gap-3 sm:px-4 md:px-6">
        <button
          type="button"
          onClick={() => {
            void trackFeatureEngagement("weather", "open_location_picker", { city });
            setPicker(true);
          }}
          className="group flex min-w-0 max-w-[42%] items-center gap-1 rounded-full px-1 py-0.5 text-ink transition hover:bg-card active:scale-95 sm:max-w-none"
          title="Select location & precinct"
          aria-label={`Current location: ${placeLabel}. Tap to select location`}
        >
          <MapPin size={12} className="shrink-0 text-gold" />
          <span className="truncate text-[12px] font-semibold sm:text-[13px]" title={source === "gps" ? t("nearYou") : placeLabel}>
            {placeLabel}
          </span>
          {shareLocation && (
            <span className="hidden shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-px text-[10px] font-semibold text-emerald-800 sm:inline">
              Circle
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            void trackFeatureEngagement("share", "share_current_location", { city });
            void shareCurrentLocation(city);
          }}
          className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-full text-mute ring-1 ring-line/60 transition hover:bg-card hover:text-ink sm:grid"
          title={`Share ${city || "current location"} guide`}
          aria-label={`Share ${city || "current location"} guide`}
        >
          <Share2 size={11} className="text-gold" />
        </button>

        <span className="h-3.5 w-px shrink-0 bg-line" />

        <p className="shrink-0 font-display text-[13px] font-semibold tabular-nums leading-none sm:text-[14px]">
          {time}
          <span className="ml-1.5 hidden text-[11px] font-medium text-mute sm:inline">{day}</span>
        </p>

        <span className="h-3.5 w-px shrink-0 bg-line" />

        <div className={cn("flex min-w-0 flex-1 items-center gap-1.5", loading && "opacity-50")}>
          {weather ? (
            <>
              <span className="shrink-0 text-gold">
                <SkyIcon code={weather.code} isDay={weather.isDay} />
              </span>
              <span className="font-display text-[13px] font-semibold leading-none sm:text-[14px]">{weather.temp}°</span>
              <span className="truncate text-[11px] text-mute sm:text-[12px]">{condition}</span>
              {today && (
                <span className="hidden shrink-0 text-[11px] text-mute md:inline">
                  {today.high}° / {today.low}°
                </span>
              )}
            </>
          ) : (
            <span className="text-[11px] text-mute">{loading ? t("forecast") : t("timeOnly")}</span>
          )}
        </div>

        {(isLowBattery || powerSaveActive) && (
          <button
            type="button"
            onClick={togglePowerSave}
            className={cn(
              "shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition active:scale-95",
              powerSaveActive
                ? "bg-amber-500/15 text-amber-900 ring-1 ring-amber-500/30 hover:bg-amber-500/25"
                : "bg-paper text-mute ring-1 ring-line hover:text-ink",
            )}
            title={`Battery ${percentageText} · Power Saver ${powerSaveActive ? "active" : "off"} · Tap to toggle`}
            aria-label={`Battery ${percentageText}. Power Saver is ${powerSaveActive ? "active" : "off"}`}
          >
            <BatteryLow size={12} className={powerSaveActive ? "text-amber-700" : "text-mute"} />
            <span className="tabular-nums">{percentageText !== "—%" ? percentageText : "Saver"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
