export type CropView = {
  imageW: number;
  imageH: number;
  viewW: number;
  viewH: number;
  /** Displayed width / natural width. */
  scale: number;
  /** Image left in view coordinates (usually ≤ 0). */
  originX: number;
  originY: number;
};

export type SourceRect = { x: number; y: number; w: number; h: number };

export function minCoverScale(imageW: number, imageH: number, viewW: number, viewH: number) {
  if (imageW <= 0 || imageH <= 0 || viewW <= 0 || viewH <= 0) return 1;
  return Math.max(viewW / imageW, viewH / imageH);
}

export function clampOrigin(view: CropView) {
  const dw = view.imageW * view.scale;
  const dh = view.imageH * view.scale;
  const minX = Math.min(0, view.viewW - dw);
  const minY = Math.min(0, view.viewH - dh);
  return {
    originX: Math.min(0, Math.max(minX, view.originX)),
    originY: Math.min(0, Math.max(minY, view.originY)),
  };
}

export function centeredOrigin(imageW: number, imageH: number, viewW: number, viewH: number, scale: number) {
  return clampOrigin({
    imageW,
    imageH,
    viewW,
    viewH,
    scale,
    originX: (viewW - imageW * scale) / 2,
    originY: (viewH - imageH * scale) / 2,
  });
}

export function sourceRect(view: CropView): SourceRect {
  const { originX, originY } = clampOrigin(view);
  const w = view.viewW / view.scale;
  const h = view.viewH / view.scale;
  return {
    x: Math.max(0, -originX / view.scale),
    y: Math.max(0, -originY / view.scale),
    w: Math.min(view.imageW, w),
    h: Math.min(view.imageH, h),
  };
}

export function outputSize(rect: SourceRect, maxEdge: number) {
  const long = Math.max(rect.w, rect.h);
  const factor = long > maxEdge ? maxEdge / long : 1;
  return {
    w: Math.max(1, Math.round(rect.w * factor)),
    h: Math.max(1, Math.round(rect.h * factor)),
  };
}
