import { Link } from "wouter";
import { Photo } from "@/components/ui/Photo";
import { useSpeakerBios } from "@/lib/speakers";
import type { Speaker } from "@shared/event";

/**
 * Speakers and panel members with live AirPal profile photos. Members who
 * linked an @handle show their photo and link to their public bio; external
 * guests render from stored name + role.
 */
export function SpeakerRow({ speakers, compact }: { speakers: Speaker[] | undefined; compact?: boolean }) {
  const resolved = useSpeakerBios(speakers);
  if (!resolved.length) return null;
  return (
    <ul className={compact ? "mt-2 space-y-1.5" : "mt-3 space-y-2"} aria-label="Speakers and panel members">
      {resolved.map((s, i) => {
        const body = (
          <>
            {s.photoUrl ? (
              <Photo src={s.photoUrl} alt={s.displayName} className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-line" />
            ) : (
              <span
                aria-hidden
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/10 text-[13px] font-bold text-brand ring-1 ring-brand/20"
              >
                {s.displayName.trim().charAt(0).toUpperCase() || "?"}
              </span>
            )}
            <span className="min-w-0 text-[13px] leading-snug">
              <span className="font-semibold text-ink">{s.displayName}</span>
              {s.role && <span className="text-mute"> · {s.role}</span>}
              {s.handle && <span className="text-brand"> @{s.handle}</span>}
            </span>
          </>
        );
        return (
          <li key={`${s.handle || s.displayName}-${i}`} className="flex items-center gap-2">
            {s.handle ? (
              <Link href={`/@${s.handle}`} className="flex min-w-0 items-center gap-2">
                {body}
              </Link>
            ) : (
              <span className="flex min-w-0 items-center gap-2">{body}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
