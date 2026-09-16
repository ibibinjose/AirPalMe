import {
  BatteryLow,
  ChevronDown,
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

function SkyIcon({ code, isDay, size = 16 }: { code: number; isDay: boolean; size?: number }) {
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
    <div className="border-b border-line/70 bg-paper/90 backdrop-blur-xl">
      <LocationSheet open={picker} onClose={() => setPicker(false)} />
      <div className="mx-auto max-w-6xl px-4 py-2 md:px-6">
        <div className="flex items-center gap-3 overflow-hidden rounded-2xl bg-card px-3 py-2 ring-1 ring-line">
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => {
                void trackFeatureEngagement("weather", "open_location_picker", { city });
                setPicker(true);
              }}
              className="group flex min-w-0 items-center gap-1.5 rounded-xl px-2 py-1 text-ink transition hover:bg-paper active:scale-95 cursor-pointer"
              title="Select location & precinct"
              aria-label={`Current location: ${placeLabel}. Tap to select location`}
            >
              <MapPin size={14} className="shrink-0 text-gold transition-transform group-hover:scale-110" />
              <span className="truncate text-[13px] font-semibold group-hover:text-brand transition" title={source === "gps" ? t("nearYou") : placeLabel}>
                {placeLabel}
              </span>
              {shareLocation && (
                <span className="hidden shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 sm:inline">
                  Circle
                </span>
              )}
              <ChevronDown size={13} className="shrink-0 text-mute transition group-hover:text-ink group-hover:translate-y-0.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                void trackFeatureEngagement("share", "share_current_location", { city });
                void shareCurrentLocation(city);
              }}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-mute transition hover:bg-paper hover:text-ink ring-1 ring-line/60 active:scale-95 cursor-pointer"
              title={`Share ${city || "current location"} guide`}
              aria-label={`Share ${city || "current location"} guide`}
            >
              <Share2 size={11} className="text-gold" />
            </button>
          </div>

          <span className="hidden h-4 w-px bg-line sm:block" />

          <div className="shrink-0 tabular-nums">
            <p className="font-display text-[15px] font-semibold leading-none">{time}</p>
            <p className="mt-0.5 hidden text-[10px] text-mute sm:block">{day}</p>
          </div>

          <span className="hidden h-4 w-px bg-line sm:block" />

          <div className={cn("flex min-w-0 flex-1 items-center gap-2", loading && "opacity-50")}>
            {weather ? (
              <>
                <span className="text-gold">
                  <SkyIcon code={weather.code} isDay={weather.isDay} />
                </span>
                <span className="font-display text-[15px] font-semibold leading-none">{weather.temp}°</span>
                <span className="hidden truncate text-[12px] text-mute sm:inline">{condition}</span>
                {today && (
                  <span className="hidden text-[12px] text-mute md:inline">
                    {today.high}° / {today.low}°
                  </span>
                )}
              </>
            ) : (
              <span className="text-[12px] text-mute">{loading ? t("forecast") : t("timeOnly")}</span>
            )}
          </div>

          {(isLowBattery || powerSaveActive) && (
            <button
              type="button"
              onClick={togglePowerSave}
              className={cn(
                "shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition cursor-pointer active:scale-95",
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

          {weather && (
            <ul className="hidden items-center gap-1 lg:flex">
              {weather.days.map((d, i) => (
                <li
                  key={d.date}
                  className="flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-[11px] ring-1 ring-line"
                >
                  <span className="text-mute">{i === 0 ? t("now") : d.weekday}</span>
                  <span className="text-gold">
                    <SkyIcon code={d.code} isDay={weather.isDay} size={12} />
                  </span>
                  <span className="font-medium">{d.high}°</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
