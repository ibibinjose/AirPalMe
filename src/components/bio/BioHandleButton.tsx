import type { MouseEvent } from "react";
import { useLocation } from "wouter";
import { bioButtonLabel, bioPath, normalizeHandle } from "@shared/bio";
import { cn } from "@/lib/cn";

export function BioHandleButton({
  handle,
  className,
}: {
  handle?: string;
  onHero?: boolean;
  className?: string;
}) {
  const [, nav] = useLocation();
  const h = handle ? normalizeHandle(handle) : "";
  if (!h) return null;
  return (
    <button
      type="button"
      aria-label={bioButtonLabel(h)}
      onClick={(e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        nav(bioPath(h));
      }}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm",
        className,
      )}
    >
      <img src="/logo-mark.png" alt="" className="h-5 w-5 object-contain" />
    </button>
  );
}
