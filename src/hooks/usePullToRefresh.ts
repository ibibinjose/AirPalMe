import { useCallback, useEffect, useRef, useState } from "react";
import { triggerHaptic } from "@/lib/native";

export interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
}

export interface PullToRefreshState {
  isPulling: boolean;
  pullDistance: number;
  pullProgress: number; // 0 to 1+
  isRefreshing: boolean;
  isSuccess: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  triggerManualReload: () => Promise<void>;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 68,
  maxPull = 120,
  disabled = false,
}: PullToRefreshOptions): PullToRefreshState {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isArmedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const hapticFiredRef = useRef(false);
  const isRefreshingRef = useRef(false);

  // Keep ref up to date to prevent closure capture issues
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const executeRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setIsPulling(false);
    setPullDistance(52); // Hold at active spinner height

    try {
      await onRefreshRef.current();
      void triggerHaptic("success");
      setIsSuccess(true);
      // Show success checkmark briefly before collapse
      await new Promise((resolve) => setTimeout(resolve, 550));
    } catch (err) {
      console.error("Pull to refresh error:", err);
    } finally {
      setIsSuccess(false);
      setIsRefreshing(false);
      isRefreshingRef.current = false;
      setPullDistance(0);
      hapticFiredRef.current = false;
    }
  }, []);

  const triggerManualReload = useCallback(async () => {
    await executeRefresh();
  }, [executeRefresh]);

  useEffect(() => {
    if (disabled) return;

    const isTopAtRest = () => {
      if (typeof window === "undefined") return false;
      const docTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      return docTop <= 1;
    };

    const isInteractionBlocked = () => {
      if (typeof document === "undefined") return true;
      // Don't intercept if an active modal, sheet, or dialog is open
      if (document.body.classList.contains("scroll-locked")) return true;
      // Don't intercept if virtual keyboard is up
      if (document.documentElement.classList.contains("keyboard-open")) return true;
      // Don't intercept if focused on text input or textarea
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.getAttribute("contenteditable") === "true")
      ) {
        return true;
      }
      return false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current || isInteractionBlocked()) return;
      if (!isTopAtRest()) return;

      const touch = e.touches[0];
      startYRef.current = touch.clientY;
      startXRef.current = touch.clientX;
      isArmedRef.current = true;
      isDraggingRef.current = false;
      hapticFiredRef.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isArmedRef.current || isRefreshingRef.current) return;

      const touch = e.touches[0];
      const diffY = touch.clientY - startYRef.current;
      const diffX = touch.clientX - startXRef.current;

      // If user is swiping horizontally (carousel/tabs), abort pull
      if (!isDraggingRef.current && Math.abs(diffX) > Math.abs(diffY)) {
        isArmedRef.current = false;
        return;
      }

      // If user scrolled down or moved upwards, abort
      if (diffY <= 0) {
        if (isDraggingRef.current) {
          setPullDistance(0);
          setIsPulling(false);
          isDraggingRef.current = false;
        }
        return;
      }

      // Only pull if at the top
      if (!isTopAtRest()) {
        isArmedRef.current = false;
        return;
      }

      // Resistance curve: natural non-linear damping
      isDraggingRef.current = true;
      setIsPulling(true);

      const damping = 0.42;
      const rawDistance = diffY * damping;
      const clamped = Math.min(maxPull, rawDistance);
      setPullDistance(clamped);

      // Trigger light haptic bump when threshold is crossed
      if (clamped >= threshold && !hapticFiredRef.current) {
        hapticFiredRef.current = true;
        void triggerHaptic("light");
      } else if (clamped < threshold) {
        hapticFiredRef.current = false;
      }

      // Prevent native overscroll browser reload on Chrome/Safari when our gesture is handling it
      if (e.cancelable && diffY > 8) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (!isArmedRef.current && !isDraggingRef.current) return;
      isArmedRef.current = false;

      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsPulling(false);

        if (pullDistance >= threshold && !isRefreshingRef.current) {
          void executeRefresh();
        } else {
          setPullDistance(0);
          hapticFiredRef.current = false;
        }
      }
    };

    // Mouse drag support for desktop testing & preview emulation
    let mouseArmed = false;
    let mouseStartY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || isRefreshingRef.current || isInteractionBlocked()) return;
      if (!isTopAtRest()) return;
      // Only arm if clicked in the upper region of the viewport (top 160px)
      if (e.clientY > 160) return;

      mouseArmed = true;
      mouseStartY = e.clientY;
      hapticFiredRef.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseArmed || isRefreshingRef.current) return;
      const diffY = e.clientY - mouseStartY;

      if (diffY <= 0) {
        setPullDistance(0);
        setIsPulling(false);
        return;
      }

      if (!isTopAtRest()) {
        mouseArmed = false;
        return;
      }

      setIsPulling(true);
      const clamped = Math.min(maxPull, diffY * 0.38);
      setPullDistance(clamped);

      if (clamped >= threshold && !hapticFiredRef.current) {
        hapticFiredRef.current = true;
        void triggerHaptic("light");
      }
    };

    const handleMouseUp = () => {
      if (!mouseArmed) return;
      mouseArmed = false;
      setIsPulling(false);

      if (pullDistance >= threshold && !isRefreshingRef.current) {
        void executeRefresh();
      } else {
        setPullDistance(0);
      }
    };

    const options: AddEventListenerOptions = { passive: false };
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, options);
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    window.addEventListener("mousedown", handleMouseDown, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseup", handleMouseUp, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);

      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [disabled, threshold, maxPull, pullDistance, executeRefresh]);

  const pullProgress = threshold > 0 ? Math.min(2, pullDistance / threshold) : 0;

  return {
    isPulling,
    pullDistance,
    pullProgress,
    isRefreshing,
    isSuccess,
    containerRef,
    triggerManualReload,
  };
}
