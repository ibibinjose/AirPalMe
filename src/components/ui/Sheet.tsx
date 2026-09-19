import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/lib/cn";

export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center [padding-bottom:var(--keyboard-height,0px)] transition-[padding] duration-200">
      <button
        type="button"
        className="absolute inset-0 bg-ink/50 backdrop-blur-xs"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "scroll-container safe-bottom relative z-10 max-h-[min(88dvh,calc(var(--visual-viewport-height,100dvh)-1.5rem))] w-full rounded-t-3xl bg-card p-5 shadow-2xl sm:max-w-md sm:rounded-3xl transition-all duration-200",
          className,
        )}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" />
        {title && <h2 className="font-display mb-4 text-xl font-semibold">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body,
  );
}
