import { useEffect } from "react";
import { useLocation } from "wouter";
import { BedDouble, CalendarDays, Coffee, Compass, ShoppingBag, Ticket, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/brand/BrandMark";
import { setShareMeta } from "@/lib/share-meta";
import { cn } from "@/lib/cn";

const STRIP: Array<{ label: string; icon: typeof Coffee; glow: string; text: string }> = [
  { label: "EAT", icon: UtensilsCrossed, glow: "rgba(251,191,36,0.55)", text: "text-amber-300" },
  { label: "DRINK", icon: Coffee, glow: "rgba(125,211,252,0.55)", text: "text-sky-300" },
  { label: "STAY", icon: BedDouble, glow: "rgba(45,212,191,0.55)", text: "text-teal-300" },
  { label: "PLAN", icon: CalendarDays, glow: "rgba(74,222,128,0.55)", text: "text-green-400" },
  { label: "EVENTS", icon: Ticket, glow: "rgba(192,132,252,0.55)", text: "text-purple-400" },
  { label: "SHOP", icon: ShoppingBag, glow: "rgba(249,168,212,0.55)", text: "text-pink-300" },
  { label: "EXPLORE", icon: Compass, glow: "rgba(96,165,250,0.55)", text: "text-blue-400" },
];

/**
 * AirPal.Me marketing creative (mirrors the classic dark-stage promo):
 * promise kicker, glowing category strip, one-line pill, lifestyle payoff.
 * Rendered in container units so it scales from a phone preview to a crisp
 * 1080×1350 store asset. `?bare=1` strips the page chrome for PNG capture
 * via `npm run screenshots` (see the marketing entry there).
 */
function MarketingPoster() {
  return (
    <div className="@container relative aspect-[4/5] w-full overflow-hidden rounded-[4cqi] bg-[#07090c] text-white ring-1 ring-white/15">
      {/* top glow hairline */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[0.6cqi]"
        style={{ background: "linear-gradient(90deg,#d4af37,#7dd3fc 55%,#d4af37)" }}
      />
      {/* ambient side glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[20cqi] top-[30cqi] h-[50cqi] w-[50cqi] rounded-full opacity-25 blur-3xl"
        style={{ background: "#d4af37" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[20cqi] top-[24cqi] h-[50cqi] w-[50cqi] rounded-full opacity-25 blur-3xl"
        style={{ background: "#2563eb" }}
      />

      <div className="relative flex h-full flex-col px-[6cqi] pb-[5cqi] pt-[6cqi]">
        <p className="text-center font-display text-[4.6cqi] font-bold leading-snug tracking-[0.28em] text-white">
          FIND YOUR PLACE .<br />
          MAKE YOUR PLANS .<br />
          <span className="text-gold">MEET YOUR MATES .</span>
        </p>

        <div className="mt-[4cqi] flex items-start justify-between">
          {STRIP.map((s, i) => (
            <div key={s.label} className="flex flex-1 items-start justify-center">
              <div className="flex flex-col items-center gap-[1.2cqi]">
                <s.icon
                  className={cn("h-[6.5cqi] w-[6.5cqi]", s.text)}
                  strokeWidth={1.6}
                  style={{ filter: `drop-shadow(0 0 1.6cqi ${s.glow})` }}
                />
                <span className="text-[2.5cqi] font-bold tracking-[0.18em] text-white/90">{s.label}</span>
              </div>
              {i < STRIP.length - 1 && <span aria-hidden className="ml-[1cqi] h-[7cqi] w-px bg-white/15" />}
            </div>
          ))}
        </div>

        <div className="mt-[4.5cqi] flex justify-center">
          <p
            className="inline-flex items-center gap-[2cqi] rounded-full border border-gold/70 px-[5cqi] py-[1.8cqi] text-[3.4cqi] font-bold tracking-[0.14em] text-white"
            style={{ boxShadow: "0 0 3cqi rgba(212,175,55,0.35), inset 0 0 2cqi rgba(212,175,55,0.12)" }}
          >
            <img src="/logo-mark.png" alt="" className="h-[4.5cqi] w-[4.5cqi] rounded-[1cqi] bg-white object-contain" />
            LIFE MADE EASY. ALL IN ONE APP.
          </p>
        </div>

        <div className="relative mt-[4cqi] grid flex-1 grid-cols-2 gap-[2.5cqi] overflow-hidden">
          <div className="relative overflow-hidden rounded-[3cqi]">
            <img
              src="/media/harbour.jpg"
              alt="Harbour at golden hour"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-[#07090c] via-transparent to-[#07090c]/60"
            />
          </div>
          <div className="relative overflow-hidden rounded-[3cqi]">
            <img
              src="/media/walk.jpg"
              alt="Mates out on a walk"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-[#07090c] via-transparent to-[#07090c]/60"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-[3.5cqi]">
          <BrandMark compact invert />
          <p className="font-display text-[3.6cqi] font-bold tracking-tight">
            AirPal<span className="text-gold">.me</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function MarketingPage() {
  const [, nav] = useLocation();
  const bare = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("bare") === "1";

  useEffect(() => {
    setShareMeta({
      title: "AirPal.Me · Your world, all in one app",
      description: "Find your place. Make your plans. Meet your mates. Life Made Easy with AirPal.Me.",
      image: "/brand/og-share-preview.jpg",
      url: "https://airpal.me/marketing",
    });
  }, []);

  if (bare) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#07090c] p-0">
        <div className="marketing-poster w-[min(100vw,125vh)]">
          <MarketingPoster />
        </div>
      </div>
    );
  }

  const pageUrl = typeof window !== "undefined" ? window.location.href : "https://airpal.me/marketing";

  return (
    <div className="mx-auto max-w-xl px-4 pb-28 pt-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Marketing</p>
      <h1 className="font-display mt-1 text-balance text-3xl font-bold tracking-tight text-ink md:text-4xl">
        Your world, all in one app
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-mute">
        The AirPal.Me promo creative — share the link anywhere, or export a crisp 1080×1350 PNG for the stores with{" "}
        <span className="font-mono text-[13px] text-ink">npm run screenshots</span>.
      </p>

      <div className="mx-auto mt-5 max-w-[420px]">
        <MarketingPoster />
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(pageUrl);
            } catch {
              /* clipboard unavailable */
            }
          }}
          className="h-12 rounded-full"
        >
          Copy creative link
        </Button>
        <Button variant="ghost" onClick={() => nav("/getAirPal")} className="h-12 rounded-full border border-line">
          Get the app
        </Button>
      </div>
    </div>
  );
}
