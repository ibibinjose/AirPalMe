import { useMediaSrc } from "@/hooks/useMediaSrc";
import { sizedImageUrl } from "@/lib/media-srcset";

export function Photo({
  src,
  alt = "",
  className,
  position,
  priority = false,
  thumb = false,
  srcSet,
  sizes,
}: {
  src?: string;
  alt?: string;
  className?: string;
  position?: string;
  /** Above-the-fold hero: eager load with high fetch priority (improves LCP). */
  priority?: boolean;
  /** Card-sized render: downsize remote images to 600px (seed originals are 1200px). */
  thumb?: boolean;
  srcSet?: string;
  sizes?: string;
}) {
  const resolved = useMediaSrc(src);
  const current = resolved || (src && !src.startsWith("idb:") ? src : undefined);
  const display = thumb ? sizedImageUrl(current, 600) : current;
  if (!display) return <div className={className} />;
  return (
    <img
      src={display}
      alt={alt}
      className={className}
      style={position ? { objectPosition: position } : undefined}
      srcSet={srcSet}
      sizes={srcSet ? (sizes ?? "100vw") : undefined}
      referrerPolicy="no-referrer"
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      onError={(e) => {
        const el = e.currentTarget;
        if (el.src.endsWith("/media/harbour.jpg")) return;
        el.src = "/media/harbour.jpg";
      }}
    />
  );
}
