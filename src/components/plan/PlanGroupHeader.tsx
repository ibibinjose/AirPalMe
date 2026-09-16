import { useMemo, useState } from "react";
import { CheckCircle2, Crown, HelpCircle, MessageCircle, Sparkles, UserPlus, X } from "lucide-react";
import type { HangoutPlan } from "@shared/plan";
import { cn } from "@/lib/cn";

export function PlanGroupHeader({
  plan,
  onInvite,
  onRsvp,
}: {
  plan: HangoutPlan;
  onInvite?: () => void;
  onRsvp?: () => void;
}) {
  const [showMemberModal, setShowMemberModal] = useState(false);

  const going = useMemo(() => plan.attendees.filter((a) => a.status === "going"), [plan.attendees]);
  const maybe = useMemo(() => plan.attendees.filter((a) => a.status === "maybe"), [plan.attendees]);

  // WhatsApp-style names preview: "Alex (Host), Sam, Chloe, Liam..."
  const memberNamesPreview = useMemo(() => {
    const names = plan.attendees.map((a) => {
      const isCreator = a.id === plan.creator.uid || a.name === plan.creator.name;
      return `${a.name}${isCreator ? " (Host)" : ""}`;
    });
    if (names.length === 0) return "Group chat for this plan";
    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
  }, [plan.attendees, plan.creator]);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setShowMemberModal(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setShowMemberModal(true);
        }}
        className={cn(
          "group relative overflow-hidden rounded-3xl bg-card p-4 sm:p-5 ring-1 ring-line shadow-xs transition",
          "hover:ring-brand/40 hover:bg-paper/80 active:scale-[0.99] cursor-pointer",
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          {/* Left: WhatsApp style group icon & names */}
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Avatar Stack / Cluster */}
            <div className="relative flex -space-x-3 shrink-0">
              {plan.attendees.slice(0, 4).map((att, i) => {
                const isCreator = att.id === plan.creator.uid || att.name === plan.creator.name;
                return (
                  <div
                    key={att.id}
                    className={cn(
                      "relative grid h-11 w-11 place-items-center rounded-full text-xs font-bold ring-2 ring-card shadow-sm select-none",
                      i === 0
                        ? "bg-gradient-to-br from-amber-500 to-amber-700 text-white z-40"
                        : i === 1
                          ? "bg-gradient-to-br from-emerald-500 to-teal-700 text-white z-30"
                          : i === 2
                            ? "bg-gradient-to-br from-indigo-500 to-purple-700 text-white z-20"
                            : "bg-zinc-700 text-white z-10",
                    )}
                    title={`${att.name} (${att.status})`}
                  >
                    {att.avatar ? (
                      <img src={att.avatar} alt={att.name} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <span>{att.name.charAt(0).toUpperCase()}</span>
                    )}

                    {/* Host crown */}
                    {isCreator && (
                      <span className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-amber-400 text-amber-950 shadow-xs ring-1 ring-white">
                        <Crown size={9} />
                      </span>
                    )}

                    {/* Status Dot */}
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-card",
                        att.status === "going"
                          ? "bg-emerald-500"
                          : att.status === "maybe"
                            ? "bg-amber-500"
                            : "bg-zinc-400",
                      )}
                    />
                  </div>
                );
              })}
              {plan.attendees.length > 4 && (
                <div className="grid h-11 w-11 place-items-center rounded-full bg-paper text-[11px] font-bold text-ink ring-2 ring-card shadow-sm z-0">
                  +{plan.attendees.length - 4}
                </div>
              )}
            </div>

            {/* Group info & participants */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20">
                  <MessageCircle size={10} />
                  <span>Occasion Group</span>
                </span>
                <span className="text-[11px] text-mute font-mono">
                  {going.length} going{maybe.length > 0 ? ` · ${maybe.length} maybe` : ""}
                </span>
              </div>
              <h3 className="truncate font-display text-base font-bold text-ink mt-0.5 group-hover:text-brand transition">
                {plan.title}
              </h3>
              <p className="truncate text-xs text-mute mt-0.5 leading-tight">{memberNamesPreview}</p>
            </div>
          </div>

          {/* Right: Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
            {onInvite && (
              <button
                type="button"
                onClick={onInvite}
                className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-line/50 transition active:scale-95"
              >
                <UserPlus size={13} className="text-brand" />
                <span>Add Mates</span>
              </button>
            )}
            {onRsvp && (
              <button
                type="button"
                onClick={onRsvp}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 transition active:scale-95"
              >
                <Sparkles size={13} />
                <span>RSVP</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp-Style Group Info Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-card p-6 ring-1 ring-line shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">Group Participants</span>
                <h3 className="font-display text-xl font-bold text-ink">{plan.title}</h3>
                <p className="text-xs text-mute mt-0.5">{plan.attendees.length} members in this occasion group</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMemberModal(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-mute hover:bg-paper hover:text-ink transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Member list */}
            <div className="space-y-2 pt-2">
              {plan.attendees.map((att) => {
                const isCreator = att.id === plan.creator.uid || att.name === plan.creator.name;
                return (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-paper p-3 ring-1 ring-line"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 text-brand text-xs font-bold uppercase">
                        {att.avatar ? (
                          <img src={att.avatar} alt={att.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          <span>{att.name.charAt(0)}</span>
                        )}
                        {isCreator && (
                          <span className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-amber-400 text-amber-950 shadow-xs ring-1 ring-card">
                            <Crown size={8} />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {att.name}
                          {isCreator && (
                            <span className="ml-1.5 rounded-full bg-amber-500/20 px-2 py-0.2 text-[10px] font-medium text-amber-800 dark:text-amber-300">
                              Host
                            </span>
                          )}
                          {att.handle && <span className="text-mute font-normal text-xs"> (@{att.handle})</span>}
                        </p>
                        {att.notes ? (
                          <p className="truncate text-xs text-mute mt-0.5 italic">"{att.notes}"</p>
                        ) : (
                          <p className="text-[11px] text-mute capitalize">{att.status}</p>
                        )}
                      </div>
                    </div>

                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize shrink-0",
                        att.status === "going"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : att.status === "maybe"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : "bg-paper text-mute",
                      )}
                    >
                      {att.status === "going" ? (
                        <CheckCircle2 size={12} />
                      ) : att.status === "maybe" ? (
                        <HelpCircle size={12} />
                      ) : null}
                      <span>{att.status}</span>
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex gap-2">
              {onInvite && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMemberModal(false);
                    onInvite();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-brand h-11 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 transition"
                >
                  <UserPlus size={14} />
                  <span>Invite Another Mate</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
