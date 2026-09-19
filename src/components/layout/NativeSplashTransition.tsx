import { useEffect, useState } from "react";
import { hideNativeSplash } from "@/lib/native";
import { BRAND_TAGLINE } from "@/lib/brand";

interface NativeSplashTransitionProps {
  /**
   * How long the branded splash is held visible after providers finish mounting before starting fade (ms).
   * Default: 250ms.
   */
  holdDuration?: number;
  /**
   * Fade out animation duration (ms).
   * Default: 350ms.
   */
  fadeDuration?: number;
}

/**
 * Branded fade-out transition for the native splash screen.
 * Mounts after AppProviders finish initialization, coordinates with Capacitor's
 * SplashScreen plugin to fade out the native splash window, and smoothly dissolves
 * the branded overlay into the app shell.
 */
export function NativeSplashTransition({ holdDuration = 250, fadeDuration = 350 }: NativeSplashTransitionProps) {
  const [mounted, setMounted] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // When AppProviders finish mounting, tell native layer to smoothly fade out the OS splash
    void hideNativeSplash({ fadeOutDuration: fadeDuration });

    // Hold the branded overlay briefly for visual continuity, then fade out
    const holdTimer = setTimeout(() => {
      setFading(true);
      const unmountTimer = setTimeout(() => {
        setMounted(false);
      }, fadeDuration);
      return () => clearTimeout(unmountTimer);
    }, holdDuration);

    return () => clearTimeout(holdTimer);
  }, [holdDuration, fadeDuration]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      id="native-splash-transition"
      data-testid="native-splash-transition"
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#FAF8F5] pointer-events-none select-none transition-opacity ease-out"
      style={{
        opacity: fading ? 0 : 1,
        transitionDuration: `${fadeDuration}ms`,
      }}
    >
      <div className="flex flex-col items-center justify-center text-center px-6">
        <div className="relative mb-3.5">
          <img
            src="/logo-mark.png"
            alt="AirPal"
            className="h-16 w-16 rounded-2xl bg-white shadow-md object-contain p-1.5 ring-1 ring-black/5"
          />
        </div>
        <div className="font-display text-2xl font-bold tracking-tight text-ink">
          AirPal<span className="text-brand">.me</span>
        </div>
        <div className="text-[11px] font-semibold tracking-widest uppercase text-gold mt-1.5">{BRAND_TAGLINE}</div>
      </div>
    </div>
  );
}
