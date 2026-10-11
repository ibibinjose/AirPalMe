import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { toast } from "sonner";
import type { HangoutPlan } from "@shared/plan";
import { planPhotos } from "@shared/plan";
import { preparePhotoBlob, storeMedia } from "@/lib/image-store";
import { triggerHaptic } from "@/lib/native";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/lib/cn";

/** Shared album: every photo comment on the plan, newest first. Remember → Repeat. */
export function PlanAlbum({
  plan,
  canPost,
  onPostPhoto,
}: {
  plan: HangoutPlan;
  canPost: boolean;
  onPostPhoto: (text: string, photoUrl: string) => unknown;
}) {
  const photos = useMemo(() => planPhotos(plan), [plan]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [staged, setStaged] = useState<{ blob: Blob; previewUrl: string } | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useScrollLock(lightbox !== null);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft") setLightbox((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, photos.length]);

  if (!photos.length && !canPost) return null;
  const current = lightbox !== null ? photos[lightbox] : undefined;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setUploading(true);
    void triggerHaptic("light");
    try {
      setStaged(await preparePhotoBlob(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to read photo");
    } finally {
      setUploading(false);
    }
  }

  async function postStaged() {
    if (!staged) return;
    setUploading(true);
    try {
      const src = await storeMedia(staged.blob, { folder: "memories", kind: "comment" });
      const text = caption.trim() ? `[Photos] ${caption.trim()}` : "[Photos]";
      onPostPhoto(text, src);
      void triggerHaptic("success");
      toast.success("Added to the album!");
      URL.revokeObjectURL(staged.previewUrl);
      setStaged(null);
      setCaption("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent ring-1 ring-brand/20">
            <Images size={18} />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Moments</p>
            <h2 className="font-display text-xl font-bold text-ink">
              Shared album{photos.length > 0 ? ` · ${photos.length}` : ""}
            </h2>
          </div>
        </div>
        {canPost && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Add photos to the album"
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-card px-4 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition active:scale-95 disabled:opacity-40"
          >
            <Camera size={15} />
            <span className="hidden sm:inline">Add photos</span>
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" aria-hidden onChange={handleFile} />

      {staged && (
        <div className="mt-4 rounded-2xl bg-paper p-3 ring-1 ring-line">
          <div className="flex items-center gap-3">
            <img src={staged.previewUrl} alt="Photo to add" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption (optional)"
              aria-label="Photo caption"
              className="h-11 min-w-0 flex-1 rounded-2xl bg-card px-4 text-sm border border-line outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(staged.previewUrl);
                setStaged(null);
                setCaption("");
              }}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full text-xs font-semibold text-mute ring-1 ring-line hover:text-ink transition active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void postStaged()}
              disabled={uploading}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white shadow-xs hover:bg-brand/90 transition active:scale-95 disabled:opacity-40"
            >
              {uploading ? "Posting…" : "Post to album"}
            </button>
          </div>
        </div>
      )}

      {photos.length === 0 ? (
        <p className="mt-4 text-[13px] text-mute">No photos yet — be the first to add one from the night.</p>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2">
          {photos.map((p, i) => (
            <button
              key={p.commentId}
              type="button"
              onClick={() => setLightbox(i)}
              aria-label={`Open photo by ${p.authorName}`}
              className="group relative aspect-square overflow-hidden rounded-2xl bg-paper ring-1 ring-line transition active:scale-[0.98]"
            >
              <img
                src={p.url}
                alt={p.caption || `Photo by ${p.authorName}`}
                loading="lazy"
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}

      {current && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close photo"
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X size={18} />
          </button>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((lightbox! - 1 + photos.length) % photos.length);
                }}
                aria-label="Previous photo"
                className="absolute left-2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-4"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((lightbox! + 1) % photos.length);
                }}
                aria-label="Next photo"
                className="absolute right-2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-4"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
          <figure className={cn("max-h-full max-w-full")} onClick={(e) => e.stopPropagation()}>
            <img
              src={current.url}
              alt={current.caption || `Photo by ${current.authorName}`}
              className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain"
            />
            <figcaption className="mt-2 text-center text-[13px] text-white/80">
              {current.caption ? (
                <>
                  <span className="font-semibold text-white">{current.caption}</span>
                  <span> · {current.authorName}</span>
                </>
              ) : (
                current.authorName
              )}
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
