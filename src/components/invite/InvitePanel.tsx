import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Check, Copy, Send, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { fetchInviteOverview, fetchStarBalance, inviteLinkFor, type InviteOverview } from "@/lib/app-invites";
import { REFERRAL_INVITEE_STARS, REFERRAL_INVITER_STARS, STAR_TIERS, nextTier, tierForBalance } from "@shared/stars";
import { shareContent } from "@/lib/share";
import { cn } from "@/lib/cn";

/** Send invites to join AirPal, earn Stars when mates complete experiences, and climb tiers. */
export function InvitePanel({ handle, loading }: { handle?: string; loading?: boolean }) {
  const [, nav] = useLocation();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [overview, setOverview] = useState<InviteOverview | null>(null);
  const [balance, setBalance] = useState(0);

  const link = handle ? inviteLinkFor(handle) : "";
  const tier = tierForBalance(balance);
  const upcoming = nextTier(balance);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void fetchInviteOverview(user.uid).then((o) => {
      if (alive) setOverview(o);
    });
    void fetchStarBalance(user.uid).then((b) => {
      if (alive) setBalance(b);
    });
    return () => {
      alive = false;
    };
  }, [user]);

  if (!handle) {
    return (
      <div className="rounded-[28px] ring-1 ring-line bg-card p-5 text-center">
        <p className="font-display text-lg font-semibold">Invite friends to AirPal</p>
        <p className="mt-1 text-sm text-mute">
          {loading ? "Loading your @handle…" : "Claim your @handle first — it becomes your invite code."}
        </p>
        {!loading && (
          <Button className="mt-4" onClick={() => nav("/bio/setup")}>
            Claim @handle
          </Button>
        )}
      </div>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Invite link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed — long-press the link to copy it manually.");
    }
  }

  function share() {
    void shareContent({
      title: "Join me on AirPal",
      text: `Join me on AirPal — people, places and plans made easy. Use my code @${handle}.`,
      url: link,
    });
  }

  return (
    <div className="rounded-[28px] ring-1 ring-line bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Your Stars</p>
          <p className="font-display mt-1 text-2xl font-semibold">
            ★ {balance} <span className="text-base font-medium text-mute">· {tier.name}</span>
          </p>
        </div>
        {upcoming && (
          <p className="shrink-0 text-right text-[11px] leading-4 text-mute">
            {upcoming.stars - balance} to go
            <br />
            <span className="font-semibold text-ink">{upcoming.name}</span>
          </p>
        )}
      </div>

      <ol className="mt-4 space-y-2 border-t border-line pt-3 text-[13px]">
        <li className="flex gap-2.5">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/10 text-[11px] font-bold text-accent">1</span>
          <span><strong>Share</strong> your link — your @handle is the code.</span>
        </li>
        <li className="flex gap-2.5">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/10 text-[11px] font-bold text-accent">2</span>
          <span><strong>Mate completes</strong> their first real experience.</span>
        </li>
        <li className="flex gap-2.5">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/10 text-[11px] font-bold text-accent">3</span>
          <span><strong>You both earn</strong> — {REFERRAL_INVITER_STARS} Stars for you, {REFERRAL_INVITEE_STARS} for them. Signups alone earn nothing.</span>
        </li>
      </ol>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Your invite code</p>
      <p className="font-display mt-1 text-2xl font-semibold">@{handle}</p>

      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-paper px-3 py-2 ring-1 ring-line">
        <p className="min-w-0 flex-1 truncate font-mono text-xs">{link}</p>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label="Copy invite link"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-white transition active:scale-95"
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
      <Button variant="ghost" className="mt-2 w-full border border-line" onClick={share}>
        <Send size={14} /> Send invite
      </Button>

      {overview?.invitedBy && (
        <p className="mt-4 border-t border-line pt-3 text-sm text-mute">
          Invited by <span className="font-semibold text-accent">@{overview.invitedBy.inviterHandle}</span>
          {overview.invitedBy.rewardedAt ? (
            <span> — you earned {REFERRAL_INVITEE_STARS} Stars!</span>
          ) : (
            <span> — complete your first experience to earn {REFERRAL_INVITEE_STARS} Stars.</span>
          )}
        </p>
      )}

      <div className="mt-3 border-t border-line pt-3">
        <p className="text-sm font-semibold">
          {overview ? `${overview.joined.length} joined with your code` : "Who joined"}
        </p>
        {overview && overview.joined.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {overview.joined.slice(0, 10).map((r) => (
              <li key={r.inviteeUid} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{r.inviteeLabel}</span>
                <span className="shrink-0 text-xs text-mute">
                  {new Date(r.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[13px] text-mute">Nobody yet — share your link and they’ll show up here.</p>
        )}
      </div>

      <div className="mt-3 border-t border-line pt-3">
        <p className="text-sm font-semibold">Star tiers</p>
        <ul className="mt-2 space-y-1.5">
          {STAR_TIERS.map((t) => {
            const unlocked = balance >= t.stars;
            return (
              <li key={t.name} className="flex items-center gap-2.5 text-sm">
                <Star
                  size={15}
                  className={cn("shrink-0", unlocked ? "fill-gold text-accent" : "fill-line text-line")}
                />
                <span className={cn("min-w-0 flex-1 truncate", unlocked ? "font-semibold" : "text-mute")}>
                  {t.name}
                  <span className="font-normal text-mute"> — {t.blurb}</span>
                </span>
                <span className="shrink-0 text-xs text-mute">{t.stars}★</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
