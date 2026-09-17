import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, BadgePercent, CalendarDays, Gift, MapPin, Share2, Star, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { SectionHead } from "@/components/ui/SectionHead";
import { makeQrDataUrl } from "@/lib/qr";
import { cn } from "@/lib/cn";

/**
 * Public promotion page: AirPal.Me/getAirPal (also /GetAirPal).
 * Fill in the store URLs once the listings are live.
 */
const APP_STORE_URL = "#";
const PLAY_STORE_URL = "#";
const PAGE_URL = "https://airpal.me/getAirPal";

function StoreBadge({ store, href, dark, compact }: { store: "apple" | "play"; href: string; dark?: boolean; compact?: boolean }) {
  const comingSoon = href === "#";
  return (
    <a
      href={href}
      onClick={comingSoon ? (e) => e.preventDefault() : undefined}
      aria-label={store === "apple" ? "Download on the App Store" : "Get it on Google Play"}
      className={cn(
        "flex items-center gap-3 rounded-card border-2 border-ink bg-ink px-4 py-3 text-white shadow-card transition-transform hover:-translate-y-0.5",
        dark && "border-white/25 shadow-pop",
        compact && "gap-2 px-3 py-2.5",
      )}
    >
      {store === "apple" ? (
        <svg viewBox="0 0 24 24" width={compact ? 22 : 26} height={compact ? 22 : 26} fill="currentColor" aria-hidden className="shrink-0">
          <path d="M17.05 12.54c-.03-2.89 2.36-4.28 2.47-4.34-1.35-1.97-3.44-2.24-4.18-2.27-1.78-.18-3.47 1.05-4.37 1.05-.9 0-2.29-1.02-3.77-1-1.94.03-3.72 1.13-4.72 2.86-2.01 3.49-.51 8.66 1.45 11.5.96 1.39 2.1 2.94 3.6 2.88 1.45-.06 2-.93 3.75-.93s2.24.93 3.77.9c1.56-.03 2.55-1.41 3.5-2.81 1.1-1.61 1.55-3.17 1.58-3.25-.04-.02-3.03-1.16-3.08-4.59zM14.16 4.06c.8-.97 1.34-2.32 1.19-3.66-1.15.05-2.55.77-3.38 1.74-.74.86-1.39 2.23-1.22 3.55 1.29.1 2.6-.65 3.41-1.63z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width={compact ? 20 : 24} height={compact ? 20 : 24} fill="currentColor" aria-hidden className="shrink-0">
          <path d="M3.6 2.3c-.3.3-.5.8-.5 1.4v16.6c0 .6.2 1.1.5 1.4l.1.1 9.3-9.3v-.2L3.7 2.2l-.1.1z" opacity=".9" />
          <path d="M16.8 15.9l-3.8-3.8v-.2l3.8-3.8.1.1 4.5 2.6c1.3.7 1.3 1.9 0 2.6l-4.5 2.6-.1-.1z" opacity=".9" />
          <path d="M16.9 15.8L13 11.9 4.1 20.6c.4.4 1 .4 1.7 0l11.1-4.8z" opacity=".9" />
          <path d="M16.9 8.1L5.8 3.3c-.7-.4-1.3-.4-1.7 0l8.9 8.7 3.9-3.9z" opacity=".9" />
        </svg>
      )}
      <span className="min-w-0 text-left leading-tight">
        <span className={cn("block uppercase tracking-wider opacity-70", compact ? "text-[9px]" : "text-[10px]")}>
          {store === "apple" ? "Download on the" : "Get it on"}
        </span>
        <span className={cn("block truncate font-bold", compact ? "text-sm" : "text-base")}>
          {store === "apple" ? "App Store" : "Google Play"}
          {comingSoon && <span className="ml-1.5 rounded bg-white/20 px-1.5 py-0.5 text-[10px]">Soon</span>}
        </span>
      </span>
    </a>
  );
}

const STEPS = [
  { n: "1", icon: MapPin, title: "Find your place", desc: "Stays, cafés and corners near you, with verified photos.", tint: "bg-emerald-500/10 text-emerald-700" },
  { n: "2", icon: CalendarDays, title: "Make the plan", desc: "Invite mates, vote on stops, keep everyone in the loop.", tint: "bg-brand/10 text-brand" },
  { n: "3", icon: Gift, title: "Win & save", desc: "Enter giveaways, claim perks, show them at the till.", tint: "bg-amber-500/10 text-amber-700" },
];

export function GetAirPalPage() {
  const [qr, setQr] = useState<string>("");

  useEffect(() => {
    void makeQrDataUrl(PAGE_URL, 240).then(setQr).catch(() => undefined);
  }, []);

  async function share() {
    const data = { title: "Get AirPal", text: "Life Made Easy — find places, make plans, meet mates.", url: PAGE_URL };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(PAGE_URL);
      toast.success("Link copied — share it anywhere.");
    } catch {
      /* dismissed */
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="flex items-center gap-1 text-[13px] font-medium text-mute">
        <ArrowLeft size={14} /> Explore
      </Link>

      {/* Hero — brand blue, white type */}
      <section className="relative mt-4 overflow-hidden rounded-hero bg-brand px-6 py-8 text-center text-white shadow-pop sm:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-12 h-64 w-64 rounded-full bg-brand-ink/60"
        />
        <img
          src="/logo-mark.png"
          alt="AirPal"
          className="relative mx-auto h-20 w-20 rounded-card border-2 border-white/40 bg-white shadow-pop"
        />
        <p className="relative mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
          Life Made Easy
        </p>
        <h1 className="font-display relative mx-auto mt-1 max-w-md text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Get AirPal
        </h1>
        <p className="relative mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-white/85">
          Find places, make plans, meet mates — plus local deals, events, and giveaways across Kerala.
        </p>
        <div className="relative mx-auto mt-6 grid max-w-sm grid-cols-2 gap-2">
          <StoreBadge store="apple" href={APP_STORE_URL} dark compact />
          <StoreBadge store="play" href={PLAY_STORE_URL} dark compact />
          <Link href="/" className="col-span-2">
            <span className="block rounded-card border-2 border-white/40 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-white/10">
              Continue in the browser →
            </span>
          </Link>
        </div>
      </section>

      {/* How it gets easy */}
      <section className="mt-8">
        <SectionHead kicker="How it works" title="Easy looks like this" />
        <div className="mt-3 space-y-2">
          {STEPS.map((s) => (
            <div key={s.n} className="flex items-center gap-3 rounded-card border-2 border-ink bg-card p-3.5 shadow-card">
              <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", s.tint)}>
                <s.icon size={19} strokeWidth={2.2} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight">
                  <span className="mr-1.5 text-mute">{s.n}.</span> {s.title}
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-mute">{s.desc}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Giveaways teaser */}
      <section className="mt-6 rounded-hero border-2 border-gold bg-card p-5 shadow-card">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
          <Star size={13} /> Discover. Experience. Win.
        </p>
        <p className="font-display mt-1 text-balance text-2xl font-bold leading-[1.1] tracking-tight">
          Weekly giveaways from local partners.
        </p>
        <p className="mt-1 text-sm leading-relaxed text-mute">Free to enter. Entry never guarantees winning.</p>
        <Link href="/giveaways">
          <Button className="mt-3">
            <Gift size={15} /> Browse giveaways <ArrowRight size={14} />
          </Button>
        </Link>
      </section>

      {/* Business strip */}
      <section className="mt-6 rounded-hero bg-ink p-5 text-white shadow-card">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
          <Store size={13} /> For local business
        </p>
        <p className="font-display mt-1 text-balance text-2xl font-bold leading-[1.1] tracking-tight">
          Put your venue on the map. Free to list.
        </p>
        <Link href="/start?role=business">
          <span className="mt-3 inline-block rounded-card bg-white px-4 py-2.5 text-sm font-bold text-ink transition hover:-translate-y-0.5">
            List your business →
          </span>
        </Link>
      </section>

      {/* QR + share */}
      <section className="mx-auto mt-6 max-w-sm rounded-hero border-2 border-ink bg-card p-5 text-center shadow-card">
        {qr ? (
          <img src={qr} alt="QR code for AirPal.Me/getAirPal" className="mx-auto h-44 w-44 rounded-xl border-2 border-ink/10" />
        ) : (
          <div className="mx-auto grid h-44 w-44 place-items-center text-xs text-mute">Loading QR…</div>
        )}
        <p className="mt-2 text-xs text-mute">Scan to open this page on your phone</p>
        <Button onClick={share} variant="ghost" className="mt-2 w-full border-2 border-ink">
          <Share2 size={14} /> Share AirPal.Me
        </Button>
      </section>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-mute">
        <BadgePercent size={13} /> Free to download · Free to list your business
      </p>
    </div>
  );
}
