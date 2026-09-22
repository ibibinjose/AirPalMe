import { UserRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useMediaSrc } from "@/hooks/useMediaSrc";
import { cn } from "@/lib/cn";

import { AVAILABILITY_STATUSES, type AvailabilityStatus } from "@shared/bio";

/** Nav buttons are h-9 / lg:h-10 — keep the avatar on that same height. */
export const NAV_AVATAR = "h-10 w-10 text-sm lg:text-base";

export function AvatarFace({ className }: { className?: string }) {
  const { user } = useAuth();
  const { mine } = useBio();
  const raw = mine?.avatar || user?.photoURL;
  const src = useMediaSrc(raw) || (raw && !raw.startsWith("idb:") ? raw : undefined);
  const letter = (mine?.name || user?.displayName || user?.email || "M").trim().charAt(0).toUpperCase();

  const statusKey: AvailabilityStatus =
    mine?.availabilityStatus || (mine?.openNow ? "available" : user ? "available" : "offline");
  // Status lives in the AirPal ring only — no corner dots. Available carries
  // the AirPal Blue ring; busy/dnd keep their red rings; offline is neutral.
  const ring =
    statusKey === "available"
      ? "ring-2 ring-brand"
      : statusKey === "offline"
        ? "ring-1 ring-line"
        : AVAILABILITY_STATUSES[statusKey]?.ringClass || "ring-1 ring-line";

  return (
    <span className={cn("relative inline-grid shrink-0 overflow-visible", className || NAV_AVATAR)}>
      <span
        className={cn(
          "absolute inset-0 grid place-items-center overflow-hidden rounded-full bg-ink font-semibold leading-none text-white",
          ring,
        )}
      >
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : user ? (
          letter
        ) : (
          <UserRound className="h-[48%] w-[48%]" strokeWidth={1.8} />
        )}
      </span>
    </span>
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
