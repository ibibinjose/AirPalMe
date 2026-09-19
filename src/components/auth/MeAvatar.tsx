import { UserRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useMediaSrc } from "@/hooks/useMediaSrc";
import { cn } from "@/lib/cn";

import { AVAILABILITY_STATUSES, type AvailabilityStatus } from "@shared/bio";

/** Nav buttons are h-9 / lg:h-10 — keep the avatar on that same height. */
export const NAV_AVATAR = "h-10 w-10 text-sm lg:text-base";

export function AvatarFace({
  className,
  statusClass,
  showStatusDot = true,
}: {
  className?: string;
  statusClass?: string;
  /** Corner status pip. Hide on the nav trigger — the ring carries status there. */
  showStatusDot?: boolean;
}) {
  const { user } = useAuth();
  const { mine } = useBio();
  const raw = mine?.avatar || user?.photoURL;
  const src = useMediaSrc(raw) || (raw && !raw.startsWith("idb:") ? raw : undefined);
  const letter = (mine?.name || user?.displayName || user?.email || "M").trim().charAt(0).toUpperCase();

  const statusKey: AvailabilityStatus =
    mine?.availabilityStatus || (mine?.openNow ? "available" : user ? "available" : "offline");
  const statusInfo = AVAILABILITY_STATUSES[statusKey];

  return (
    <span className={cn("relative inline-grid shrink-0 overflow-visible", className || NAV_AVATAR)}>
      <span className="absolute inset-0 grid place-items-center overflow-hidden rounded-full bg-ink font-semibold leading-none text-white ring-1 ring-line">
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : user ? (
          letter
        ) : (
          <UserRound className="h-[48%] w-[48%]" strokeWidth={1.8} />
        )}
      </span>
      {showStatusDot && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute right-0 bottom-0 z-10 translate-x-1/2 translate-y-1/2 rounded-full ring-2 ring-paper shadow-xs",
            statusInfo?.dotColor || (user ? "bg-emerald-500" : "bg-mute"),
            statusClass || "h-2.5 w-2.5",
          )}
        />
      )}
    </span>
  );
}

export function MeAvatar({
  className,
  faceClassName,
  statusClass,
  labeled = false,
}: {
  className?: string;
  faceClassName?: string;
  statusClass?: string;
  labeled?: boolean;
}) {
  const { user } = useAuth();
  const label = user ? "Me" : "Sign in";
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      title={user ? user.displayName || user.email : "Sign in"}
    >
      <AvatarFace className={faceClassName} statusClass={statusClass} />
      {labeled && <span className="text-sm font-medium">{label}</span>}
    </span>
  );
}
