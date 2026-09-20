import { useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { liveBackendEnabled, submitVenueRatingRemote } from "@/lib/functions";
import { track } from "@/lib/analytics";
import { getFirebaseAuth } from "@/lib/firebase";
import { loadRatings, persistRatings, RATE_MOODS, type RateMood, type VenueRating } from "@/lib/ratings";

type Props = {
  target: VenueRating["target"];
  eventId?: string;
  stallId?: string;
  stallName?: string;
  propertyId?: string;
  winbackTitle?: string;
  winbackDetail?: string;
};

export function EmojiRate({ target, eventId, stallId, stallName, propertyId, winbackTitle, winbackDetail }: Props) {
  const existing = useMemo(
    () =>
      loadRatings().find((r) =>
        target === "stall"
          ? r.stallId === stallId
          : target === "event"
            ? r.eventId === eventId && !r.stallId
            : r.propertyId === propertyId,
      ),
    [eventId, propertyId, stallId, target],
  );
  const [mood, setMood] = useState<RateMood | null>(existing?.mood ?? null);
  const [note, setNote] = useState(existing?.note || "");
  const [sent, setSent] = useState(Boolean(existing));

  async function send() {
    if (!mood) return;
    const picked = RATE_MOODS.find((m) => m.id === mood)!;
    const row: VenueRating = {
      id: existing?.id || nanoid(8),
      mood,
      emoji: picked.emoji,
      note: note.trim() || undefined,
      at: new Date().toISOString(),
      target,
      eventId,
      stallId,
      stallName,
      propertyId,
    };
    persistRatings([row, ...loadRatings().filter((r) => r.id !== row.id)]);
    setSent(true);
    toast.success("Sent to host");
    const targetId = stallId || eventId || propertyId || row.id;
    void track("rating_submitted", {
      targetType: target,
      targetId,
      contextId: propertyId || eventId || targetId,
      ratingBucket: mood,
    });
    if (liveBackendEnabled() && getFirebaseAuth()?.currentUser) {
      try {
        await submitVenueRatingRemote({
          mood: row.mood,
          emoji: row.emoji,
          note: row.note,
          target: row.target,
          eventId: row.eventId,
          stallId: row.stallId,
          stallName: row.stallName,
          propertyId: row.propertyId,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (/already/i.test(message)) toast.message("Already sent");
      }
    }
  }

  return (
    <section className="mt-6 rounded-[28px] bg-card p-4 ring-1 ring-line">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Rate</p>
      <p className="font-display mt-1 text-lg">{sent ? "Thanks" : "How was it?"}</p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {RATE_MOODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMood(m.id);
              setSent(false);
            }}
            className={cn(
              "grid h-14 place-items-center rounded-2xl text-2xl ring-1",
              mood === m.id ? "bg-ink ring-ink" : "bg-paper ring-line",
            )}
            aria-label={m.label}
          >
            {m.emoji}
          </button>
        ))}
      </div>
      {!sent && (
        <>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="A line for the host"
            className="mt-3 h-11 w-full rounded-full bg-paper px-4 text-[15px] outline-none border border-line focus:border-brand"
          />
          <Button className="mt-3 w-full" disabled={!mood} onClick={() => void send()}>
            Send
          </Button>
        </>
      )}
      {sent && mood && (
        <p className="mt-3 text-center text-sm text-mute">{RATE_MOODS.find((m) => m.id === mood)?.emoji} to the host</p>
      )}
      {sent && winbackTitle && (
        <div className="mt-3 rounded-2xl bg-brand/10 px-4 py-3 text-center ring-1 ring-brand/20">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand">Come back soon</p>
          <p className="mt-0.5 text-sm font-bold text-ink">{winbackTitle}</p>
          {winbackDetail ? <p className="mt-0.5 text-xs text-mute">{winbackDetail}</p> : null}
        </div>
      )}
    </section>
  );
}
