import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  BadgePercent,
  CheckCircle2,
  Compass,
  Copy,
  ExternalLink,
  Globe,
  MoreVertical,
  Plane,
  PlusSquare,
  Share2,
  ShieldCheck,
  Shirt,
  Smartphone,
  Sparkles,
  Users,
  Bed,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { makeQrDataUrl } from "@/lib/qr";

const APP_STORE_URL = "#";
const PLAY_STORE_URL = "#";
const PAGE_URL = "https://airpal.me/getAirPal";

function StoreBadge({ store, href }: { store: "apple" | "play"; href: string }) {
  const comingSoon = href === "#";
  return (
    <a
      href={href}
      onClick={comingSoon ? (e) => e.preventDefault() : undefined}
      aria-label={store === "apple" ? "Download on the App Store" : "Get it on Google Play"}
      className="group relative flex items-center gap-3 rounded-2xl border-2 border-ink bg-ink px-5 py-3 text-white transition hover:bg-neutral-800 active:scale-[0.98]"
    >
      {store === "apple" ? (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden className="shrink-0">
          <path d="M17.05 12.54c-.03-2.89 2.36-4.28 2.47-4.34-1.35-1.97-3.44-2.24-4.18-2.27-1.78-.18-3.47 1.05-4.37 1.05-.9 0-2.29-1.02-3.77-1-1.94.03-3.72 1.13-4.72 2.86-2.01 3.49-.51 8.66 1.45 11.5.96 1.39 2.1 2.94 3.6 2.88 1.45-.06 2-.93 3.75-.93s2.24.93 3.77.9c1.56-.03 2.55-1.41 3.5-2.81 1.1-1.61 1.55-3.17 1.58-3.25-.04-.02-3.03-1.16-3.08-4.59zM14.16 4.06c.8-.97 1.34-2.32 1.19-3.66-1.15.05-2.55.77-3.38 1.74-.74.86-1.39 2.23-1.22 3.55 1.29.1 2.6-.65 3.41-1.63z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden className="shrink-0">
          <path d="M3.6 2.3c-.3.3-.5.8-.5 1.4v16.6c0 .6.2 1.1.5 1.4l.1.1 9.3-9.3v-.2L3.7 2.2l-.1.1z" opacity=".9" />
          <path d="M16.8 15.9l-3.8-3.8v-.2l3.8-3.8.1.1 4.5 2.6c1.3.7 1.3 1.9 0 2.6l-4.5 2.6-.1-.1z" opacity=".9" />
          <path d="M16.9 15.8L13 11.9 4.1 20.6c.4.4 1 .4 1.7 0l11.1-4.8z" opacity=".9" />
          <path d="M16.9 8.1L5.8 3.3c-.7-.4-1.3-.4-1.7 0l8.9 8.7 3.9-3.9z" opacity=".9" />
        </svg>
      )}
      <span className="text-left leading-tight">
        <span className="block text-[10px] uppercase tracking-wider text-neutral-400">
          {store === "apple" ? "Download on the" : "Get it on"}
        </span>
        <span className="flex items-center gap-1.5 text-base font-bold">
          {store === "apple" ? "App Store" : "Google Play"}
          {comingSoon && (
            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">
              Soon
            </span>
          )}
        </span>
      </span>
    </a>
  );
}

const VERTICALS = [
  {
    title: "AirPal Mate",
    badge: "Find Someone To Go With",
    description: "Never go alone. Connect with verified local mates for gigs, dining, events, and activities.",
    icon: Users,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  {
    title: "AirPal Stay",
    badge: "Boutique Accommodations",
    description: "Discover verified Sydney hotels, boutique stays, hostels, and serviced apartments.",
    icon: Bed,
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  {
    title: "AirPal Experiences",
    badge: "Curated Local Activities",
    description: "Book unique food tours, harbour adventures, fitness classes, and creative workshops.",
    icon: Compass,
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  {
    title: "AirPal Fashion",
    badge: "Rent, Swap & Style",
    description: "Access curated Sydney fashion collections, rentals, and exclusive brand drops.",
    icon: Shirt,
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  {
    title: "AirPal Daily",
    badge: "Local Sydney Discovery",
    description: "What's happening near you today: live events, pop-up offers, and local giveaways.",
    icon: Sparkles,
    color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  },
  {
    title: "AirPal Travel",
    badge: "Smart Itineraries",
    description: "Seamless trip planning connecting your stays, activities, fashion, and local companions.",
    icon: Plane,
    color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  },
];

export function GetAirPalPage() {
  const [qr, setQr] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"ios" | "android">("ios");

  useEffect(() => {
    void makeQrDataUrl(PAGE_URL, 240).then(setQr).catch(() => undefined);
  }, []);

  async function share() {
    const data = {
      title: "Get AirPal",
      text: "AirPal — Life Made Easy. Connect with people, places, things & experiences in Sydney.",
      url: PAGE_URL,
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(PAGE_URL);
      toast.success("Link copied to clipboard!");
    } catch {
      /* dismissed */
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(PAGE_URL);
      toast.success("Link copied!");
    } catch {
      toast.error("Failed to copy link.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-mute transition hover:text-ink">
          <ArrowLeft size={16} /> Back to Discover
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/25 bg-card px-3 py-1 text-xs font-semibold text-mute">
          Built in Australia 🇦🇺
        </span>
      </div>

      {/* Hero Section */}
      <div className="mt-8 text-center">
        <img
          src="/logo-mark.png"
          alt="AirPal"
          className="mx-auto h-24 w-24 rounded-3xl border-2 border-ink bg-white p-2 shadow-md object-contain"
        />

        <h1 className="font-display mt-5 text-4xl font-extrabold tracking-tight md:text-5xl text-ink">
          Get AirPal
        </h1>
        <p className="mt-2 text-lg font-bold text-brand">Life Made Easy.</p>
        <p className="mx-auto mt-3 max-w-lg text-base text-mute leading-relaxed">
          The trusted marketplace connecting you with <strong className="text-ink font-semibold">people, places, experiences and things</strong> — starting in Sydney, Australia.
        </p>
      </div>

      {/* Primary Action & Download Section */}
      <div className="mt-8 grid gap-6 md:grid-cols-2 items-center">
        {/* Web App Launch & Store Badges Card */}
        <div className="rounded-3xl border-2 border-ink bg-card p-6 shadow-xs flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-500/30 flex items-center gap-1">
                <Globe size={13} /> Progressive Web App
              </span>
              <span className="text-xs text-mute font-medium">No Download Needed</span>
            </div>
            <h2 className="mt-3 text-2xl font-bold text-ink">Use AirPal Instantly</h2>
            <p className="mt-1 text-sm text-mute leading-relaxed">
              Open directly in your browser on iPhone, Android, or desktop. Add to home screen for full app experience.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <Link href="/" className="block">
              <Button size="lg" className="w-full text-base font-bold shadow-sm">
                Launch Web App Now <ExternalLink size={16} />
              </Button>
            </Link>

            <div className="flex flex-col gap-2.5 pt-3 border-t border-line/60">
              <StoreBadge store="apple" href={APP_STORE_URL} />
              <StoreBadge store="play" href={PLAY_STORE_URL} />
            </div>
          </div>
        </div>

        {/* Scan & Share Card */}
        <div className="rounded-3xl border-2 border-ink bg-card p-6 text-center shadow-xs flex flex-col items-center justify-between h-full">
          <div className="w-full">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand border border-brand/20">
              <Smartphone size={13} /> Scan on Mobile
            </span>
            <h3 className="mt-2 text-lg font-bold text-ink">Scan to open on your phone</h3>
          </div>

          <div className="my-4 rounded-2xl border-2 border-ink bg-white p-3 shadow-inner">
            {qr ? (
              <img src={qr} alt="QR code for AirPal.Me/getAirPal" className="h-36 w-36" />
            ) : (
              <div className="grid h-36 w-36 place-items-center text-xs text-mute">Generating QR…</div>
            )}
          </div>

          <div className="flex w-full justify-center gap-2">
            <Button onClick={share} variant="light" className="flex-1 border-2 border-ink text-ink font-semibold hover:bg-paper">
              <Share2 size={14} /> Share
            </Button>
            <Button onClick={copyLink} variant="light" className="border-2 border-ink text-ink font-semibold hover:bg-paper">
              <Copy size={14} /> Copy Link
            </Button>
          </div>
        </div>
      </div>

      {/* PWA Install Instructions ("Add to Home Screen") */}
      <div className="mt-10 rounded-3xl border-2 border-ink bg-paper p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-4">
          <div>
            <h3 className="text-xl font-bold text-ink flex items-center gap-2">
              <Smartphone className="text-brand" size={20} />
              Install as Mobile App (PWA)
            </h3>
            <p className="text-xs text-mute mt-0.5">
              Enjoy fullscreen view, fast loading, and home screen access.
            </p>
          </div>

          {/* iOS / Android Selector */}
          <div className="inline-flex rounded-xl border border-ink/20 bg-card p-1">
            <button
              type="button"
              onClick={() => setActiveTab("ios")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                activeTab === "ios" ? "bg-ink text-white" : "text-mute hover:text-ink"
              }`}
            >
              iPhone (Safari)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("android")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                activeTab === "android" ? "bg-ink text-white" : "text-mute hover:text-ink"
              }`}
            >
              Android (Chrome)
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {activeTab === "ios" ? (
            <>
              <div className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-extrabold text-white">
                  1
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">Open Safari</p>
                  <p className="text-xs text-mute mt-1">Navigate to <strong className="text-ink">airpal.me</strong> in Safari browser.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-extrabold text-white">
                  2
                </span>
                <div>
                  <p className="text-sm font-bold text-ink flex items-center gap-1">
                    Tap Share <Share2 size={14} className="text-brand" />
                  </p>
                  <p className="text-xs text-mute mt-1">Tap the share icon at the bottom center of your browser.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-extrabold text-white">
                  3
                </span>
                <div>
                  <p className="text-sm font-bold text-ink flex items-center gap-1">
                    Add to Home Screen <PlusSquare size={14} className="text-brand" />
                  </p>
                  <p className="text-xs text-mute mt-1">Scroll down and tap &ldquo;Add to Home Screen&rdquo;, then confirm.</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-extrabold text-white">
                  1
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">Open Chrome</p>
                  <p className="text-xs text-mute mt-1">Visit <strong className="text-ink">airpal.me</strong> in Google Chrome.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-extrabold text-white">
                  2
                </span>
                <div>
                  <p className="text-sm font-bold text-ink flex items-center gap-1">
                    Tap Menu <MoreVertical size={14} className="text-brand" />
                  </p>
                  <p className="text-xs text-mute mt-1">Tap the 3 dots in top right corner of Chrome.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-extrabold text-white">
                  3
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">Install App</p>
                  <p className="text-xs text-mute mt-1">Tap &ldquo;Install app&rdquo; or &ldquo;Add to Home screen&rdquo;.</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* One Platform — 6 Verticals Section */}
      <div className="mt-12 text-center">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-800">One Platform Engine</span>
        <h2 className="mt-1 text-3xl font-extrabold text-ink">Explore Everything AirPal Offers</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-mute">
          Designed for Sydney local discovery, experiences, stays, and connection.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
          {VERTICALS.map((v) => (
            <div key={v.title} className="rounded-2xl border-2 border-ink bg-card p-5 shadow-xs transition hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div className={`rounded-xl p-2.5 border ${v.color}`}>
                  <v.icon size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-mute border border-line px-2 py-0.5 rounded-full">
                  {v.title.replace("AirPal ", "")}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-ink">{v.title}</h3>
              <p className="mt-1 text-xs text-mute leading-relaxed">{v.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust & Safety Highlights */}
      <div className="mt-12 rounded-3xl border-2 border-ink bg-card p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <div className="rounded-2xl bg-brand/10 p-3 text-brand border border-brand/20">
              <ShieldCheck size={24} />
            </div>
            <h4 className="mt-3 font-bold text-ink text-base">Verified AirPal Mates</h4>
            <p className="mt-1 text-xs text-mute leading-relaxed">
              Every active Mate completes identity verification and admin profile review before connecting.
            </p>
          </div>

          <div className="flex flex-col items-center md:items-start">
            <div className="rounded-2xl bg-gold/10 p-3 text-gold border border-gold/20">
              <CheckCircle2 size={24} />
            </div>
            <h4 className="mt-3 font-bold text-ink text-base">Protected Marketplace</h4>
            <p className="mt-1 text-xs text-mute leading-relaxed">
              Secure booking, escrow payments via Stripe, transparent reviews, and 24/7 safety reporting.
            </p>
          </div>

          <div className="flex flex-col items-center md:items-start">
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600 border border-emerald-500/20">
              <BadgePercent size={24} />
            </div>
            <h4 className="mt-3 font-bold text-ink text-base">Free for Local Discovery</h4>
            <p className="mt-1 text-xs text-mute leading-relaxed">
              100% free to browse Sydney activities, events, and stays. No hidden registration fees.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Banner */}
      <div className="mt-10 text-center text-xs text-mute flex flex-col sm:flex-row items-center justify-center gap-2">
        <span className="font-semibold text-ink">AirPal.me — Life Made Easy</span>
        <span className="hidden sm:inline">·</span>
        <span>Launch Market: Sydney, Australia 🇦🇺</span>
        <span className="hidden sm:inline">·</span>
        <Link href="/about" className="underline hover:text-ink">
          Learn More
        </Link>
      </div>
    </div>
  );
}
