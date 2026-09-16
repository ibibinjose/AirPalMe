import { useEffect } from "react";

let lockCount = 0;

export function getLockCount(): number {
  return lockCount;
}

export function lockBodyScroll(): void {
  lockCount += 1;
  if (lockCount === 1 && typeof document !== "undefined") {
    document.body.style.overflow = "hidden";
  }
}

export function unlockBodyScroll(): void {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0 && typeof document !== "undefined") {
    document.body.style.overflow = "";
  }
}

/**
 * Resets all body scroll locks unconditionally.
 * Call this on page navigation and route unmount safety paths.
 */
export function forceUnlockBodyScroll(): void {
  lockCount = 0;
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }
}

/**
 * Reference-counted body scroll lock hook.
 * Prevents multiple modals/sheets from fighting over body.style.overflow.
 * Restores scrolling only when all locking components have unmounted or closed.
 */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [locked]);
}
