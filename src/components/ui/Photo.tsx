import { useMediaSrc } from "@/hooks/useMediaSrc";

export function Photo({
  src,
  alt = "",
  className,
  position,
  priority = false,
}: {
  src?: string;
  alt?: string;
  className?: string;
  position?: string;
  /** Above-the-fold hero: eager load with high fetch priority (improves LCP). */
  priority?: boolean;
}) {
  const resolved = useMediaSrc(src);
  const current = resolved || (src && !src.startsWith("idb:") ? src : undefined);
  if (!current) return <div className={className} />;
  return (
    <img
      src={current}
      alt={alt}
      className={className}
      style={position ? { objectPosition: position } : undefined}
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
