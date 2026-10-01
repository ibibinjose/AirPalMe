import { useState } from "react";
import { CalendarDays, Check, Lock, Plus, RotateCcw } from "lucide-react";
import type { HangoutPlan } from "@shared/plan";
import { formatDateOption, hasOpenDatePoll, topDateOption } from "@shared/plan";
import { localTodayStr } from "@/lib/plan-invite";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

/** "When works?" — vote, then the host locks one in and RSVPs follow. */
export function PlanDatePoll({
  plan,
  isHost,
  viewerUid,
  onVote,
  onPropose,
  onLock,
  onReopen,
}: {
  plan: HangoutPlan;
  isHost: boolean;
  viewerUid?: string | null;
  onVote: (optionId: string) => void;
  onPropose: (input: { date: string; time?: string }) => void;
  onLock: (optionId: string) => void;
  onReopen: () => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const options = plan.dateOptions || [];
  const locked = Boolean(plan.datePollLocked);
  const leader = topDateOption(plan);

  if (!options.length && !isHost) return null;

  if (locked) {
    return (
      <div className="mt-6 flex flex-col gap-3 rounded-3xl bg-card p-4 sm:p-5 ring-1 ring-line shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30">
            <Lock size={18} />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">Date locked in</p>
            <p className="text-sm font-bold text-ink">{formatDateOption({ date: plan.date, time: plan.time })}</p>
          </div>
        </div>
        {isHost && (
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              onReopen();
            }}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold text-mute ring-1 ring-line hover:bg-paper hover:text-ink transition active:scale-95"
          >
            <RotateCcw size={14} />
            <span>Reopen poll</span>
          </button>
        )}
      </div>
    );
  }

  const open = hasOpenDatePoll(plan);

  return (
    <div className="mt-6 rounded-3xl bg-card p-4 sm:p-5 ring-1 ring-line shadow-xs">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20">
          <CalendarDays size={18} />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">When works?</p>
          <h2 className="font-display text-base font-bold text-ink">Vote a date — host locks it in</h2>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-2">
          {options.map((opt) => {
            const voted = Boolean(viewerUid && (opt.voterUids || []).includes(viewerUid));
            return (
              <div
                key={opt.id}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-2xl p-2 ring-1 transition",
                  voted ? "bg-brand/5 ring-brand/30" : "bg-paper ring-line",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    void triggerHaptic("light");
                    onVote(opt.id);
                  }}
                  aria-pressed={voted}
                  aria-label={`Vote ${formatDateOption(opt)}`}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-2 text-left transition active:scale-[0.99]"
                >
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-full ring-1 transition",
                      voted ? "bg-brand text-white ring-brand" : "bg-card text-mute ring-line",
                    )}
                  >
                    <Check size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{formatDateOption(opt)}</span>
                    <span className="block text-[11px] text-mute">
                      {opt.votes} vote{opt.votes === 1 ? "" : "s"}
                      {leader?.id === opt.id && opt.votes > 0 ? " · leading" : ""}
                    </span>
                  </span>
                </button>
                {isHost && (
                  <button
                    type="button"
                    onClick={() => onLock(opt.id)}
                    aria-label={`Lock in ${formatDateOption(opt)}`}
                    className="inline-flex h-11 shrink-0 items-center gap-1 rounded-full bg-brand px-4 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 transition active:scale-95"
                  >
                    <Lock size={13} />
                    <span>Lock in</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isHost && (
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (!date) return;
            onPropose({ date, time: time || undefined });
            setDate("");
            setTime("");
          }}
        >
          <input
            type="date"
            required
            value={date}
            min={localTodayStr()}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Proposed date"
            className="h-11 flex-1 rounded-2xl bg-paper px-4 text-sm text-ink border border-line outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label="Proposed time (optional)"
            className="h-11 flex-1 rounded-2xl bg-paper px-4 text-sm text-ink border border-line outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          />
          <button
            type="submit"
            disabled={!date}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-card px-4 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition active:scale-95 disabled:opacity-40"
          >
            <Plus size={14} />
            <span>Add date</span>
          </button>
        </form>
      )}
    </div>
  );
}
