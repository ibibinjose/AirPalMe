import { useState } from "react";
import { MessageSquare, Send, Sparkles, Image as ImageIcon } from "lucide-react";
import type { HangoutPlan } from "@shared/plan";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/cn";

export function PlanDiscussionWall({
  plan,
  onPostComment,
}: {
  plan: HangoutPlan;
  onPostComment: (text: string, photoUrl?: string) => void;
}) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [showPhotoInput, setShowPhotoInput] = useState(false);

  const comments = plan.comments || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onPostComment(text.trim(), photoUrl.trim() || undefined);
    setText("");
    setPhotoUrl("");
    setShowPhotoInput(false);
  };

  return (
    <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs">
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

      {/* Messages Feed */}
      <div className="mt-5 space-y-3.5 max-h-96 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <div className="rounded-2xl bg-paper px-4 py-8 text-center ring-1 ring-line">
            <Sparkles size={24} className="mx-auto text-gold mb-2" />
            <p className="text-xs font-semibold text-ink">No messages yet</p>
            <p className="text-[11px] text-mute mt-0.5">Drop a quick update or question for the crew attending!</p>
          </div>
        ) : (
          comments.map((comment) => {
            const isMe = user?.uid && comment.authorId === user.uid;
            return (
              <div
                key={comment.id}
                className={cn(
                  "flex gap-3 rounded-2xl p-3.5 ring-1 transition",
                  isMe
                    ? "bg-brand/5 ring-brand/20 ml-4 sm:ml-8"
                    : "bg-paper ring-line mr-4 sm:mr-8",
                )}
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-card text-xs font-bold text-ink ring-1 ring-line uppercase">
                  {comment.authorAvatar ? (
                    <img src={comment.authorAvatar} alt={comment.authorName} className="h-full w-full rounded-xl object-cover" />
                  ) : (
                    <span>{comment.authorName.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-ink">
                      {comment.authorName}
                      {comment.authorHandle && <span className="text-mute font-normal"> (@{comment.authorHandle})</span>}
                      {isMe && <span className="ml-1 text-[10px] text-brand font-medium">(You)</span>}
                    </p>
                    <span className="text-[10px] text-mute shrink-0">
                      {new Date(comment.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink/90 leading-relaxed break-words whitespace-pre-line">
                    {comment.text}
                  </p>
                  {comment.photoUrl && (
                    <div className="mt-2.5 overflow-hidden rounded-xl ring-1 ring-line max-w-xs">
                      <img src={comment.photoUrl} alt="Drop from crew" className="w-full h-auto object-cover max-h-48" />
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
            className="h-11 flex-1 rounded-2xl bg-paper px-4 text-xs sm:text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-brand text-ink"
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
          <Button type="submit" size="sm" className="h-11 rounded-2xl px-4 shrink-0 gap-1.5">
            <Send size={15} />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
