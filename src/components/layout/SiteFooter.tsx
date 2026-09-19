import { ArrowUp, Smartphone } from "lucide-react";
import { Link } from "wouter";
import { BrandMark } from "@/components/brand/BrandMark";
import { LEGAL } from "@/lib/legal";
import { getNativePlatform, isNativeApp, triggerHaptic } from "@/lib/native";
import { getBuildInfo } from "@/lib/build-info";
import { openDebugOverlay } from "@/components/debug/DebugInfoOverlay";
import { cn } from "@/lib/cn";

const NAV_EXPLORE = [
  { href: "/", label: "Discover" },
  { href: "/circle", label: "Circle" },
  { href: "/plan", label: "Plans" },
  { href: "/experiences", label: "Experiences" },
  { href: "/calendar", label: "Events" },
  { href: "/guide", label: "Tours" },
  { href: "/concierge", label: "Stay" },
];

const NAV_HOSPITALITY = [
  { href: "/join", label: "Register the business" },
  { href: "/business/onboard", label: "Your place" },
  { href: "/plan/new", label: "Create plan" },
  { href: "/event/new", label: "Create event" },
  { href: "/host", label: "Stay host" },
  { href: "/partners", label: "Partners" },
];

const NAV_LEGAL = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
];

interface SiteFooterProps {
  /** When true, adds extra bottom clearance on mobile to prevent overlap with the fixed TabBar */
  hasTabBar?: boolean;
  className?: string;
}

export function SiteFooter({ hasTabBar = true, className }: SiteFooterProps) {
  const platform = getNativePlatform();
  const isNative = isNativeApp();
  const buildInfo = getBuildInfo();

  const handleScrollTop = () => {
    void triggerHaptic("light");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer
      role="contentinfo"
      className={cn(
        "mt-16 rounded-t-[28px] bg-ink text-white",
        "border-t border-white/10",
        hasTabBar
          ? "pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:pb-8"
          : "pb-[max(2rem,env(safe-area-inset-bottom,0px))]",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl px-5 pt-10 md:px-8 md:pt-12">
        {/* Brand row */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/" className="inline-flex items-center transition hover:opacity-85" aria-label="AirPal Home">
              <BrandMark compact={false} invert withTagline />
            </Link>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/65 md:max-w-none md:whitespace-nowrap">
              Life Made Easy. People, places, things and experiences — made easier.
            </p>
          </div>

          {isNative && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-xs font-medium text-white/70 select-none ring-1 ring-white/10">
                <Smartphone size={12} className="text-gold" />
                <span className="capitalize">{platform === "ios" ? "iOS App" : "Android App"}</span>
              </span>
            </div>
          )}
        </div>

        {/* Links */}
        <nav aria-label="Footer" className="mt-10 grid grid-cols-2 gap-8 border-t border-white/10 pt-8 sm:grid-cols-3">
          <div>
            <p className="text-[13px] font-semibold text-white/85">Explore</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {NAV_EXPLORE.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-white/55 transition hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-white/85">Stays & Business</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {NAV_HOSPITALITY.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-white/55 transition hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <p className="text-[13px] font-semibold text-white/85">Trust & Legal</p>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2.5 text-sm sm:flex-col sm:gap-0 sm:space-y-2.5">
              {NAV_LEGAL.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-white/55 transition hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 py-6 text-xs text-white/45 sm:flex-row">
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center sm:justify-start sm:text-left">
            <span>
              © {new Date().getFullYear()} {LEGAL.byline}
            </span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={openDebugOverlay}
              className="font-mono text-[11px] text-white/40 transition hover:text-white hover:underline cursor-pointer"
              title="App diagnostics & debug info (from build.gradle)"
            >
              v{buildInfo.versionName}
            </button>
          </p>

          <p className="order-first text-center text-xs font-semibold tracking-wide text-lime-400 sm:order-none">
            Built in Australia · live worldwide
          </p>

          <button
            type="button"
            onClick={handleScrollTop}
            className="flex items-center gap-1.5 rounded-full bg-white/8 px-4 py-2 text-xs font-semibold text-white/75 ring-1 ring-white/10 transition hover:bg-white/15 hover:text-white active:scale-95"
            aria-label="Back to top"
          >
            <ArrowUp size={12} />
            <span>Back to top</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
