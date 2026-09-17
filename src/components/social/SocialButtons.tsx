import { useState } from "react";
import { Check, Hand, Heart, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useSocial } from "@/contexts/SocialContext";
import { useAuth } from "@/contexts/AuthContext";
import { sendWaveRemote } from "@/lib/functions";
import { markWaved, waveOnCooldown } from "@/lib/waves";
import { cn } from "@/lib/cn";

/**
 * Like / Follow buttons for businesses and bios. Signed-in users toggle
 * immediately (Liked / Following states persist + sync); guests get the
 * sign-in prompt and the tap resumes after login. Fixed min-widths keep the
 * row from jerking when the label flips.
 */
export function LikeButton({
  handle,
  name,
  className,
}: {
  handle: string;
  name?: string;
  className?: string;
}) {
  const { isLiked, toggleLike } = useSocial();
  const liked = isLiked(handle);
  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? `Liked ${name || handle}` : `Like ${name || handle}`}
      title={liked ? "Liked" : "Like"}
      onClick={() => toggleLike(handle, name)}
      className={cn(
        "inline-flex h-10 min-w-[104px] items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold transition active:scale-95",
        liked
          ? "bg-rose-500 text-white shadow-sm ring-1 ring-rose-600"
          : "bg-card text-ink ring-1 ring-line hover:bg-rose-50",
        className,
      )}
    >
      <Heart size={15} className={liked ? "fill-white" : ""} strokeWidth={liked ? 2.5 : 2} />
      <span>{liked ? "Liked" : "Like"}</span>
    </button>
  );
}

export function FollowButton({
  handle,
  name,
  className,
}: {
  handle: string;
  name?: string;
  className?: string;
}) {
  const { isFollowing, toggleFollow } = useSocial();
  const following = isFollowing(handle);
  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={following ? `Following ${name || handle}` : `Follow ${name || handle}`}
      title={following ? "Following" : "Follow"}
      onClick={() => toggleFollow(handle, name)}
      className={cn(
        "inline-flex h-10 min-w-[120px] flex-1 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold transition active:scale-95",
        following
          ? "bg-ink text-white shadow-sm"
          : "bg-brand text-white shadow-sm hover:brightness-110",
        className,
      )}
    >
      {following ? <UserCheck size={15} /> : <UserPlus size={15} />}
      <span>{following ? "Following" : "Follow"}</span>
    </button>
  );
}

/**
 * Named nearby signal. Sends one wave per person per day; the recipient sees
 * your name, gets an inbox row plus push, and can only wave back. Guests are
 * asked to sign in first.
 */
export function WaveButton({
  handle,
  name,
  className,
  variant = "pill",
}: {
  handle: string;
  name?: string;
  className?: string;
  variant?: "pill" | "icon";
}) {
  const { requireUser } = useAuth();
  const [waved, setWaved] = useState(() => waveOnCooldown(handle));
  const [sending, setSending] = useState(false);
  const label = name?.trim() || `@${handle}`;

  async function onWave() {
    if (sending) return;
    if (waved || waveOnCooldown(handle)) {
      setWaved(true);
      return;
    }
    if (!requireUser("Sign in to wave — they'll see your name and can wave back.")) return;
    setSending(true);
    try {
      const res = await sendWaveRemote({ toHandle: handle });
      markWaved(handle, res.wavedAt);
      setWaved(true);
      toast.success(res.waveBack ? `${label} waved back` : `Waved at ${label} — they'll get a ping.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't send that wave.";
      if (/already waved/i.test(msg)) {
        markWaved(handle);
        setWaved(true);
      }
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onWave}
        disabled={sending || waved}
        aria-label={waved ? `Waved at ${label}` : `Wave at ${label}`}
        title={waved ? "Waved — once a day per person" : `Wave at ${label}`}
        className={cn(
          "grid h-9 w-9 place-items-center rounded-full ring-1 transition active:scale-95 disabled:cursor-default",
          waved
            ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30"
            : "bg-card text-ink ring-line hover:bg-gold hover:text-ink hover:ring-gold",
          sending && "opacity-60",
          className,
        )}
      >
        {waved ? <Check size={15} /> : <Hand size={15} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onWave}
      disabled={sending || waved}
      aria-pressed={waved}
      aria-label={waved ? `Waved at ${label}` : `Wave at ${label}`}
      title={waved ? "Waved — once a day per person" : `Wave at ${label}`}
      className={cn(
        "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-semibold shadow-sm ring-1 transition active:scale-95 disabled:cursor-default",
        waved
          ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30"
          : "bg-gold text-ink ring-gold hover:brightness-105",
        sending && "opacity-60",
        className,
      )}
    >
      {waved ? <Check size={15} /> : <Hand size={15} />}
      <span>{sending ? "Waving…" : waved ? "Waved" : "Wave"}</span>
    </button>
  );
}
