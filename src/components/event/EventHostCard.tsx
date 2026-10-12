import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AtSign, BadgeCheck, Building2, User } from "lucide-react";
import { fetchPublicBio } from "@/lib/bio-store";
import { bioPath, type BioProfile } from "@shared/bio";
import { cn } from "@/lib/cn";

export interface EventHostCardProps {
  hostName?: string;
  hostHandle?: string;
  hostType?: "business" | "individual";
  collaboratorHandles?: string[];
  className?: string;
}

export function EventHostCard({
  hostName,
  hostHandle,
  hostType = "individual",
  collaboratorHandles = [],
  className,
}: EventHostCardProps) {
  const [profile, setProfile] = useState<BioProfile | null>(null);
  const cleanHandle = hostHandle ? hostHandle.replace(/^@+/, "").toLowerCase() : "";

  useEffect(() => {
    if (!cleanHandle) return;
    let alive = true;
    void fetchPublicBio(cleanHandle).then((bio) => {
      if (alive && bio) setProfile(bio);
    });
    return () => {
      alive = false;
    };
  }, [cleanHandle]);

  const displayName = profile?.name || hostName || (hostType === "business" ? "Event Partner" : "Community Host");
  const avatarUrl = profile?.avatar;
  const isBusiness = hostType === "business" || profile?.kind === "business";

  return (
    <div
      className={cn(
        "rounded-[24px] bg-card/90 p-4 ring-1 ring-line/70 shadow-clay backdrop-blur-md space-y-3",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-line/50 pb-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-mute">Hosted By</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-accent">
          {isBusiness ? <Building2 size={11} /> : <User size={11} />}
          <span>{isBusiness ? "Business / Venue" : "AirPal Host"}</span>
        </span>
      </div>

      {/* Main Host Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={cleanHandle ? bioPath(cleanHandle) : "#"} className="relative shrink-0 group block">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-11 w-11 rounded-full object-cover ring-2 ring-line/80 group-hover:ring-brand transition"
              />
            ) : (
              <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-tr from-brand/20 to-amber-500/20 text-sm font-black text-accent ring-2 ring-line/80">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <Link
                href={cleanHandle ? bioPath(cleanHandle) : "#"}
                className="text-sm font-bold text-ink hover:text-accent transition truncate"
              >
                {displayName}
              </Link>
              <BadgeCheck size={14} className="text-amber-500 shrink-0 fill-amber-500/20" />
            </div>

            {cleanHandle ? (
              <Link
                href={bioPath(cleanHandle)}
                className="text-xs font-semibold text-mute hover:text-accent transition flex items-center gap-0.5"
              >
                <span>@{cleanHandle}</span>
              </Link>
            ) : (
              <p className="text-xs text-mute truncate">{profile?.shortWhy || "Verified Event Host"}</p>
            )}
          </div>
        </div>

        {cleanHandle && (
          <Link
            href={bioPath(cleanHandle)}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-paper px-3 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card hover:ring-brand/30 transition shrink-0 active:scale-95"
          >
            <span>View Bio</span>
          </Link>
        )}
      </div>

      {/* Co-Hosts / Collaborators List */}
      {collaboratorHandles.length > 0 && (
        <div className="border-t border-line/50 pt-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-mute block mb-1.5">
            Co-Hosts &amp; Partners
          </span>
          <div className="flex flex-wrap gap-1.5">
            {collaboratorHandles.map((handle) => {
              const clean = handle.replace(/^@+/, "");
              return (
                <Link
                  key={clean}
                  href={bioPath(clean)}
                  className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-line hover:ring-brand hover:text-accent transition"
                >
                  <AtSign size={11} className="text-accent" />
                  <span>{clean}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
