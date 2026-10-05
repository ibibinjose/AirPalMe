/** Responsive variants for bundled `/media/*.jpg` art. Each has `-800.webp`
 * (800px) and `-full.webp` (original width) siblings; the `.jpg` stays the
 * `src` fallback for browsers without WebP. Remote URLs pass through as
 * `undefined` (no variants exist for them). */

const FULL_WIDTHS: Record<string, number> = {
  campus: 1400,
  harbour: 1600,
  laneway: 1400,
  room: 1400,
  walk: 1400,
};

export function mediaSrcSet(src: string | undefined): string | undefined {
  const name = src?.match(/^\/media\/([a-z-]+)\.jpg$/)?.[1];
  const full = name ? FULL_WIDTHS[name] : undefined;
  if (!name || !full) return undefined;
  return `/media/${name}-800.webp 800w, /media/${name}-full.webp ${full}w`;
}
