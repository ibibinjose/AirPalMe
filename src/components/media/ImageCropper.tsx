import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { centeredOrigin, clampOrigin, minCoverScale, type CropView } from "@shared/image-crop";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { rasterizeCrop } from "@/lib/image-store";

export function ImageCropper({
  image,
  aspect,
  title,
  maxEdge,
  onCancel,
  onConfirm,
}: {
  image: HTMLImageElement;
  aspect: number;
  title: string;
  maxEdge: number;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [viewW, setViewW] = useState(320);
  const viewH = Math.round(viewW / aspect);
  const min = useMemo(
    () => minCoverScale(image.naturalWidth, image.naturalHeight, viewW, viewH),
    [image, viewH, viewW],
  );
  const [scale, setScale] = useState(min);
  const [origin, setOrigin] = useState(() =>
    centeredOrigin(image.naturalWidth, image.naturalHeight, viewW, viewH, min),
  );
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const measure = () => {
      const w = Math.min(el.clientWidth, 560);
      setViewW(Math.max(220, w));
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    setScale(min);
    setOrigin(centeredOrigin(image.naturalWidth, image.naturalHeight, viewW, viewH, min));
  }, [image, min, viewH, viewW]);

  const view: CropView = {
    imageW: image.naturalWidth,
    imageH: image.naturalHeight,
    viewW,
    viewH,
    scale,
    originX: origin.originX,
    originY: origin.originY,
  };

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: origin.originX, oy: origin.originY };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const next = clampOrigin({
      ...view,
      originX: drag.current.ox + (e.clientX - drag.current.x),
      originY: drag.current.oy + (e.clientY - drag.current.y),
    });
    setOrigin(next);
  }

  function onZoom(nextScale: number) {
    const s = Math.min(min * 4, Math.max(min, nextScale));
    const cx = viewW / 2;
    const cy = viewH / 2;
    const imgX = (cx - origin.originX) / scale;
    const imgY = (cy - origin.originY) / scale;
    setScale(s);
    setOrigin(
      clampOrigin({
        ...view,
        scale: s,
        originX: cx - imgX * s,
        originY: cy - imgY * s,
      }),
    );
  }

  async function confirm() {
    setBusy(true);
    try {
      const blob = await rasterizeCrop(image, { ...view, ...clampOrigin(view) }, maxEdge);
      onConfirm(blob);
    } catch (err) {
      setBusy(false);
      toast.error(err instanceof Error ? err.message : "Could not crop");
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-ink/50" aria-label="Close" onClick={onCancel} />
      <div className="modal-safe relative z-10 w-full max-w-lg rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Photo</p>
        <h2 className="font-display mt-1 text-2xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-mute">Drag to position. Zoom to crop. We keep a compressed copy.</p>
        <div ref={frame} className="mt-4">
          <div
            className="relative mx-auto touch-none overflow-hidden rounded-2xl bg-ink ring-1 ring-line"
            style={{ width: viewW, height: viewH }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          >
            <img
              src={image.src}
              alt=""
              draggable={false}
              className="absolute max-w-none select-none"
              style={{
                width: image.naturalWidth * scale,
                height: image.naturalHeight * scale,
                left: origin.originX,
                top: origin.originY,
              }}
            />
          </div>
        </div>
        <label className="mt-4 block">
          <span className="text-[12px] text-mute">Zoom</span>
          <input
            type="range"
            min={min}
            max={min * 4}
            step={min / 40}
            value={scale}
            onChange={(e) => onZoom(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <div className="mt-4 flex gap-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={busy}
            loading={busy}
            onClick={() => {
              void confirm().catch(() => undefined);
            }}
          >
            {busy ? "Saving…" : "Use photo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
