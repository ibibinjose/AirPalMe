import { useState } from "react";
import { Clock, Calendar, Sparkles } from "lucide-react";
import { TradingHoursModal } from "./TradingHoursModal";
import { TRADING_HOURS_PRESETS, format7DaySchedule } from "@/lib/trading-hours";
import { cn } from "@/lib/cn";

export interface TradingHoursFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  showQuickPresets?: boolean;
}

const DEFAULT_INPUT_CLASS =
  "w-full rounded-2xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink placeholder:text-mute focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand shadow-xs transition";

export function TradingHoursField({
  value,
  onChange,
  label = "Trading / Opening Hours",
  placeholder = "e.g. Mon–Fri 7:00 AM – 4:00 PM, Sat 8:00 AM – 2:00 PM",
  className,
  inputClassName = DEFAULT_INPUT_CLASS,
  showQuickPresets = true,
}: TradingHoursFieldProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const applyPreset = (presetId: string) => {
    const preset = TRADING_HOURS_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const formatted = format7DaySchedule(preset.build());
    onChange(formatted);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label and 7-Day Helper Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-mute">
          <Clock size={13} className="text-accent" />
          <span>{label}</span>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 hover:bg-brand/15 px-2.5 py-1 text-xs font-semibold text-accent transition active:scale-95 border border-brand/20 shadow-xs"
        >
          <Calendar size={12} />
          <span>7-Day Schedule Helper</span>
        </button>
      </div>

      {/* Main Text Input with Helper trigger */}
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(inputClassName, "pr-10")}
        />
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          title="Open 7-day schedule helper"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-xl text-mute hover:text-accent hover:bg-brand/10 transition"
        >
          <Calendar size={15} />
        </button>
      </div>

      {/* Quick 1-Tap Presets Bar */}
      {showQuickPresets && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-mute flex items-center gap-1 mr-0.5">
            <Sparkles size={10} className="text-accent" /> Presets:
          </span>
          {TRADING_HOURS_PRESETS.slice(0, 4).map((p) => {
            const formatted = format7DaySchedule(p.build());
            const isMatch = value.trim() === formatted.trim();
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={cn(
                  "rounded-lg px-2 py-0.5 text-[11px] font-medium transition active:scale-95 border",
                  isMatch
                    ? "bg-brand text-white border-brand shadow-xs"
                    : "bg-surface hover:bg-surface-hover text-mute hover:text-ink border-line/60",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      {/* 7-Day Modal */}
      {modalOpen && (
        <TradingHoursModal open={modalOpen} onClose={() => setModalOpen(false)} value={value} onApply={onChange} />
      )}
    </div>
  );
}
