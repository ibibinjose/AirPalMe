import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Camera, MapPin, Trash2, Users, X } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { Photo } from "@/components/ui/Photo";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/PageLoading";
import { useAuth } from "@/contexts/AuthContext";
import { useScrollLock } from "@/hooks/useScrollLock";
import { addMemory, listMemories, removeMemory, type Memory } from "@/lib/memories";
import { listPeople } from "@/lib/people";
import { readFileAsImage, storeMedia } from "@/lib/image-store";
import { bioPath } from "@shared/bio";
import { cn } from "@/lib/cn";
import { fieldInput } from "@/components/forms/ValidField";

function downscale(image: HTMLImageElement, maxEdge = 1600): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const w = Math.max(1, Math.round(image.naturalWidth * scale));
  const h = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that photo");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not read that photo"))),
      "image/jpeg",
      0.85,
    );
  });
}

function formatDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export function MemoryWallPage() {
  const [, nav] = useLocation();
  const { user, authReady } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draftUrl, setDraftUrl] = useState<string | null>(null);
  const [draftBlob, setDraftBlob] = useState<Blob | null>(null);
  const [caption, setCaption] = useState("");
  const [withPeople, setWithPeople] = useState("");
  const [place, setPlace] = useState("");
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<Memory | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const knownPeople = useMemo(() => listPeople(), [memories]);

  const initialWith = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get("with") || "";
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    setMemories(listMemories());
  }, []);

  useScrollLock(composerOpen || Boolean(lightbox));

  useEffect(() => {
    if (!composerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeComposer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [composerOpen]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox]);

  if (!authReady) {
    return <PageLoading />;
  }
  if (!user) {
    return (
      <AuthGate
        next="/me/memories"
        kicker="Memory Wall"
        title="Your trip memories"
        lede="Sign in to keep a Memory Wall of the people and places from your trip. Photos stay on this device until you back them up, and sync when you're signed in."
      />
    );
  }

  const visible = initialWith
    ? memories.filter((m) =>
        m.people.some(
          (p) => p.trim().toLowerCase().replace(/^@/, "") === initialWith.trim().toLowerCase().replace(/^@/, ""),
        ),
      )
    : memories;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { image, url } = await readFileAsImage(file);
      const blob = await downscale(image);
      URL.revokeObjectURL(url);
      setDraftBlob(blob);
      setDraftUrl(URL.createObjectURL(blob));
      setComposerOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that photo");
    }
  }

  function closeComposer() {
    setComposerOpen(false);
    setDraftBlob(null);
    if (draftUrl) URL.revokeObjectURL(draftUrl);
    setDraftUrl(null);
    setCaption("");
    setWithPeople("");
    setPlace("");
  }

  async function onSave() {
    if (!draftBlob || saving) return;
    setSaving(true);
    try {
      const src = await storeMedia(draftBlob, { folder: "memories", kind: "memory" });
      const people = withPeople
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      const row = addMemory({ src, caption, people, place });
      setMemories([row, ...listMemories().filter((m) => m.id !== row.id)]);
      toast.success(src.startsWith("http") ? "Saved to your Memory Wall · backed up" : "Saved to your Memory Wall");
      closeComposer();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  function onDelete(id: string) {
    removeMemory(id);
    setMemories(listMemories());
    setLightbox(null);
    toast.success("Memory removed");
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-28">
      <div className="flex items-center gap-3 pt-4">
        <button
          type="button"
          onClick={() => nav("/me")}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card ring-1 ring-line transition hover:bg-card/80"
          aria-label="Back to profile"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Trip keepsakes</p>
          <h1 className="font-display text-2xl font-bold leading-tight">Memory Wall</h1>
        </div>
        <Button size="sm" className="ml-auto gap-1.5 rounded-full" onClick={() => fileRef.current?.click()}>
          <Camera size={15} />
          Add photo
        </Button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
      </div>

      {initialWith && (
        <button
          type="button"
          onClick={() => nav("/me/memories")}
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-4 text-xs font-medium ring-1 ring-line"
        >
          <Users size={13} />
          With {initialWith} · show all
          <X size={13} />
        </button>
      )}

      {visible.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-card p-8 text-center ring-1 ring-line">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand">
            <Camera size={22} />
          </div>
          <p className="font-display mt-3 text-lg font-bold">No memories yet</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-mute">
            Snap a photo with the people you meet — it lands here with their names, so the trip stays with you.
          </p>
          <Button className="mt-4 gap-1.5 rounded-full" onClick={() => fileRef.current?.click()}>
            <Camera size={15} />
            Take the first photo
          </Button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {visible.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setLightbox(m)}
              className="relative aspect-square overflow-hidden rounded-2xl bg-card ring-1 ring-line transition active:scale-[0.98]"
              aria-label={m.caption || `Memory from ${formatDay(m.takenAt)}`}
            >
              <Photo src={m.src} className="h-full w-full object-cover" />
              {m.people.length > 0 && (
                <span className="absolute bottom-1.5 left-1.5 inline-flex max-w-[calc(100%-12px)] items-center gap-1 truncate rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                  <Users size={10} />
                  <span className="truncate">{m.people.slice(0, 2).join(", ")}</span>
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {composerOpen && draftUrl && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4 backdrop-blur-sm sm:items-center [padding-bottom:var(--keyboard-height,0px)] transition-[padding] duration-200"
          onClick={closeComposer}
        >
          <div
            className="w-full max-w-sm max-h-[min(90dvh,calc(var(--visual-viewport-height,100dvh)-1.5rem))] overflow-y-auto rounded-[28px] bg-paper p-5 shadow-2xl ring-1 ring-line motion-safe:animate-[sheet-up_0.22s_ease-out] transition-all duration-200"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="New memory"
          >
            <img src={draftUrl} alt="New memory" className="aspect-square w-full rounded-2xl object-cover" />
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption — sunset swim at Bondi"
              maxLength={120}
              className={`mt-3 ${fieldInput}`}
            />
            <input
              value={withPeople}
              onChange={(e) => setWithPeople(e.target.value)}
              placeholder="With — Maya, @leo (comma separated)"
              maxLength={120}
              list="memory-people"
              className={`mt-2 ${fieldInput}`}
            />
            {knownPeople.length > 0 && (
              <datalist id="memory-people">
                {knownPeople.map((p) => (
                  <option key={p.id} value={p.handle ? `@${p.handle}` : p.name} />
                ))}
              </datalist>
            )}
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Place — Bondi Beach"
              maxLength={80}
              className={`mt-2 ${fieldInput}`}
            />
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" className="flex-1 rounded-full" onClick={closeComposer}>
                Cancel
              </Button>
              <Button className="flex-1 rounded-full" disabled={saving} onClick={onSave}>
                {saving ? "Saving…" : "Save memory"}
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {lightbox && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/80 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.caption || "Memory"}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-[28px] bg-paper shadow-2xl ring-1 ring-line"
            onClick={(e) => e.stopPropagation()}
          >
            <Photo src={lightbox.src} className="aspect-square w-full object-cover" />
            <div className="p-5">
              {lightbox.caption && <p className="font-display text-lg font-bold leading-snug">{lightbox.caption}</p>}
              <p className="mt-1 flex items-center gap-1.5 text-xs text-mute">
                <MapPin size={12} />
                {[lightbox.place, formatDay(lightbox.takenAt)].filter(Boolean).join(" · ")}
              </p>
              {lightbox.people.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {lightbox.people.map((p) => {
                    const handle = p.replace(/^@/, "");
                    const isHandle = p.startsWith("@") && handle.length > 0;
                    return isHandle ? (
                      <button
                        key={p}
                        type="button"
                        onClick={() => nav(bioPath(handle))}
                        className="inline-flex min-h-[40px] items-center rounded-full bg-brand/10 px-3.5 text-xs font-semibold text-brand hover:bg-brand/15"
                      >
                        @{handle}
                      </button>
                    ) : (
                      <span key={p} className="rounded-full bg-card px-3 py-1 text-xs font-medium ring-1 ring-line">
                        {p}
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Button variant="ghost" className={cn("flex-1 rounded-full")} onClick={() => setLightbox(null)}>
                  Close
                </Button>
                <Button
                  variant="ghost"
                  className="gap-1.5 rounded-full text-red-600"
                  onClick={() => onDelete(lightbox.id)}
                >
                  <Trash2 size={14} />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
