import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Users, ChevronRight } from "lucide-react";
import { subscribeGuestlist, type GuestRow } from "@/lib/guestlist";
import { cn } from "@/lib/cn";

export interface EventGuestlistAvatarsProps {
  eventId: string;
  className?: string;
}

const DEFAULT_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
];

export function EventGuestlistAvatars({ eventId, className }: EventGuestlistAvatarsProps) {
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    const unsub = subscribeGuestlist(
      "event",
      eventId,
      (rows) => {
        setGuests(rows);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
    return () => unsub();
  }, [eventId]);

  const activeGuests = guests.filter((g) => g.status === "going" || g.status === "checked-in");
  const count = activeGuests.length;

  // Formatting attendee summary string (e.g. "Cheryl, Rayn and 10 others going")
  const summaryText =
    count === 0
      ? "Be the first to join the guestlist"
      : count === 1
        ? `${activeGuests[0]?.name || "1 person"} is going`
        : count === 2
          ? `${activeGuests[0]?.name} and ${activeGuests[1]?.name} are going`
          : `${activeGuests[0]?.name}, ${activeGuests[1]?.name} and ${count - 2} others going`;

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-[24px] bg-card/60 p-4 ring-1 ring-line/50 backdrop-blur-md animate-pulse",
          className,
        )}
      >
        <div className="flex -space-x-2 shrink-0">
          <div className="h-8 w-8 rounded-full bg-paper ring-2 ring-card" />
          <div className="h-8 w-8 rounded-full bg-paper ring-2 ring-card" />
        </div>
        <div className="h-3 w-32 rounded bg-paper" />
      </div>
    );
  }

  return (
    <Link
      href={`/e/${eventId}/guests`}
      className={cn(
        "group flex items-center justify-between rounded-[24px] bg-card/90 p-4 ring-1 ring-line/70 shadow-clay backdrop-blur-md transition hover:ring-brand/30 hover:bg-card active:scale-[0.99] cursor-pointer",
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar Stack */}
        <div className="flex -space-x-2 shrink-0">
          {count > 0
            ? activeGuests.slice(0, 4).map((g, i) => (
                <div
                  key={g.id || i}
                  className="grid h-8 w-8 place-items-center rounded-full bg-paper text-[11px] font-bold text-ink ring-2 ring-card shadow-xs overflow-hidden"
                >
                  {g.name.slice(0, 1).toUpperCase()}
                </div>
              ))
            : DEFAULT_AVATARS.slice(0, 3).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-card shadow-xs opacity-60"
                />
              ))}
          {count > 4 && (
            <div className="grid h-8 w-8 place-items-center rounded-full bg-brand/15 text-[11px] font-black text-accent ring-2 ring-card">
              +{count - 4}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
            <Users size={13} className="text-accent" />
            <span>{count > 0 ? `${count} Going` : "Guestlist"}</span>
          </div>
          <p className="text-[11px] font-medium text-mute truncate group-hover:text-ink transition">{summaryText}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs font-semibold text-mute group-hover:text-accent transition pl-2">
        <span className="hidden sm:inline">Roster</span>
        <ChevronRight size={14} />
      </div>
    </Link>
  );
}
