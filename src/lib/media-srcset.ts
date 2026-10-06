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

/**
 * Downsize remote Unsplash images to the rendered width. Seed data ships
 * `w=1200` originals; cards render at ~170–400px, so serving 1200px wastes
 * ~10x bytes. Non-Unsplash URLs pass through untouched.
 */
export function sizedImageUrl(src: string | undefined, width: number): string | undefined {
  if (!src) return undefined;
  if (!src.includes("images.unsplash.com")) return src;
  try {
    const url = new URL(src);
    url.searchParams.set("w", String(width));
    return url.toString();
  } catch {
    return src;
  }
}
