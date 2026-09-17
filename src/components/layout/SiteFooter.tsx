import { ArrowUp, Globe, Smartphone } from "lucide-react";
import { Link } from "wouter";
import { BrandMark } from "@/components/brand/BrandMark";
import { LEGAL } from "@/lib/legal";
import { getNativePlatform, isNativeApp, triggerHaptic } from "@/lib/native";
import { getBuildInfo } from "@/lib/build-info";
import { openDebugOverlay } from "@/components/debug/DebugInfoOverlay";
import { cn } from "@/lib/cn";

const NAV_EXPLORE = [
  { href: "/", label: "Discover" },
  { href: "/mate", label: "Mate" },
  { href: "/experiences", label: "Experiences" },
  { href: "/calendar", label: "Events" },
  { href: "/guide", label: "Tours" },
  { href: "/club", label: "Club" },
  { href: "/plan/new", label: "New Plan" },
  { href: "/companion", label: "Become an AirPal" },
];

const NAV_HOSPITALITY = [
  { href: "/studio", label: "Studio" },
  { href: "/concierge", label: "Concierge" },
  { href: "/solutions", label: "Solutions" },
  { href: "/partners", label: "Partners" },
  { href: "/host", label: "Host" },
  { href: "/join", label: "Join" },
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
        "mt-16 border-t-2 border-ink bg-paper px-4 pt-10 md:px-6",
        hasTabBar
          ? "pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:pb-10"
          : "pb-[max(2rem,env(safe-area-inset-bottom,0px))]",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-8">
          {/* Brand & Description Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center transition hover:opacity-85" aria-label="AirPal Home">
              <BrandMark compact={false} withTagline />
            </Link>

            <p className="mt-3 max-w-md text-sm text-mute leading-relaxed">
              Life Made Easy. People, places, things and experiences — made easier.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {/* Platform badge (display only — build version below opens diagnostics) */}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/25 bg-card px-3 py-1 text-xs text-mute select-none">
                {isNative ? (
                  <>
                    <Smartphone size={12} className="text-gold" />
                    <span className="capitalize">{platform === "ios" ? "iOS App" : "Android App"}</span>
                  </>
                ) : (
                  <>
                    <Globe size={12} className="text-gold" />
                    <span>Web</span>
                  </>
                )}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/25 bg-card px-3 py-1 text-xs text-mute select-none">
                Built in Australia
              </span>
            </div>
          </div>

          {/* Links Grid: 2 columns on mobile, 3 columns on sm/md/lg */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-3 lg:grid-cols-3">
            {/* Explore Column */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Explore</p>
              <ul className="mt-3.5 space-y-2.5 text-sm">
                {NAV_EXPLORE.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-mute transition hover:text-ink">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Stays & Hospitality Column */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Stays & Business</p>
              <ul className="mt-3.5 space-y-2.5 text-sm">
                {NAV_HOSPITALITY.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-mute transition hover:text-ink">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal & Trust Column */}
            <div className="col-span-2 sm:col-span-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Trust & Legal</p>
              <ul className="mt-3.5 flex flex-wrap gap-x-4 gap-y-2 text-sm sm:flex-col sm:space-y-2.5 sm:gap-0">
                {NAV_LEGAL.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-mute transition hover:text-ink">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-line/60 pt-5 text-xs text-mute sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center sm:text-left">
            <span>
              © {new Date().getFullYear()} {LEGAL.byline}
            </span>
            <span>·</span>
            <span className="text-mute/80">{LEGAL.location}</span>
            <span>·</span>
            <button
              type="button"
              onClick={openDebugOverlay}
              className="font-mono text-[11px] text-mute/80 hover:text-ink transition hover:underline cursor-pointer"
              title="App diagnostics & debug info (from build.gradle)"
            >
              v{buildInfo.versionName}
            </button>
          </div>

          <button
            type="button"
            onClick={handleScrollTop}
            className="flex items-center gap-1.5 rounded-full border border-ink/25 bg-card px-3 py-1 text-xs font-medium text-mute shadow-xs transition hover:border-ink hover:text-ink active:scale-95"
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
