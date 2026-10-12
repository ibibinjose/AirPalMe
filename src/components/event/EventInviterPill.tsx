import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { fetchPublicBio } from "@/lib/bio-store";
import { bioPath, type BioProfile } from "@shared/bio";
import { cn } from "@/lib/cn";

export interface EventInviterPillProps {
  className?: string;
}

export function EventInviterPill({ className }: EventInviterPillProps) {
  const searchStr = useSearch();
  const [profile, setProfile] = useState<BioProfile | null>(null);

  const query = new URLSearchParams(searchStr);
  const refHandleRaw = query.get("ref") || query.get("tk") || "";
  const refHandle = refHandleRaw.replace(/^@+/, "").trim().toLowerCase();

  useEffect(() => {
    if (!refHandle) return;
    let alive = true;
    void fetchPublicBio(refHandle).then((bio) => {
      if (alive && bio) setProfile(bio);
    });
    return () => {
      alive = false;
    };
  }, [refHandle]);

  if (!refHandle) return null;

  const displayName = profile?.name || `@${refHandle}`;
  const avatarUrl = profile?.avatar;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <Link
        href={bioPath(refHandle)}
        className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand/10 via-card to-amber-500/10 px-3 py-1 text-xs ring-1 ring-line/80 shadow-2xs backdrop-blur-md hover:ring-brand/40 transition active:scale-95"
      >
        <div className="relative shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-5 w-5 rounded-full object-cover ring-1 ring-white/50" />
          ) : (
            <div className="grid h-5 w-5 place-items-center rounded-full bg-brand/20 text-[10px] font-bold text-accent ring-1 ring-white/50">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-card" />
        </div>

        <span className="font-semibold text-ink group-hover:text-accent transition">{displayName}</span>
        <span className="text-mute font-medium">invites you to join</span>
      </Link>
    </div>
  );
}
