import { useMemo, useState, useRef } from "react";
import { Car, MapPin, MessageSquare, Send, Sparkles, Ticket, Camera, Image as ImageIcon, Link2, Loader2, X } from "lucide-react";
import type { HangoutPlan } from "@shared/plan";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { useAuth } from "@/contexts/AuthContext";
import { readFileAsImage, storeMedia } from "@/lib/image-store";
import { triggerHaptic } from "@/lib/native";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

const TOPICS = [
  { id: "Meetup", label: "Meetup spot", icon: MapPin, color: "#2b7cd3" },
  { id: "Carpool", label: "Carpool", icon: Car, color: "#15803d" },
  { id: "Tables", label: "Tables", icon: Ticket, color: "#b45309" },
  { id: "Photos", label: "Photos", icon: Camera, color: "#c2410c" },
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
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    void triggerHaptic("light");
    try {
      const { image, url } = await readFileAsImage(file);
      const canvas = document.createElement("canvas");
      const maxEdge = 1200;
      let { width, height } = image;
      if (width > maxEdge || height > maxEdge) {
        if (width > height) {
          height = Math.round((height * maxEdge) / width);
          width = maxEdge;
        } else {
          width = Math.round((width * maxEdge) / height);
          height = maxEdge;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not process image");
      ctx.drawImage(image, 0, 0, width, height);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Could not encode image"))),
          "image/jpeg",
          0.88,
        );
      });
      const src = await storeMedia(blob, { folder: "memories", kind: "comment" });
      setPhotoUrl(src);
      URL.revokeObjectURL(url);
      void triggerHaptic("success");
      toast.success("Photo attached to message!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (!onPostComment(text.trim(), photoUrl.trim() || undefined)) return;
    void triggerHaptic("success");
    setText("");
    setPhotoUrl("");
    setShowUrlInput(false);
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
                void triggerHaptic("light");
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
                    <div className="mt-2.5 aspect-video w-full max-w-[280px] overflow-hidden rounded-2xl ring-1 ring-line shadow-xs">
                      <Photo
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
        {/* Hidden direct file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          aria-label="Upload photo from device"
          className="hidden"
          onChange={(e) => void handleFileSelect(e)}
        />

        {/* Photo Attachment Thumbnail Preview */}
        {(photoUrl || uploadingPhoto) && (
          <div className="flex items-center gap-3 rounded-2xl bg-paper p-2.5 ring-1 ring-line">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-line bg-card">
              {uploadingPhoto ? (
                <div className="flex h-full w-full items-center justify-center text-brand">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              ) : (
                <Photo src={photoUrl} alt="Attached preview" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-ink truncate">
                {uploadingPhoto ? "Optimizing & attaching photo..." : "Photo attached"}
              </p>
              <p className="text-[11px] text-mute">Will be shared with your message</p>
            </div>
            {!uploadingPhoto && (
              <button
                type="button"
                onClick={() => {
                  setPhotoUrl("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="grid h-7 w-7 place-items-center rounded-full bg-card ring-1 ring-line text-mute hover:text-red-500 transition cursor-pointer"
                title="Remove photo"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Optional URL input fallback */}
        {showUrlInput && (
          <div className="flex items-center gap-2 rounded-2xl bg-paper px-3 py-2 ring-1 ring-line">
            <Link2 size={14} className="text-mute shrink-0" />
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="Or paste web image link (https://...)"
              className="w-full bg-transparent text-xs text-ink outline-none"
            />
            <button
              type="button"
              onClick={() => setShowUrlInput(false)}
              className="text-[11px] font-medium text-mute hover:text-red-500"
            >
              Close
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

          {/* Direct File Picker Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            title="Upload photo from device or take picture"
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition ring-1 cursor-pointer",
              photoUrl ? "bg-emerald-500/15 text-emerald-600 ring-emerald-500/30" : "bg-paper text-mute ring-line hover:text-ink",
            )}
          >
            {uploadingPhoto ? <Loader2 size={17} className="animate-spin text-brand" /> : <Camera size={17} />}
          </button>

          {/* Optional Paste URL Toggle */}
          <button
            type="button"
            onClick={() => setShowUrlInput((v) => !v)}
            title="Paste image URL"
            className={cn(
              "hidden sm:grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition ring-1 cursor-pointer",
              showUrlInput ? "bg-brand text-white ring-brand" : "bg-paper text-mute ring-line hover:text-ink",
            )}
          >
            <ImageIcon size={17} />
          </button>

          <Button
            type="submit"
            size="sm"
            disabled={uploadingPhoto}
            className="h-11 rounded-2xl px-4 shrink-0 gap-1.5 shadow-[0_6px_20px_rgba(18,22,20,0.15)]"
          >
            <Send size={15} />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
