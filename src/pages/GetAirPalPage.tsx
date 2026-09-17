import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, BadgePercent, CalendarDays, Gift, MapPin, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { makeQrDataUrl } from "@/lib/qr";

/**
 * Public promotion page: AirPal.Me/getAirPal
 * Fill in the store URLs once the listings are live.
 */
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
      className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-ink px-4 py-3 text-white"
    >
      {store === "apple" ? (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden>
          <path d="M17.05 12.54c-.03-2.89 2.36-4.28 2.47-4.34-1.35-1.97-3.44-2.24-4.18-2.27-1.78-.18-3.47 1.05-4.37 1.05-.9 0-2.29-1.02-3.77-1-1.94.03-3.72 1.13-4.72 2.86-2.01 3.49-.51 8.66 1.45 11.5.96 1.39 2.1 2.94 3.6 2.88 1.45-.06 2-.93 3.75-.93s2.24.93 3.77.9c1.56-.03 2.55-1.41 3.5-2.81 1.1-1.61 1.55-3.17 1.58-3.25-.04-.02-3.03-1.16-3.08-4.59zM14.16 4.06c.8-.97 1.34-2.32 1.19-3.66-1.15.05-2.55.77-3.38 1.74-.74.86-1.39 2.23-1.22 3.55 1.29.1 2.6-.65 3.41-1.63z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden>
          <path d="M3.6 2.3c-.3.3-.5.8-.5 1.4v16.6c0 .6.2 1.1.5 1.4l.1.1 9.3-9.3v-.2L3.7 2.2l-.1.1z" opacity=".9" />
          <path d="M16.8 15.9l-3.8-3.8v-.2l3.8-3.8.1.1 4.5 2.6c1.3.7 1.3 1.9 0 2.6l-4.5 2.6-.1-.1z" opacity=".9" />
          <path d="M16.9 15.8L13 11.9 4.1 20.6c.4.4 1 .4 1.7 0l11.1-4.8z" opacity=".9" />
          <path d="M16.9 8.1L5.8 3.3c-.7-.4-1.3-.4-1.7 0l8.9 8.7 3.9-3.9z" opacity=".9" />
        </svg>
      )}
      <span className="text-left leading-tight">
        <span className="block text-[10px] uppercase tracking-wider opacity-70">
          {store === "apple" ? "Download on the" : "Get it on"}
        </span>
        <span className="block text-base font-bold">
          {store === "apple" ? "App Store" : "Google Play"}
          {comingSoon && <span className="ml-1.5 rounded bg-white/20 px-1.5 py-0.5 text-[10px]">Soon</span>}
        </span>
      </span>
    </a>
  );
}

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

      <div className="mt-6 text-center">
        <img src="/logo-mark.png" alt="AirPal" className="mx-auto h-20 w-20 rounded-3xl border-2 border-ink" />
        <h1 className="font-display mt-4 text-4xl font-bold">Get AirPal</h1>
        <p className="mt-1 text-sm font-semibold text-brand">Life Made Easy.</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-mute">
          Find places, make plans, meet mates — plus local deals, events, and giveaways across Kerala.
        </p>
      </div>

      <div className="mx-auto mt-6 grid max-w-sm gap-2">
        <StoreBadge store="apple" href={APP_STORE_URL} />
        <StoreBadge store="play" href={PLAY_STORE_URL} />
      </div>

      <div className="mx-auto mt-4 max-w-sm rounded-3xl border-2 border-ink bg-card p-4 text-center">
        {qr ? (
          <img src={qr} alt="QR code for AirPal.Me/getAirPal" className="mx-auto h-40 w-40" />
        ) : (
          <div className="mx-auto grid h-40 w-40 place-items-center text-xs text-mute">Loading QR…</div>
        )}
        <p className="mt-2 text-xs text-mute">Scan to open this page on your phone</p>
        <div className="mt-2 flex justify-center gap-2">
          <Button onClick={share} className="bg-card text-ink border-2 border-ink">
            <Share2 size={14} /> Share
          </Button>
          <Link href="/">
            <Button>Open web app</Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 text-center">
        {[
          { icon: MapPin, label: "Find places" },
          { icon: CalendarDays, label: "Make plans" },
          { icon: Gift, label: "Win & save" },
        ].map((f) => (
          <div key={f.label} className="rounded-2xl border-2 border-ink bg-card p-3">
            <f.icon size={18} className="mx-auto text-brand" />
            <p className="mt-1 text-xs font-bold">{f.label}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-mute">
        <BadgePercent size={13} /> Free to download · Free to list your business
      </p>
    </div>
  );
}
