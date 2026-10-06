import { useRef, useState, type ReactNode } from "react";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { ImageCropper } from "@/components/media/ImageCropper";
import { Photo } from "@/components/ui/Photo";
import { readFileAsImage, storeMedia, type MediaFolder } from "@/lib/image-store";
import { cn } from "@/lib/cn";

export type ImageKind = "avatar" | "cover" | "hero" | "square";

const PRESETS: Record<ImageKind, { aspect: number; maxEdge: number; title: string; hint: string }> = {
  avatar: { aspect: 1, maxEdge: 900, title: "Position your photo", hint: "Square photo or logo" },
  cover: { aspect: 3, maxEdge: 1800, title: "Position cover", hint: "Wide banner" },
  hero: { aspect: 4 / 3, maxEdge: 1600, title: "Position listing photo", hint: "Place photo" },
  square: { aspect: 1, maxEdge: 1400, title: "Position photo", hint: "Square image" },
};

export function ImageField({
  kind,
  value,
  folder = "bios",
  onChange,
  round = false,
  previewClassName,
  align = "start",
  cornerBadge,
  label,
}: {
  kind: ImageKind;
  value?: string;
  folder?: MediaFolder;
  onChange: (src: string | undefined) => void | Promise<void>;
  round?: boolean;
  previewClassName?: string;
  align?: "start" | "center";
  /** Optional overlay (e.g. a profile-kind icon) pinned to the preview's corner. */
  cornerBadge?: ReactNode;
  label?: string;
}) {
  const preset = PRESETS[kind];
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<{ image: HTMLImageElement; url: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file?: File) {
    if (!file) return;
    try {
      const next = await readFileAsImage(file);
      setDraft(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read photo");
    }
  }

  async function confirm(blob: Blob) {
    setBusy(true);
    try {
      const src = await storeMedia(blob, { folder, kind });
      if (draft) URL.revokeObjectURL(draft.url);
      setDraft(null);
      await onChange(src);
      toast.success("Photo kept");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not keep photo");
    } finally {
      setBusy(false);
    }
  }

  const frame = round
    ? cn("overflow-hidden rounded-full ring-1 ring-line", previewClassName || "h-20 w-20")
    : kind === "square"
      ? "aspect-square w-full max-w-sm overflow-hidden rounded-3xl ring-1 ring-line"
      : "h-36 w-full overflow-hidden rounded-3xl ring-1 ring-line sm:h-44";

  return (
    <div>
      {align !== "center" && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-mute">
            {label ||
              (kind === "avatar"
                ? "Photo"
                : kind === "cover"
                  ? "Cover"
                  : kind === "square"
                    ? "Event photo"
                    : "Listing photo")}
          </span>
          <span className="text-[11px] text-mute">{preset.hint}</span>
        </div>
      )}
      <div
        className={cn(
          "relative bg-card",
          round && "flex items-center gap-3 rounded-3xl p-3 ring-1 ring-line",
          round && align === "center" && "flex-col border-0 bg-transparent p-0 ring-0",
        )}
      >
        {value ? (
          <div className={cn("relative", round && "shrink-0")}>
            <div className={cn("relative", frame)}>
              <Photo src={value} className="h-full w-full object-cover" />
            </div>
            {cornerBadge && <div className="absolute -bottom-1 -right-1 z-10">{cornerBadge}</div>}
            {busy && (
              <div className="absolute inset-0 grid place-items-center bg-black/40 text-white">
                <Loader2 size={18} className="animate-spin" />
              </div>
            )}
            {!round && (
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-ink"
                  onClick={() => inputRef.current?.click()}
                >
                  <Camera size={13} />
                  Change
                </button>
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white"
                  onClick={() => void onChange(undefined)}
                  title="Remove"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "grid place-items-center bg-card text-center",
              round
                ? frame
                : kind === "square"
                  ? "aspect-square w-full max-w-sm rounded-3xl ring-1 ring-line"
                  : "h-36 w-full rounded-3xl ring-1 ring-line sm:h-40",
            )}
          >
            {busy ? (
              <Loader2 className="animate-spin text-accent" size={18} />
            ) : (
              <Upload size={18} className="text-mute" />
            )}
            {!round && <span className="mt-2 text-xs text-mute">PNG, JPG, or WEBP. Crop next.</span>}
          </button>
        )}
        {round && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white"
              onClick={() => inputRef.current?.click()}
            >
              <Camera size={13} />
              {value ? "Change" : "Upload"}
            </button>
            {value && (
              <button
                type="button"
                className="rounded-full px-3 py-1.5 text-xs text-mute ring-1 ring-line"
                onClick={() => void onChange(undefined)}
              >
                Remove
              </button>
            )}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void pick(file);
        }}
      />
      {draft && (
        <ImageCropper
          image={draft.image}
          aspect={preset.aspect}
          title={preset.title}
          maxEdge={preset.maxEdge}
          onCancel={() => {
            URL.revokeObjectURL(draft.url);
            setDraft(null);
          }}
          onConfirm={(blob) => {
            void confirm(blob);
          }}
        />
      )}
    </div>
  );
}
