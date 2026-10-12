import { useState } from "react";
import { Sparkles, Ticket } from "lucide-react";
import { cn } from "@/lib/cn";

export interface EventCoverGlowProps {
  src?: string;
  alt: string;
  themeColor?: string;
  className?: string;
  aspectRatio?: "square" | "video";
}

export function EventCoverGlow({ src, alt, themeColor, className, aspectRatio = "square" }: EventCoverGlowProps) {
  const [loaded, setLoaded] = useState(false);
  const aspectClass = aspectRatio === "square" ? "aspect-square" : "aspect-[16/9]";

  return (
    <div className={cn("relative group w-full select-none", className)}>
      {/* Ambient Theme Color Glow */}
      {themeColor && (
        <div
          aria-hidden="true"
          className="absolute -inset-2 sm:-inset-4 rounded-[36px] blur-3xl opacity-30 dark:opacity-40 pointer-events-none -z-20 transition-all duration-700"
          style={{ backgroundColor: themeColor }}
        />
      )}

      {/* Ambient Image Glow halo underneath */}
      {src && (
        <div
          aria-hidden="true"
          className={cn(
            "absolute -inset-1.5 sm:-inset-2 rounded-[32px] sm:rounded-[36px] overflow-hidden opacity-35 dark:opacity-45 blur-2xl saturate-150 transition-opacity duration-500 pointer-events-none -z-10",
            loaded ? "opacity-35 dark:opacity-45" : "opacity-0",
          )}
        >
          <img src={src} alt="" className="h-full w-full object-cover transform scale-110" loading="eager" />
        </div>
      )}

      {/* Main Card Media */}
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-[26px] sm:rounded-[30px] bg-paper ring-1 ring-line/70 shadow-clay",
          aspectClass,
        )}
      >
        {src ? (
          <>
            <img
              src={src}
              alt={alt}
              onLoad={() => setLoaded(true)}
              className={cn(
                "h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]",
                loaded ? "opacity-100" : "opacity-0",
              )}
            />
            {/* Subtle gloss highlight on the top edge (Apple Liquid Glass) */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20 pointer-events-none" />
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-brand/20 via-paper to-amber-500/10 p-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-card shadow-sm ring-1 ring-line text-accent">
              <Ticket size={28} />
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1">
              <Sparkles size={12} /> AirPal Experience
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
