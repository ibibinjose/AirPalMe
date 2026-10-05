import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, MessageCircle, QrCode, Send, Share2, X } from "lucide-react";
import { type HangoutPlan, formatPlanDate, pastCrew, planInviteUrl } from "@shared/plan";
import { makeQrDataUrl } from "@/lib/qr";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { shareNative, triggerHaptic } from "@/lib/native";
import { useScrollLock } from "@/hooks/useScrollLock";
import { publicSiteOrigin, toPublicUrl } from "@/lib/public-origin";
import { useAuth } from "@/contexts/AuthContext";
import { usePlans } from "@/contexts/PlanContext";
import { inviteToPlanRemote, liveBackendEnabled } from "@/lib/functions";

export function PlanShareModal({
  plan,
  open,
  onClose,
  canInvite,
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

  // People you've already been out with, minus this plan's crew.
  const crew = useMemo(
    () =>
      pastCrew(plans, viewerId, {
        excludeIds: plan.attendees.map((a) => a.id),
        excludePlanId: plan.id,
        limit: 6,
      }),
    [plans, viewerId, plan],
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

  const origin = publicSiteOrigin();
  const inviteUrl = toPublicUrl(planInviteUrl(plan.id, origin));

  const shareText = `Hey mates! Join our plan: "${plan.title}" on ${formatPlanDate(plan.date, plan.time)}. Check out the stops and RSVP here: ${inviteUrl}`;

  useEffect(() => {
    if (!open) return;
    void makeQrDataUrl(inviteUrl, 320).then(setQrUrl);
  }, [open, inviteUrl]);

  if (!open) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="scroll-container modal-safe relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-card p-6 ring-1 ring-line shadow-2xl max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-line/60">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">Share Invitation</span>
            <h2 className="font-display mt-0.5 text-xl font-bold text-ink">Invite Your Mates</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="grid h-10 w-10 min-h-[44px] min-w-[44px] place-items-center rounded-full text-mute hover:bg-paper hover:text-ink transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X size={18} />
          </button>
        </div>

        {/* Link Copy Box */}
        <div className="mt-5">
          <label className="text-xs font-semibold text-ink/80 block mb-1.5">Shareable Event Link</label>
          <div className="flex items-center gap-2 rounded-2xl bg-paper p-1.5 ring-1 ring-line">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="min-w-0 flex-1 bg-transparent px-2.5 text-[16px] sm:text-xs text-ink outline-none select-all"
            />
            <Button
              size="sm"
              onClick={onCopy}
              aria-label={copied ? "Copied" : "Copy Link"}
              className="shrink-0 gap-1.5 rounded-xl"
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
        </div>

        {/* Quick Send Options */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onWhatsApp}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20 transition active:scale-95"
          >
            <MessageCircle size={20} />
            <span className="text-[11px] font-medium">WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={onSms}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-brand/10 p-3 text-brand ring-1 ring-brand/20 hover:bg-brand/20 transition active:scale-95"
          >
            <Share2 size={20} />
            <span className="text-[11px] font-medium">SMS / Text</span>
          </button>

          <button
            type="button"
            onClick={onNativeShare}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-paper p-3 text-ink ring-1 ring-line hover:bg-line/60 transition active:scale-95"
          >
            <Share2 size={20} />
            <span className="text-[11px] font-medium">More…</span>
          </button>
        </div>

        {/* Been out with — one-tap re-invite to their inbox */}
        {canInvite && crew.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold text-ink/80 mb-1.5">Been out with — tap to re-invite</p>
            <ul className="space-y-2">
              {crew.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-paper p-2.5 pl-3 ring-1 ring-line"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-card text-xs font-bold text-ink ring-1 ring-line uppercase">
                      {c.avatar ? (
                        <img src={c.avatar} alt={c.name} className="h-full w-full object-cover" />
                      ) : (
                        c.name.charAt(0)
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-ink">
                        {c.name}
                        {c.handle && <span className="text-mute font-normal"> (@{c.handle})</span>}
                      </span>
                      <span className="block truncate text-[11px] text-mute">
                        {c.sharedPlans} plan{c.sharedPlans === 1 ? "" : "s"} together
                      </span>
                    </span>
                  </span>
                  {invited.has(c.id) ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      <Check size={13} />
                      <span>Sent</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void inviteCrew(c.id)}
                      aria-label={`Invite ${c.name}`}
                      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 transition active:scale-95"
                    >
                      <Send size={13} />
                      <span>Invite</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* QR Code Presentation */}
        <div className="mt-6 rounded-3xl bg-paper p-5 ring-1 ring-line text-center">
          <p className="text-xs font-semibold text-ink">Scan at the table with phone camera</p>
          <p className="text-[11px] text-mute mt-0.5">
            Zero app install required · Opens instant RSVP in mobile browser
          </p>

          <div className="mx-auto mt-4 grid h-48 w-48 place-items-center rounded-2xl bg-white p-3 shadow-sm ring-1 ring-line">
            {qrUrl ? (
              <img src={qrUrl} alt="Invite QR" className="h-full w-full object-contain" />
            ) : (
              <QrCode size={48} className="animate-pulse text-mute" />
            )}
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="rounded-full bg-card px-3 py-1 text-xs font-mono font-semibold text-gold ring-1 ring-line">
              Code: {plan.inviteCode}
            </span>
            {qrUrl && (
              <a
                href={qrUrl}
                download={`${plan.id}-qr.png`}
                className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-xs font-medium text-mute hover:text-ink ring-1 ring-line"
              >
                <Download size={12} />
                <span>Save QR</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
