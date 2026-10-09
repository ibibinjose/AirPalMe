import { useLocation } from "wouter";
import { cn } from "@/lib/cn";
import { BRAND_TAGLINE } from "@/lib/brand";
import { isPassApp } from "@/lib/app-flavor";

export type BrandMarkMode = "auto" | "master" | "me" | "pass";

export interface BrandMarkProps {
  compact?: boolean;
  invert?: boolean;
  withTagline?: boolean;
  mode?: BrandMarkMode;
  className?: string;
}

export function BrandMark({
  compact = false,
  invert = false,
  withTagline = false,
  mode = "auto",
  className,
}: BrandMarkProps) {
  const [location] = useLocation();

  let resolvedMode: "master" | "me" | "pass" = "me";
  if (mode !== "auto") {
    resolvedMode = mode;
  } else if (
    isPassApp() ||
    location === "/pass" ||
    location.startsWith("/pass/") ||
    location.startsWith("/events") ||
    location.startsWith("/e/") ||
    location.startsWith("/deals") ||
    location.startsWith("/me/tickets") ||
    location.startsWith("/ticket/") ||
    location === "/event" ||
    location.startsWith("/event/") ||
    location.startsWith("/scan")
  ) {
    resolvedMode = "pass";
  } else if (
    location === "/about" ||
    location === "/trust" ||
    location === "/terms" ||
    location === "/privacy" ||
    location === "/business" ||
    location === "/partners" ||
    location === "/founders"
  ) {
    resolvedMode = "master";
  } else {
    resolvedMode = "me";
  }

  const logoSrc = {
    master: invert ? "/brand/airpal-logo-white.png" : "/brand/airpal-logo.png",
    me: invert ? "/brand/airpal-me-logo-white.png" : "/brand/airpal-me-logo.png",
    pass: invert ? "/brand/airpal-pass-logo-white.png" : "/brand/airpal-pass-logo.png",
  }[resolvedMode];

  const brandAlt = {
    master: "AirPal",
    me: "AirPal Me",
    pass: "AirPal Pass",
  }[resolvedMode];

  if (compact) {
    return (
      <span className={cn("inline-flex items-center shrink-0 select-none", className)}>
        <img
          src={invert ? "/brand/airpal-mark-white.png" : "/logo-mark.png"}
          alt={brandAlt}
          className="h-8 w-8 object-contain shrink-0"
        />
        <span className="sr-only">{brandAlt}</span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5 shrink-0 select-none", className)}>
      <img
        src="/logo-mark.png"
        alt=""
        className={cn(
          "rounded-xl bg-white object-contain shrink-0 shadow-2xs ring-1 ring-line/60",
          invert && "ring-white/20",
          "h-8.5 w-8.5 p-0.5 sm:h-9 sm:w-9 sm:p-1",
        )}
      />
      <div className="flex flex-col text-left justify-center min-w-0">
        <img
          src={logoSrc}
          alt={brandAlt}
          className={cn(
            "w-auto object-contain shrink-0 transition-opacity",
            resolvedMode === "pass" ? "h-5 sm:h-6" : "h-6 sm:h-7",
          )}
        />
        {withTagline && (
          <span
            className={cn(
              "text-[9.5px] font-semibold tracking-wider uppercase mt-0.5 leading-none",
              invert ? "text-white/75" : "text-accent",
            )}
          >
            {BRAND_TAGLINE}
          </span>
        )}
        <span className="sr-only">{brandAlt}</span>
      </div>
    </span>
  );
}

