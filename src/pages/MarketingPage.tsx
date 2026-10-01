import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  AtSign,
  BadgeCheck,
  BedDouble,
  CalendarDays,
  Coffee,
  Compass,
  Link2,
  QrCode,
  ScanLine,
  ShieldCheck,
  Signal,
  BatteryFull,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Ticket,
  Users,
  UtensilsCrossed,
  Wifi,
} from "lucide-react";
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
        style={{ background: "#1805db" }}
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

/** Realistic iPhone mock showing the AirPal home — no store screenshots needed. */
function PhoneMock() {
  return (
    <div className="relative mx-auto w-[300px] px-6 pb-2 sm:w-[340px] lg:w-[370px] lg:px-10">
      {/* floating glass badges — desktop only, floating clear of the frame */}
      <div className="absolute -left-2 top-20 z-10 hidden items-center gap-2 whitespace-nowrap rounded-2xl bg-card/85 px-3 py-2 shadow-lg ring-1 ring-line backdrop-blur-md lg:flex">
        <BadgeCheck size={16} className="text-emerald-500" />
        <span className="text-xs font-bold text-ink">Verified Mate</span>
      </div>
      <div className="absolute -right-2 bottom-24 z-10 hidden items-center gap-2 whitespace-nowrap rounded-2xl bg-card/85 px-3 py-2 shadow-lg ring-1 ring-line backdrop-blur-md lg:flex">
        <Sparkles size={16} className="text-gold" />
        <span className="text-xs font-bold text-ink">Tonight nearby</span>
      </div>

      {/* titanium unibody frame — slimmer 18 Pro Max bezels */}
      <div
        className="relative rounded-[3.4rem] p-[9px] shadow-[0_40px_80px_-24px_rgba(0,0,0,0.45)]"
        style={{ background: "linear-gradient(145deg,#9ca3af,#374151 30%,#030712 55%,#6b7280 90%)" }}
      >
        {/* side buttons */}
        <div aria-hidden className="absolute -left-[2px] top-24 h-10 w-[3px] rounded-l-md bg-neutral-600" />
        <div aria-hidden className="absolute -left-[2px] top-40 h-14 w-[3px] rounded-l-md bg-neutral-600" />
        <div aria-hidden className="absolute -left-[2px] top-56 h-14 w-[3px] rounded-l-md bg-neutral-600" />
        <div aria-hidden className="absolute -right-[2px] top-44 h-20 w-[3px] rounded-r-md bg-neutral-600" />

        {/* screen */}
        <div className="relative overflow-hidden rounded-[2.6rem] bg-white">
          {/* status bar */}
          <div className="flex items-center justify-between px-7 pt-4 text-ink">
            <span className="text-[13px] font-semibold tracking-tight">9:41</span>
            <span className="flex items-center gap-1.5">
              <Signal size={14} />
              <Wifi size={14} />
              <BatteryFull size={18} />
            </span>
          </div>
          {/* under-display Face ID punch-hole camera */}
          <div className="absolute left-1/2 top-4 flex h-[22px] w-[22px] -translate-x-1/2 items-center justify-center rounded-full bg-black">
            <div
              className="h-[11px] w-[11px] rounded-full"
              style={{ background: "radial-gradient(circle at 35% 35%,#1e3a8a 0%,#020617 60%,#000 100%)" }}
            />
          </div>

          <div className="px-4 pb-3 pt-1">
            <p className="text-[11px] font-medium text-neutral-500">Good evening, nearby</p>
            <p className="text-[22px] font-bold leading-[1.15] tracking-tight text-neutral-900">
              What are you
              <br />
              looking for?
            </p>
            {/* search pill */}
            <div className="mt-3 flex items-center gap-2 rounded-full bg-neutral-100 px-3.5 py-2.5">
              <ScanLine size={14} className="text-neutral-400" />
              <span className="text-[12px] text-neutral-400">Mates, events, stays…</span>
            </div>
            {/* chips */}
            <div className="mt-2.5 flex gap-1.5">
              {["Mates", "Events", "Stay", "Daily"].map((c, i) => (
                <span
                  key={c}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[11px] font-semibold",
                    i === 0 ? "bg-sky-600 text-white" : "bg-neutral-100 text-neutral-600",
                  )}
                >
                  {c}
                </span>
              ))}
            </div>
            {/* event card */}
            <div className="mt-3 overflow-hidden rounded-3xl bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
              <div className="relative">
                <img src="/media/harbour.jpg" alt="" className="h-24 w-full object-cover" />
                <span className="absolute left-2.5 top-2.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                  SAT · 7 PM
                </span>
              </div>
              <div className="p-3">
                <p className="text-[13px] font-bold text-neutral-900">Harbour Jazz Night</p>
                <p className="mt-0.5 text-[11px] text-neutral-500">Circular Quay · 3 mates going</p>
              </div>
            </div>
            {/* mate row */}
            <div className="mt-2.5 flex items-center gap-2.5 rounded-3xl bg-white p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-[13px] font-bold text-white">
                S
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-[13px] font-bold text-neutral-900">
                  Sofia <BadgeCheck size={13} className="shrink-0 text-sky-500" />
                </p>
                <p className="truncate text-[11px] text-neutral-500">2 km · Food & live music</p>
              </div>
              <span className="shrink-0 rounded-full bg-sky-600 px-3.5 py-1.5 text-[11px] font-bold text-white">
                Wave
              </span>
            </div>
            {/* home indicator */}
            <div className="flex justify-center pb-1.5 pt-3">
              <div className="h-[5px] w-32 rounded-full bg-neutral-900" />
            </div>
          </div>

          {/* glass reflection */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[2.6rem]"
            style={{ background: "linear-gradient(115deg,rgba(255,255,255,0.14) 0%,transparent 28%)" }}
          />
        </div>
      </div>
    </div>
  );
}

function Kicker({ children }: { children: string }) {
  return <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand">{children}</p>;
}

function FeatureShell({
  index,
  kicker,
  title,
  body,
  cta,
  href,
  visual,
  flip,
}: {
  index: string;
  kicker: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  visual: React.ReactNode;
  flip?: boolean;
}) {
  const [, nav] = useLocation();
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
      <div className={cn(flip && "md:order-2")}>
        <p className="font-display text-sm font-bold tracking-[0.2em] text-mute">{index}</p>
        <Kicker>{kicker}</Kicker>
        <h2 className="font-display mt-2 text-balance text-3xl font-bold tracking-tight text-ink md:text-5xl">
          {title}
        </h2>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-mute md:text-base">{body}</p>
        <Button onClick={() => nav(href)} variant="light" className="mt-6 gap-1.5 rounded-full ring-1 ring-line">
          {cta} <ArrowRight size={15} />
        </Button>
      </div>
      <div className={cn(flip && "md:order-1")}>{visual}</div>
    </section>
  );
}

function NetworkingVisual() {
  return (
    <div className="relative mx-auto max-w-sm">
      <div className="rounded-[2rem] bg-card p-5 shadow-xl ring-1 ring-line">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-xl font-bold text-brand">
            J
          </span>
          <div>
            <p className="flex items-center gap-1.5 font-bold text-ink">
              Jordan <BadgeCheck size={15} className="text-sky-500" />
            </p>
            <p className="text-xs text-mute">Verified · 24 experiences · Surry Hills</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {["Live music", "Harbour walks", "Italian food", "English · Italian"].map((t) => (
            <span
              key={t}
              className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-semibold text-mute ring-1 ring-line"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <span className="rounded-full bg-brand py-2.5 text-center text-sm font-bold text-white">Wave hello</span>
          <span className="rounded-full bg-paper py-2.5 text-center text-sm font-bold text-ink ring-1 ring-line">
            Plan together
          </span>
        </div>
      </div>
      <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-2xl bg-card px-3.5 py-2.5 shadow-lg ring-1 ring-line">
        <QrCode size={18} className="text-brand" />
        <span className="text-xs font-bold text-ink">Scan to connect — no typing</span>
      </div>
    </div>
  );
}

function LinkInBioVisual() {
  return (
    <div className="relative mx-auto max-w-sm">
      <div className="overflow-hidden rounded-[2rem] bg-ink text-white shadow-xl">
        <img src="/media/laneway.jpg" alt="" className="h-36 w-full object-cover opacity-90" />
        <div className="p-5">
          <div className="flex items-center gap-3">
            <img src="/logo-mark.png" alt="" className="h-11 w-11 rounded-xl bg-white object-contain p-1" />
            <div>
              <p className="font-bold">Sofia in Sydney</p>
              <p className="text-xs text-white/60">Mates · Events · Stays</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {["This weekend's plan", "My favourite stays", "Rent my camera"].map((l) => (
              <div
                key={l}
                className="rounded-full bg-white/10 px-4 py-2.5 text-center text-sm font-semibold ring-1 ring-white/15"
              >
                {l}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/80 ring-1 ring-white/15">
            <AtSign size={13} /> airpal.me/@sofia
          </div>
        </div>
      </div>
      <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-2xl bg-card px-3.5 py-2.5 shadow-lg ring-1 ring-line">
        <Link2 size={16} className="text-emerald-500" />
        <span className="text-xs font-bold text-ink">One link for your whole world</span>
      </div>
    </div>
  );
}

function DiscoverVisual() {
  return (
    <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
      {[
        { src: "/media/harbour.jpg", label: "Tonight", sub: "12 events near you" },
        { src: "/media/walk.jpg", label: "Weekend", sub: "8 mate plans open" },
        { src: "/media/room.jpg", label: "Stay", sub: "Boutique from $89" },
        { src: "/media/campus.jpg", label: "Daily", sub: "Fresh local drops" },
      ].map((c) => (
        <div key={c.label} className="relative overflow-hidden rounded-[1.6rem] ring-1 ring-line">
          <img src={c.src} alt="" className="h-44 w-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-2.5 left-3 right-3">
            <p className="text-sm font-bold text-white">{c.label}</p>
            <p className="text-[11px] text-white/75">{c.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MarketingPage() {
  const [, nav] = useLocation();
  const bare = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("bare") === "1";

  useEffect(() => {
    setShareMeta({
      title: "AirPal.Me · Life Made Easy — your networking app",
      description:
        "Your networking app, link-in-bio, and guide to life around you. Mates, stays, experiences and more — on iPhone, Android and web.",
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
    <div className="pb-28">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{ background: "linear-gradient(90deg,#d4af37,#2563eb)" }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-14 pt-14 md:grid-cols-2 md:pt-20">
          <div className="text-center md:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand">
              AirPal.Me · iPhone · Android · Web
            </p>
            <h1 className="font-display mx-auto mt-3 max-w-3xl text-balance text-4xl font-bold tracking-tight text-ink md:mx-0 md:text-6xl">
              Life Made Easy. <span className="text-brand">All in one app.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-balance text-[15px] leading-relaxed text-mute md:mx-0 md:text-lg">
              Your global networking app, link-in-bio, and guide to life around you — connecting friends, family,
              colleagues and mates with places, stays, experiences and more in any city worldwide.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row md:justify-start">
              <Button onClick={() => nav("/getAirPalApp")} className="h-12 gap-1.5 rounded-full px-7 text-[15px]">
                <Smartphone size={17} /> Get the app
              </Button>
              <Button
                onClick={() => nav("/")}
                variant="ghost"
                className="h-12 rounded-full border border-line px-7 text-[15px]"
              >
                Explore nearby <ArrowRight size={16} />
              </Button>
            </div>
            <p className="mt-4 text-xs font-semibold text-mute">
              Free to browse · No download needed — runs on iPhone, Android and desktop
            </p>
          </div>
          <PhoneMock />
        </div>
      </section>

      {/* ── Promise strip ────────────────────────────────── */}
      <section className="border-y border-line/60 bg-card/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-7 gap-y-3 px-5 py-6">
          {[
            { icon: Users, label: "Mates" },
            { icon: BedDouble, label: "Stay" },
            { icon: Compass, label: "Experiences" },
            { icon: Ticket, label: "Events" },
            { icon: ShoppingBag, label: "Fashion" },
            { icon: Sparkles, label: "Daily" },
          ].map((s) => (
            <span key={s.label} className="flex items-center gap-2 text-sm font-bold text-ink">
              <s.icon size={17} className="text-brand" /> {s.label}
            </span>
          ))}
        </div>
      </section>

      {/* ── 01 Networking ────────────────────────────────── */}
      <FeatureShell
        index="01"
        kicker="Your Networking App"
        title="Meet the right people, not just profiles."
        body="Verified mates matched on interests, availability and area — with understandable reasons, QR connect, and plans you build together. Real connection, zero awkwardness."
        cta="Find your mates"
        href="/plan"
        visual={<NetworkingVisual />}
      />

      {/* ── 02 Link in bio ───────────────────────────────── */}
      <div className="bg-card/50">
        <FeatureShell
          index="02"
          kicker="Link-in-Bio"
          title="One link for your whole world."
          body="Your AirPal profile is your link-in-bio: plans, favourite stays, rentals and events — all behind airpal.me/@you. Share it anywhere; it opens instantly, no app install needed."
          cta="Claim your link"
          href="/getAirPalApp"
          visual={<LinkInBioVisual />}
          flip
        />
      </div>

      {/* ── 03 Discover ──────────────────────────────────── */}
      <FeatureShell
        index="03"
        kicker="Discover life & the world around you"
        title="What's happening near you, right now."
        body="Tonight's gigs, weekend plans, boutique stays and fresh local drops — one discovery layer that drives real experiences, not endless scrolling."
        cta="See what's on"
        href="/explore"
        visual={<DiscoverVisual />}
      />

      {/* ── Home ─────────────────────────────────────────── */}
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center md:py-24">
          <Kicker>One home for everything</Kicker>
          <h2 className="font-display mx-auto mt-2 max-w-2xl text-balance text-3xl font-bold tracking-tight md:text-5xl">
            Start on the home page. End up somewhere great.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/65">
            The AirPal home answers one question — “What are you looking for?” — with one action for mates, experiences,
            stays, discovery, fashion and trips.
          </p>
          <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 text-left md:grid-cols-4">
            {[
              { icon: Users, t: "Find an AirPal", d: "Someone to go with" },
              { icon: CalendarDays, t: "Make a plan", d: "Mates co-plan it" },
              { icon: ShieldCheck, t: "Meet safely", d: "Verified & reported" },
              { icon: Sparkles, t: "Repeat", d: "Reviews build trust" },
            ].map((s) => (
              <div key={s.t} className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
                <s.icon size={20} className="text-gold" />
                <p className="mt-2.5 text-sm font-bold">{s.t}</p>
                <p className="mt-0.5 text-xs text-white/55">{s.d}</p>
              </div>
            ))}
          </div>
          <Button
            onClick={() => nav("/")}
            className="mt-8 h-12 gap-1.5 rounded-full bg-white px-7 text-[15px] text-ink hover:bg-white/90"
          >
            Open the home page <ArrowRight size={16} />
          </Button>
        </div>
      </section>

      {/* ── iOS + Android ────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="text-center">
          <Kicker>iPhone · Android · Web</Kicker>
          <h2 className="font-display mx-auto mt-2 max-w-2xl text-balance text-3xl font-bold tracking-tight text-ink md:text-5xl">
            Made for the phone in your pocket.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-mute">
            Use AirPal instantly in your browser today — install it to your home screen in seconds. Native iOS and
            Android apps are on the way.
          </p>
        </div>
        <div className="mx-auto mt-8 grid max-w-3xl gap-4 md:grid-cols-2">
          <div className="rounded-[1.8rem] bg-card p-6 ring-1 ring-line">
            <Smartphone size={22} className="text-brand" />
            <h3 className="mt-3 text-lg font-bold text-ink">Install now — no store needed</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-mute">
              iPhone Safari → Share → Add to Home Screen. Android Chrome → menu → Install app. Full-screen, fast, and
              always up to date.
            </p>
            <Button onClick={() => nav("/getAirPalApp")} className="mt-4 h-11 rounded-full px-6">
              Install guide <ArrowRight size={15} />
            </Button>
          </div>
          <div className="rounded-[1.8rem] bg-card p-6 ring-1 ring-line">
            <BadgeCheck size={22} className="text-gold" />
            <h3 className="mt-3 text-lg font-bold text-ink">Native apps coming soon</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-mute">
              App Store and Google Play listings with push, offline plans and home-screen widgets. Join now and you will
              be first in.
            </p>
            <Button
              onClick={() => nav("/getAirPalApp")}
              variant="ghost"
              className="mt-4 h-11 rounded-full border border-line px-6"
            >
              Notify me <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      </section>

      {/* ── Final CTA + brand creative ───────────────────── */}
      <section className="mx-auto max-w-xl px-5 pb-4 text-center">
        <BrandMark compact />
        <h2 className="font-display mt-3 text-balance text-3xl font-bold tracking-tight text-ink">
          Your world, all in one app.
        </h2>
        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={() => nav("/getAirPalApp")} className="h-12 rounded-full">
            Get AirPal free
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(pageUrl);
              } catch {
                /* clipboard unavailable */
              }
            }}
            className="h-12 rounded-full border border-line"
          >
            Copy creative link
          </Button>
        </div>
        <details className="mt-8 text-left">
          <summary className="cursor-pointer text-center text-xs font-bold uppercase tracking-[0.18em] text-mute">
            Brand creative (store asset)
          </summary>
          <div className="mx-auto mt-4 max-w-[420px]">
            <MarketingPoster />
          </div>
          <p className="mt-2 text-center text-xs text-mute">
            Export a crisp 1080×1350 PNG with <span className="font-mono text-ink">npm run screenshots</span>.
          </p>
        </details>
      </section>
    </div>
  );
}
