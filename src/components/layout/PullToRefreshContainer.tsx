import { type ReactNode } from "react";
import { ArrowDown, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PullToRefreshState } from "@/hooks/usePullToRefresh";

export interface PullToRefreshContainerProps {
  state: PullToRefreshState;
  children: ReactNode;
  className?: string;
}

export function PullToRefreshContainer({ state, children, className }: PullToRefreshContainerProps) {
  const { isPulling, pullDistance, pullProgress, isRefreshing, isSuccess } = state;

  const isVisible = pullDistance > 0 || isRefreshing;
  const isThresholdMet = pullProgress >= 1;

  // Icon rotation: 0deg -> 180deg as progress goes from 0 to 1
  const arrowRotation = Math.min(180, pullProgress * 180);

  return (
    <div className={cn("relative flex-1 flex flex-col min-w-0", className)}>
      {/* Pull indicator floating badge */}
      <div
        aria-live="polite"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center transition-opacity duration-200",
          isVisible ? "opacity-100" : "opacity-0",
        )}
        style={{
          transform: `translateY(${Math.max(8, pullDistance * 0.75 - 16)}px)`,
          transition: isPulling ? "none" : "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease-out",
        }}
      >
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-md ring-1 backdrop-blur-md transition-all duration-200",
            isSuccess
              ? "bg-emerald-50 text-emerald-800 ring-emerald-300 dark:bg-emerald-950/90 dark:text-emerald-200 dark:ring-emerald-700"
              : isRefreshing
                ? "bg-card/95 text-ink ring-brand/40"
                : isThresholdMet
                  ? "bg-card/95 text-accent ring-brand/50 scale-105"
                  : "bg-card/90 text-mute ring-line/80",
          )}
        >
          {isSuccess ? (
            <>
              <Check size={14} className="stroke-[2.5] text-emerald-600" />
              <span>Updated</span>
            </>
          ) : isRefreshing ? (
            <>
              <RefreshCw size={13} className="animate-spin text-accent" />
              <span>Reloading data...</span>
            </>
          ) : (
            <>
              <ArrowDown
                size={13}
                style={{
                  transform: `rotate(${arrowRotation}deg)`,
                  transition: isPulling ? "none" : "transform 0.2s ease-out",
                }}
                className={cn("transition-colors", isThresholdMet ? "text-accent" : "text-mute")}
              />
              <span>{isThresholdMet ? "Release to reload" : "Pull to refresh"}</span>
            </>
          )}
        </div>
      </div>

      {/* Main child content with physical pull translation */}
      <div
        className="flex-1 flex flex-col min-w-0"
        style={{
          transform: isVisible ? `translateY(${pullDistance}px)` : undefined,
          transition: isPulling ? "none" : "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
