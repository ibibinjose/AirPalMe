import { Link } from "wouter";
import { ArrowLeft, Star } from "lucide-react";
import { InvitePanel } from "@/components/invite/InvitePanel";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { Button } from "@/components/ui/Button";

/**
 * AirPal Stars — earn, never buy. Your handle is your invite code; Stars vest
 * when someone you invited completes their first real experience and unlock
 * status tiers, not money.
 */
export function RewardsPage() {
  const { user } = useAuth();
  const { mine, biosReady } = useBio();

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-4 md:px-6 md:pt-6">
      <Link href="/me" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-mute">
        <ArrowLeft size={15} /> Me
      </Link>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
        <Star size={12} aria-hidden /> AirPal Stars
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold text-ink">Rewards</h1>
      <p className="mt-1 text-sm text-mute">
        Invite mates, they show up — you both earn Stars that unlock status tiers.
      </p>

      <div className="mt-4 rounded-3xl border border-line bg-card p-5">
        {!user ? (
          <div className="py-2 text-center">
            <p className="text-sm font-semibold text-ink">Sign in to earn Stars</p>
            <p className="mt-1 text-xs text-mute">Your invites and tiers stay on your account.</p>
            <Link href={`/start?next=${encodeURIComponent("/me/rewards")}`}>
              <Button className="mt-4">Sign in / Create account</Button>
            </Link>
          </div>
        ) : (
          <InvitePanel handle={mine?.handle} loading={!biosReady} />
        )}
      </div>
    </div>
  );
}
