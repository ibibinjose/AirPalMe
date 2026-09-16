import { Heart, UserCheck, UserPlus } from "lucide-react";
import { useSocial } from "@/contexts/SocialContext";
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
