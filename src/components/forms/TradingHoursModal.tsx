import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import {
  DAYS_ORDER,
  DAY_METADATA,
  DayKey,
  DayStatus,
  format7DaySchedule,
  parseHoursTo7DaySchedule,
  TRADING_HOURS_PRESETS,
  WeekSchedule,
} from "@/lib/trading-hours";
import { Clock, Copy, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface TradingHoursModalProps {
  open: boolean;
  onClose: () => void;
  value: string;
  onApply: (formattedHours: string) => void;
}

export function TradingHoursModal({ open, onClose, value, onApply }: TradingHoursModalProps) {
  const [schedule, setSchedule] = useState<WeekSchedule>(() => parseHoursTo7DaySchedule(value));
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [copiedDay, setCopiedDay] = useState<DayKey | null>(null);

  const handleStatusChange = (day: DayKey, status: DayStatus) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        status,
      },
    }));
    setActivePreset(null);
  };

  const handleTimeChange = (day: DayKey, field: "openTime" | "closeTime", val: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: val,
        status: "open",
      },
    }));
    setActivePreset(null);
  };

  const handleLateToggle = (day: DayKey) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        isLate: !prev[day].isLate,
        status: "open",
      },
    }));
    setActivePreset(null);
  };

  const copyDayToWeekdays = (sourceDay: DayKey) => {
    const source = schedule[sourceDay];
    setSchedule((prev) => ({
      ...prev,
      mon: { ...source },
      tue: { ...source },
      wed: { ...source },
      thu: { ...source },
      fri: { ...source },
    }));
    setCopiedDay(sourceDay);
    setTimeout(() => setCopiedDay(null), 1500);
    setActivePreset(null);
  };

  const copyDayToAll = (sourceDay: DayKey) => {
    const source = schedule[sourceDay];
    const next = {} as WeekSchedule;
    for (const d of DAYS_ORDER) {
      next[d] = { ...source };
    }
    setSchedule(next);
    setCopiedDay(sourceDay);
    setTimeout(() => setCopiedDay(null), 1500);
    setActivePreset(null);
  };

  const applyPreset = (presetId: string) => {
    const preset = TRADING_HOURS_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSchedule(preset.build());
    setActivePreset(presetId);
  };

  const formattedResult = format7DaySchedule(schedule);

  const handleSave = () => {
    onApply(formattedResult);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      className="max-h-[min(92dvh,calc(var(--visual-viewport-height,100dvh)-1rem))] sm:max-w-xl p-0 overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="p-5 pb-3 border-b border-line/60 bg-paper/60 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-brand/10 text-accent">
              <Clock size={18} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-ink">7-Day Trading Hours</h2>
              <p className="text-xs text-mute">Set operating hours for each day of the week</p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
            <Sparkles size={12} /> Auto-summarized
          </span>
        </div>

        {/* Quick Presets */}
        <div className="mt-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mute mb-1.5 flex items-center gap-1">
            <Sparkles size={12} className="text-accent" />
            <span>Popular Presets</span>
          </p>
          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 scroll-container">
            {TRADING_HOURS_PRESETS.map((p) => {
              const isSelected = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  title={p.description}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition active:scale-95 whitespace-nowrap",
                    isSelected
                      ? "bg-brand text-white shadow-xs"
                      : "bg-surface hover:bg-surface-hover text-ink ring-1 ring-line/60",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 7 Days List (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 scroll-container">
        {DAYS_ORDER.map((dayKey) => {
          const meta = DAY_METADATA[dayKey];
          const daySched = schedule[dayKey];
          const isWeekend = dayKey === "sat" || dayKey === "sun";
          const isCopied = copiedDay === dayKey;

          return (
            <div
              key={dayKey}
              className={cn(
                "rounded-2xl p-3 sm:p-3.5 border transition-colors",
                daySched.status === "closed"
                  ? "border-line/40 bg-card/40 opacity-80"
                  : daySched.status === "24hours"
                    ? "border-brand/30 bg-brand/[0.02]"
                    : "border-line bg-card shadow-xs",
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Day Header & Status Segmented Buttons */}
                <div className="flex items-center justify-between sm:justify-start gap-2.5 min-w-[140px]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "grid h-6 w-6 place-items-center rounded-lg text-xs font-bold",
                        isWeekend ? "bg-amber-500/10 text-amber-600" : "bg-brand/10 text-accent",
                      )}
                    >
                      {meta.abbrev}
                    </span>
                    <span className="text-sm font-semibold text-ink">{meta.name}</span>
                  </div>

                  {/* Status Toggle */}
                  <div className="flex items-center rounded-xl bg-surface p-0.5 ring-1 ring-line/60">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(dayKey, "open")}
                      className={cn(
                        "rounded-lg px-2 py-1 text-xs font-semibold transition active:scale-95",
                        daySched.status === "open" ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink",
                      )}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(dayKey, "closed")}
                      className={cn(
                        "rounded-lg px-2 py-1 text-xs font-semibold transition active:scale-95",
                        daySched.status === "closed" ? "bg-rose-500 text-white shadow-xs" : "text-mute hover:text-ink",
                      )}
                    >
                      Closed
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(dayKey, "24hours")}
                      className={cn(
                        "rounded-lg px-2 py-1 text-xs font-semibold transition active:scale-95",
                        daySched.status === "24hours" ? "bg-teal-600 text-white shadow-xs" : "text-mute hover:text-ink",
                      )}
                    >
                      24h
                    </button>
                  </div>
                </div>

                {/* Time Controls (when Open) */}
                {daySched.status === "open" && (
                  <div className="flex flex-wrap items-center gap-1.5 sm:justify-end flex-1">
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        value={daySched.openTime}
                        onChange={(e) => handleTimeChange(dayKey, "openTime", e.target.value)}
                        className="min-h-[44px] rounded-xl border border-line bg-paper px-2 text-[16px] sm:text-xs font-semibold text-ink focus:border-brand focus:outline-none"
                      />
                      <span className="text-xs text-mute">to</span>
                      {!daySched.isLate ? (
                        <input
                          type="time"
                          value={daySched.closeTime}
                          onChange={(e) => handleTimeChange(dayKey, "closeTime", e.target.value)}
                          className="min-h-[44px] rounded-xl border border-line bg-paper px-2 text-[16px] sm:text-xs font-semibold text-ink focus:border-brand focus:outline-none"
                        />
                      ) : (
                        <span className="inline-flex h-8 items-center rounded-xl bg-purple-500/10 px-2.5 text-xs font-bold text-purple-600">
                          Late
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLateToggle(dayKey)}
                      className={cn(
                        "h-8 rounded-xl px-2 text-xs font-semibold transition active:scale-95 border",
                        daySched.isLate
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-surface hover:bg-surface-hover text-mute border-line/60",
                      )}
                    >
                      Late
                    </button>

                    {/* Copy to other days actions */}
                    <div className="flex items-center gap-1 ml-auto sm:ml-1">
                      <button
                        type="button"
                        onClick={() => copyDayToWeekdays(dayKey)}
                        title={`Copy ${meta.name} hours to Mon–Fri`}
                        className="h-8 rounded-xl bg-surface hover:bg-surface-hover px-2 text-[11px] font-medium text-mute hover:text-ink border border-line/60 flex items-center gap-1 transition"
                      >
                        <Copy size={11} />
                        <span className="hidden sm:inline">Weekdays</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => copyDayToAll(dayKey)}
                        title={`Copy ${meta.name} hours to all 7 days`}
                        className="h-8 rounded-xl bg-surface hover:bg-surface-hover px-2 text-[11px] font-medium text-mute hover:text-ink border border-line/60 flex items-center gap-1 transition"
                      >
                        {isCopied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                        <span>All</span>
                      </button>
                    </div>
                  </div>
                )}

                {daySched.status === "closed" && (
                  <div className="flex items-center justify-between sm:justify-end flex-1">
                    <span className="text-xs font-medium text-rose-500/80">Closed all day</span>
                    <button
                      type="button"
                      onClick={() => copyDayToAll(dayKey)}
                      title="Set all 7 days to Closed"
                      className="h-8 rounded-xl bg-surface hover:bg-surface-hover px-2 text-[11px] font-medium text-mute hover:text-ink border border-line/60 flex items-center gap-1 transition ml-2"
                    >
                      {isCopied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                      <span>All</span>
                    </button>
                  </div>
                )}

                {daySched.status === "24hours" && (
                  <div className="flex items-center justify-between sm:justify-end flex-1">
                    <span className="text-xs font-semibold text-teal-600">Open 24 Hours</span>
                    <button
                      type="button"
                      onClick={() => copyDayToAll(dayKey)}
                      title="Set all 7 days to 24 Hours"
                      className="h-8 rounded-xl bg-surface hover:bg-surface-hover px-2 text-[11px] font-medium text-mute hover:text-ink border border-line/60 flex items-center gap-1 transition ml-2"
                    >
                      {isCopied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                      <span>All</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Preview & Action */}
      <div className="p-4 sm:p-5 border-t border-line/60 bg-paper/80 backdrop-blur-md space-y-3">
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-mute mb-1">
            <span>Summary Preview</span>
            <span className="text-accent font-medium">Ready for search & guests</span>
          </div>
          <div className="rounded-xl border border-brand/20 bg-brand/[0.04] p-2.5 text-xs font-semibold text-ink leading-relaxed">
            {formattedResult || "Closed"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" type="button" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} className="flex-1">
            Apply Hours
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
