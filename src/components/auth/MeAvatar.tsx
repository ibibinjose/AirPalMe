import { useState } from "react";
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
  customSrc,
  showRing = false,
}: {
  className?: string;
  customSrc?: string;
  showRing?: boolean;
}) {
  const { user } = useAuth();
  const { mine } = useBio();
  const [imgError, setImgError] = useState(false);
  const raw = customSrc || mine?.avatar || user?.photoURL;
  const src = useMediaSrc(raw) || (raw && !raw.startsWith("idb:") ? raw : undefined);
  const letter = (mine?.name || user?.displayName || user?.email || "M").trim().charAt(0).toUpperCase();

  const statusKey: AvailabilityStatus =
    mine?.availabilityStatus || (mine?.openNow ? "available" : user ? "available" : "offline");

  const ring = showRing
    ? statusKey === "available"
      ? "ring-2 ring-brand ring-offset-2 ring-offset-card"
      : statusKey === "offline"
        ? "ring-1 ring-line ring-offset-1 ring-offset-card"
        : cn(AVAILABILITY_STATUSES[statusKey]?.ringClass || "ring-1 ring-line", "ring-2 ring-offset-2 ring-offset-card")
    : "";

  return (
    <div
      className={cn(
        "relative grid place-items-center shrink-0 overflow-hidden rounded-full select-none font-display font-bold leading-none transition-transform duration-200",
        className || NAV_AVATAR,
        user
          ? "bg-gradient-to-br from-[#1805db] via-[#2815ee] to-[#0e0394] text-white shadow-xs"
          : "bg-paper text-mute ring-1 ring-line/80",
        ring,
      )}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt=""
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover select-none"
        />
      ) : user ? (
        <span className="text-white drop-shadow-xs">{letter}</span>
      ) : (
        <UserRound className="h-1/2 w-1/2 text-mute" strokeWidth={2} />
      )}
    </div>
  );
}

export function MeAvatar({
  className,
  faceClassName,
  labeled = false,
}: {
  className?: string;
  faceClassName?: string;
  labeled?: boolean;
}) {
  const { user } = useAuth();
  const label = user ? "Me" : "Sign in";
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      title={user ? user.displayName || user.email : "Sign in"}
    >
      <AvatarFace className={faceClassName} />
      {labeled && <span className="text-sm font-medium">{label}</span>}
    </span>
  );
}
