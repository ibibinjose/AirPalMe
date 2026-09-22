import { useMemo, useState } from "react";
import { Car, MapPin, MessageSquare, Send, Sparkles, Ticket, Camera, Image as ImageIcon } from "lucide-react";
import type { HangoutPlan } from "@shared/plan";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/cn";

const TOPICS = [
  { id: "Meetup", label: "Meetup spot", icon: MapPin, color: "#2b7cd3" },
  { id: "Carpool", label: "Carpool", icon: Car, color: "#2fa866" },
  { id: "Tables", label: "Tables", icon: Ticket, color: "#d99a17" },
  { id: "Photos", label: "Photos", icon: Camera, color: "#e86a33" },
] as const;

function topicOf(text: string): string | null {
  const m = text.match(/^\[(Meetup|Carpool|Tables|Photos)\]/);
  return m ? m[1] : null;
}

export function PlanDiscussionWall({
  plan,
  onPostComment,
}: {
  plan: HangoutPlan;
  onPostComment: (text: string, photoUrl?: string) => unknown;
}) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const comments = plan.comments || [];
  const visible = useMemo(
    () => (filter ? comments.filter((c) => topicOf(c.text) === filter) : comments),
    [comments, filter],
  );

  function pickTopic(id: string) {
    setText((prev) => {
      const stripped = prev.replace(/^\[(Meetup|Carpool|Tables|Photos)\]\s?/, "");
      return `[${id}] ${stripped}`;
    });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    // addComment toasts on success and returns undefined when login-gated.
    if (!onPostComment(text.trim(), photoUrl.trim() || undefined)) return;
    setText("");
    setPhotoUrl("");
    setShowPhotoInput(false);
  };

  return (
    <div className="rounded-[24px] bg-card p-4 ring-1 ring-line shadow-[0_4px_16px_rgba(18,22,20,0.08)] sm:p-6">
      <div className="flex items-center justify-between pb-4 border-b border-line/60">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20">
            <MessageSquare size={17} />
          </span>
          <div>
            <h3 className="font-display text-lg font-bold text-ink">Crew Discussion & Live Updates</h3>
            <p className="text-xs text-mute">Coordinate meetup spots, carpooling, table bookings, and photos</p>
          </div>
        </div>
        <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-mute ring-1 ring-line">
          {comments.length} message{comments.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Topic chips — coordinate + filter by what matters */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="Filter by topic">
        {TOPICS.map((t) => {
          const on = filter === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setFilter(on ? null : t.id);
                if (!on) pickTopic(t.id);
              }}
              aria-pressed={on}
              className="flex h-10 shrink-0 cursor-pointer touch-manipulation items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold shadow-sm transition active:scale-[0.96] ring-1 ring-line"
              style={
                on
                  ? { backgroundColor: t.color, color: "#fff", borderColor: "transparent" }
                  : { backgroundColor: `${t.color}14`, color: t.color }
              }
            >
              <t.icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Messages Feed */}
      <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
        {visible.length === 0 ? (
          <div className="rounded-2xl bg-paper px-4 py-8 text-center ring-1 ring-line">
            <Sparkles size={24} className="mx-auto text-gold mb-2" />
            <p className="text-xs font-semibold text-ink">
              {filter ? `No ${filter.toLowerCase()} updates yet` : "No messages yet"}
            </p>
            <p className="text-[11px] text-mute mt-0.5">
              {filter ? "Tap a topic above, then post the first one." : "Drop a quick update for the crew."}
            </p>
          </div>
        ) : (
          visible.map((comment) => {
            const isMe = user?.uid && comment.authorId === user.uid;
            const topic = topicOf(comment.text);
            return (
              <div
                key={comment.id}
                className={cn(
                  "flex gap-3 rounded-2xl p-3.5 ring-1 transition",
                  isMe ? "bg-brand/5 ring-brand/20 ml-4 sm:ml-8" : "bg-paper ring-line mr-4 sm:mr-8",
                )}
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-card text-xs font-bold text-ink ring-1 ring-line uppercase">
                  {comment.authorAvatar ? (
                    <img
                      src={comment.authorAvatar}
                      alt={comment.authorName}
                      className="h-full w-full rounded-xl object-cover"
                    />
                  ) : (
                    <span>{comment.authorName.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-ink">
                      {comment.authorName}
                      {comment.authorHandle && (
                        <span className="text-mute font-normal"> (@{comment.authorHandle})</span>
                      )}
                      {isMe && <span className="ml-1 text-[10px] text-brand font-medium">(You)</span>}
                    </p>
                    <span className="text-[10px] text-mute shrink-0">
                      {new Date(comment.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                  {topic && (
                    <span className="mt-1.5 inline-block rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold ring-1 ring-line text-mute">
                      {topic}
                    </span>
                  )}
                  <p className="mt-1 text-xs text-ink/90 leading-relaxed break-words whitespace-pre-line">
                    {comment.text}
                  </p>
                  {comment.photoUrl && (
                    <div className="mt-2.5 aspect-square w-full max-w-[240px] overflow-hidden rounded-2xl ring-1 ring-line">
                      <img
                        src={comment.photoUrl}
                        alt="Drop from crew"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Post Message Input Form */}
      <form onSubmit={handleSubmit} className="mt-5 border-t border-line/60 pt-4 space-y-2.5">
        {showPhotoInput && (
          <div className="flex items-center gap-2 rounded-2xl bg-paper px-3 py-1.5 ring-1 ring-line">
            <ImageIcon size={14} className="text-mute shrink-0" />
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="Paste image URL (https://...)"
              className="w-full bg-transparent text-xs text-ink outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setPhotoUrl("");
                setShowPhotoInput(false);
              }}
              className="text-[11px] text-mute hover:text-red-500"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Post a message, meeting spot update, or photo..."
            className="h-11 flex-1 rounded-2xl bg-paper px-4 text-xs sm:text-sm border border-line outline-none focus:ring-2 focus:ring-brand text-ink focus:border-brand"
          />
          <button
            type="button"
            onClick={() => setShowPhotoInput((v) => !v)}
            title="Attach photo"
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition ring-1",
              showPhotoInput ? "bg-brand text-white ring-brand" : "bg-paper text-mute ring-line hover:text-ink",
            )}
          >
            <ImageIcon size={17} />
          </button>
          <Button type="submit" size="sm" className="h-11 rounded-2xl px-4 shrink-0 gap-1.5 shadow-[0_6px_20px_rgba(24,5,219,0.35)]">
            <Send size={15} />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
