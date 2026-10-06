import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Download, MessageCircle, QrCode, Send, Share2, Users, Sparkles, X } from "lucide-react";
import { type HangoutPlan, formatPlanDate, pastCrew, planInviteUrl, planInviteCodeUrl } from "@shared/plan";
import { makeQrDataUrl } from "@/lib/qr";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { shareNative, triggerHaptic } from "@/lib/native";
import { useScrollLock } from "@/hooks/useScrollLock";
import { publicSiteOrigin, toPublicUrl } from "@/lib/public-origin";
import { useAuth } from "@/contexts/AuthContext";
import { usePlans } from "@/contexts/PlanContext";
import { inviteToPlanRemote, liveBackendEnabled } from "@/lib/functions";
import { listPeople } from "@/lib/people";
import { cn } from "@/lib/cn";

export function PlanShareModal({
  plan,
  open,
  onClose,
  canInvite = true,
}: {
  plan: HangoutPlan;
  open: boolean;
  onClose: () => void;
  /** Managers can ping past crew straight to their inbox. */
  canInvite?: boolean;
}) {
  useScrollLock(open);

  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const { plans } = usePlans();
  const { user } = useAuth();
  const viewerId = user?.uid || (typeof window !== "undefined" ? localStorage.getItem("airpal.anon.id") : null);

  const currentAttendeeIds = useMemo(
    () => new Set((plan.attendees || []).map((a) => a.id)),
    [plan.attendees],
  );

  // People you've already been out with, minus this plan's crew.
  const crew = useMemo(
    () =>
      pastCrew(plans, viewerId, {
        excludeIds: plan.attendees.map((a) => a.id),
        excludePlanId: plan.id,
        limit: 8,
      }),
    [plans, viewerId, plan],
  );

  // Circles / Groups you are part of from past/active hangout plans
  const circleGroups = useMemo(() => {
    const groupsMap = new Map<
      string,
      {
        id: string;
        name: string;
        members: Array<{ id: string; name: string; avatar?: string; handle?: string }>;
      }
    >();

    for (const p of plans || []) {
      if (!p || p.id === plan.id) continue;
      const isMyPlan = p.creator?.uid === viewerId || (p.attendees || []).some((a) => a.id === viewerId);
      if (!isMyPlan) continue;
      const otherMembers = (p.attendees || []).filter(
        (a) => a && a.id && a.id !== viewerId && !a.id.startsWith("anon-") && !currentAttendeeIds.has(a.id),
      );
      if (otherMembers.length === 0) continue;

      const key = otherMembers
        .map((m) => m.id)
        .sort()
        .join(":");
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          id: p.id,
          name: p.title || "Hangout Crew",
          members: otherMembers.map((m) => ({
            id: m.id,
            name: m.name || "Mate",
            avatar: m.avatar,
            handle: m.handle,
          })),
        });
      }
    }
    return Array.from(groupsMap.values());
  }, [plans, plan.id, viewerId, currentAttendeeIds]);

  // Combined Circle Mates (past crew + real-life met contacts)
  const circleMates = useMemo(() => {
    const matesMap = new Map<
      string,
      { id?: string; name: string; handle?: string; avatar?: string; info: string }
    >();

    for (const c of crew) {
      if (!currentAttendeeIds.has(c.id)) {
        matesMap.set(c.id, {
          id: c.id,
          name: c.name,
          handle: c.handle,
          avatar: c.avatar,
          info: `${c.sharedPlans} plan${c.sharedPlans === 1 ? "" : "s"} together`,
        });
      }
    }

    try {
      const metPeople = listPeople();
      for (const p of metPeople) {
        if (!matesMap.has(p.id) && (!p.handle || !Array.from(matesMap.values()).some((m) => m.handle === p.handle))) {
          matesMap.set(p.id, {
            id: p.id,
            name: p.name,
            handle: p.handle,
            avatar: p.photo,
            info: p.whereMet ? `Met at ${p.whereMet}` : "In your Circle",
          });
        }
      }
    } catch {
      /* ignore */
    }

    return Array.from(matesMap.values());
  }, [crew, currentAttendeeIds]);

  const [activeTab, setActiveTab] = useState<"groups" | "mates">(() =>
    circleGroups.length > 0 ? "groups" : "mates",
  );

  useEffect(() => {
    if (open) setInvited(new Set());
  }, [open, plan.id]);

  async function inviteCrew(id: string) {
    if (!liveBackendEnabled()) {
      toast.message("Connect Firebase to send invites.");
      return;
    }
    try {
      await inviteToPlanRemote({ planId: plan.id, uid: id });
      setInvited((prev) => new Set(prev).add(id));
      toast.success("Invite sent!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not invite");
    }
  }

  async function inviteGroup(group: { name: string; members: Array<{ id: string }> }) {
    if (!liveBackendEnabled()) {
      toast.message("Connect Firebase to send invites.");
      return;
    }
    const eligible = group.members.filter((m) => !invited.has(m.id));
    if (eligible.length === 0) return;
    try {
      for (const m of eligible) {
        await inviteToPlanRemote({ planId: plan.id, uid: m.id });
        setInvited((prev) => new Set(prev).add(m.id));
      }
      void triggerHaptic("success");
      toast.success(`Invited ${group.name} (${eligible.length} mates)!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not invite all group members");
    }
  }

  const origin = publicSiteOrigin();
  const inviteUrl = toPublicUrl(
    plan.inviteCode ? planInviteCodeUrl(plan.inviteCode, origin) : planInviteUrl(plan.id, origin),
  );

  const shareText = `Hey mates! Join our plan: "${plan.title}" on ${formatPlanDate(plan.date, plan.time)}. Check out the stops and RSVP here: ${inviteUrl}`;

  useEffect(() => {
    if (!open) return;
    void makeQrDataUrl(inviteUrl, 320).then(setQrUrl);
  }, [open, inviteUrl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Invite link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const onNativeShare = async () => {
    void triggerHaptic("light");
    const shared = await shareNative({
      title: plan.title,
      text: `You're invited to "${plan.title}"! RSVP and see the itinerary here:`,
      url: inviteUrl,
    });
    if (!shared) {
      await onCopy();
    }
  };

  const onWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const onSms = () => {
    const url = `sms:?&body=${encodeURIComponent(shareText)}`;
    window.location.href = url;
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 [padding-bottom:var(--keyboard-height,0px)] transition-[padding] duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="scroll-container modal-safe relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-zinc-950 text-white p-6 ring-1 ring-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-400">Share Invitation</span>
            <h2 className="font-display mt-0.5 text-xl font-bold text-white">Invite Your Mates</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="grid h-10 w-10 min-h-[44px] min-w-[44px] place-items-center rounded-full text-zinc-400 hover:bg-zinc-900 hover:text-white transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X size={18} />
          </button>
        </div>

        {/* Link Copy Box with Event Preview */}
        <div className="mt-5">
          <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Shareable Event Link</label>
          <div className="flex items-center gap-2 rounded-2xl bg-zinc-900 p-1.5 ring-1 ring-white/10">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="min-w-0 flex-1 bg-transparent px-2.5 text-[16px] sm:text-xs text-white outline-none select-all"
            />
            <Button
              size="sm"
              onClick={onCopy}
              aria-label={copied ? "Copied" : "Copy Link"}
              className={cn(
                "shrink-0 gap-1.5 rounded-xl font-semibold cursor-pointer transition active:scale-95",
                copied
                  ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"
                  : "bg-white text-zinc-950 hover:bg-zinc-200 shadow-xs",
              )}
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy Link</span>
                </>
              )}
            </Button>
          </div>

          {/* Event Card Preview showing image & graph metadata */}
          {plan.heroImage && (
            <div className="mt-2.5 flex items-center gap-3 rounded-2xl bg-zinc-900/90 p-2.5 ring-1 ring-white/10">
              <img
                src={plan.heroImage}
                alt={plan.title}
                className="h-14 w-20 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
              />
              <div className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-white">{plan.title}</span>
                <span className="block truncate text-[11px] text-zinc-400">
                  {formatPlanDate(plan.date, plan.time)} · {plan.destination || plan.city || "Sydney"}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 mt-0.5">
                  <Check size={10} /> Link preview image attached
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Send Options */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onWhatsApp}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-emerald-500/15 p-3 text-emerald-300 ring-1 ring-emerald-500/25 hover:bg-emerald-500/25 transition active:scale-95 cursor-pointer"
          >
            <MessageCircle size={20} />
            <span className="text-[11px] font-medium">WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={onSms}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-indigo-500/15 p-3 text-indigo-300 ring-1 ring-indigo-500/25 hover:bg-indigo-500/25 transition active:scale-95 cursor-pointer"
          >
            <Share2 size={20} />
            <span className="text-[11px] font-medium">SMS / Text</span>
          </button>

          <button
            type="button"
            onClick={onNativeShare}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-zinc-900 p-3 text-zinc-200 ring-1 ring-white/10 hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
          >
            <Share2 size={20} />
            <span className="text-[11px] font-medium">More…</span>
          </button>
        </div>

        {/* Circles & Groups / Circle Mates Section */}
        {canInvite && (circleGroups.length > 0 || circleMates.length > 0) && (
          <div className="mt-6 border-t border-white/10 pt-5">
            {/* Tab Selector */}
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex rounded-xl bg-zinc-900 p-1 ring-1 ring-white/10">
                <button
                  type="button"
                  onClick={() => {
                    void triggerHaptic("light");
                    setActiveTab("groups");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer",
                    activeTab === "groups"
                      ? "bg-zinc-800 text-white shadow-2xs ring-1 ring-white/15"
                      : "text-zinc-400 hover:text-white",
                  )}
                >
                  <Users size={13} />
                  <span>Groups ({circleGroups.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void triggerHaptic("light");
                    setActiveTab("mates");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer",
                    activeTab === "mates"
                      ? "bg-zinc-800 text-white shadow-2xs ring-1 ring-white/15"
                      : "text-zinc-400 hover:text-white",
                  )}
                >
                  <Sparkles size={13} />
                  <span>Mates ({circleMates.length})</span>
                </button>
              </div>
            </div>

            {/* Groups Tab Content */}
            {activeTab === "groups" && (
              <div className="space-y-2">
                {circleGroups.length > 0 ? (
                  <ul className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
                    {circleGroups.map((g) => {
                      const allInvited = g.members.every((m) => invited.has(m.id));
                      return (
                        <li
                          key={g.id}
                          className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-900/90 p-2.5 pl-3 ring-1 ring-white/10"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            {/* Avatar Cluster */}
                            <div className="flex -space-x-2 shrink-0">
                              {g.members.slice(0, 3).map((m, idx) => (
                                <span
                                  key={m.id || idx}
                                  className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-zinc-800 ring-2 ring-zinc-950 text-[11px] font-bold text-white uppercase"
                                >
                                  {m.avatar ? (
                                    <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
                                  ) : (
                                    m.name.charAt(0)
                                  )}
                                </span>
                              ))}
                              {g.members.length > 3 && (
                                <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-500/25 text-[10px] font-bold text-indigo-300 ring-2 ring-zinc-950">
                                  +{g.members.length - 3}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="block truncate text-xs font-semibold text-white">{g.name}</span>
                              <span className="block truncate text-[11px] text-zinc-400">
                                {g.members.length} mates ·{" "}
                                {g.members
                                  .map((m) => m.name.split(" ")[0])
                                  .slice(0, 3)
                                  .join(", ")}
                                {g.members.length > 3 ? "…" : ""}
                              </span>
                            </div>
                          </div>
                          {allInvited ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1.5 text-[11px] font-semibold text-emerald-300">
                              <Check size={13} />
                              <span>Sent</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void inviteGroup(g)}
                              aria-label={`Invite ${g.name}`}
                              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-brand px-3 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 transition active:scale-95 cursor-pointer"
                            >
                              <Users size={13} />
                              <span>Invite Group</span>
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="rounded-2xl bg-zinc-900/60 p-4 text-center border border-white/10">
                    <Users size={24} className="mx-auto text-zinc-500 mb-1.5" />
                    <p className="text-xs font-medium text-white">No hangout groups yet</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Share the invite link with your crew — everyone who joins automatically forms a Circle group!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Individual Mates Tab Content */}
            {activeTab === "mates" && (
              <div className="space-y-2">
                {circleMates.length > 0 ? (
                  <ul className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
                    {circleMates.map((c) => (
                      <li
                        key={c.id || c.name}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-900/90 p-2.5 pl-3 ring-1 ring-white/10"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-zinc-800 text-xs font-bold text-white ring-1 ring-white/10 uppercase">
                            {c.avatar ? (
                              <img src={c.avatar} alt={c.name} className="h-full w-full object-cover" />
                            ) : (
                              c.name.charAt(0)
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-white">
                              {c.name}
                              {c.handle && <span className="text-zinc-400 font-normal"> (@{c.handle})</span>}
                            </span>
                            <span className="block truncate text-[11px] text-zinc-400">{c.info}</span>
                          </span>
                        </span>
                        {c.id && invited.has(c.id) ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1.5 text-[11px] font-semibold text-emerald-300">
                            <Check size={13} />
                            <span>Sent</span>
                          </span>
                        ) : c.id ? (
                          <button
                            type="button"
                            onClick={() => void inviteCrew(c.id!)}
                            aria-label={`Invite ${c.name}`}
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-brand px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 transition active:scale-95 cursor-pointer"
                          >
                            <Send size={13} />
                            <span>Invite</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={onNativeShare}
                            aria-label={`Share with ${c.name}`}
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-zinc-800 px-3 text-xs font-semibold text-white ring-1 ring-white/10 hover:bg-zinc-700 transition active:scale-95 cursor-pointer"
                          >
                            <Share2 size={13} />
                            <span>Share</span>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-2xl bg-zinc-900/60 p-4 text-center border border-white/10">
                    <p className="text-xs text-zinc-400">
                      No direct mates in your Circle yet. Share via WhatsApp or SMS to invite them!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* QR Code Presentation */}
        <div className="mt-6 rounded-3xl bg-zinc-900/90 p-5 ring-1 ring-white/10 text-center">
          <p className="text-xs font-semibold text-white">Scan at the table with phone camera</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Zero app install required · Opens instant RSVP in mobile browser
          </p>

          <div className="mx-auto mt-4 grid h-48 w-48 place-items-center rounded-2xl bg-white p-3 shadow-md">
            {qrUrl ? (
              <img src={qrUrl} alt="Invite QR" className="h-full w-full object-contain" />
            ) : (
              <QrCode size={48} className="animate-pulse text-zinc-400" />
            )}
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-mono font-semibold text-amber-400 ring-1 ring-white/10">
              Code: {plan.inviteCode}
            </span>
            {qrUrl && (
              <a
                href={qrUrl}
                download={`${plan.id}-qr.png`}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300 hover:text-white ring-1 ring-white/10 cursor-pointer transition active:scale-95"
              >
                <Download size={12} />
                <span>Save QR</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
