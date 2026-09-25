import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  BedDouble,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Gift,
  Luggage,
  MessageCircle,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { getFirebaseDb } from "@/lib/firebase";
import { fetchInviteOverview, inviteLinkFor } from "@/lib/app-invites";
import { REFERRAL_POINTS, foundingPoolState } from "@shared/promotions";
import { cn } from "@/lib/cn";

const DOC_ID = "founders-100k";
const CAP = 100000;
const TICKER = "JULY CARRY-ON /// SYDNEY WEEKEND FOR TWO /// 10 × $100 CREDIT /// FOUNDER STATUS /// FREE ENTRY ///";

interface PrizeItem {
  id: string;
  n: string;
  name: string;
  badge: string;
  highlight: string;
  line: string;
  bullets: string[];
  link?: string;
  linkText?: string;
  icon: typeof Trophy;
  accent: string;
}

const PRIZES: PrizeItem[] = [
  {
    id: "july",
    n: "01",
    name: "July Carry-On Light Expandable",
    badge: "Grand Prize",
    highlight: "Rated 4.9 · 500+ reviews · Lifetime warranty",
    line: "July's ultralight expandable cabin case. The winner picks the colour.",
    bullets: ["Expandable cabin case", "Rated 4.9 from 500+ reviews", "Lifetime July warranty", "Winner picks the colour"],
    link: "https://july.com/au/luggage/carry-on-light-expandable/",
    linkText: "View on July.com",
    icon: Luggage,
    accent: "border-amber-300/25 bg-amber-300/[0.05] hover:border-amber-300/50",
  },
  {
    id: "sydney",
    n: "02",
    name: "Sydney Weekend for Two",
    badge: "For Two",
    highlight: "Stay + dinner + something unforgettable",
    line: "A Sydney weekend for you and a mate. Somewhere to stay, dinner sorted, and something you'll talk about for months.",
    bullets: ["Sydney stay for two", "Dinner for two", "A signature experience"],
    icon: BedDouble,
    accent: "border-sky-300/25 bg-sky-300/[0.05] hover:border-sky-300/50",
  },
  {
    id: "credits",
    n: "03",
    name: "Ten × $100 AirPal credit",
    badge: "Ten Winners",
    highlight: "Ten founders · $100 each",
    line: "Ten founders get $100 in AirPal credit each. Spend it on mates, stays and experiences.",
    bullets: ["10 winners drawn at random", "$100 AirPal credit each", "One prize per winner"],
    icon: Gift,
    accent: "border-emerald-300/25 bg-emerald-300/[0.05] hover:border-emerald-300/50",
  },
  {
    id: "status",
    n: "04",
    name: "Founder status",
    badge: "All 100,000",
    highlight: "Your number · forever",
    line: "Every founder keeps their number — proof you were here first. Plus entry points from day one.",
    bullets: ["Permanent founder number", "Founder entry on your account", "+10 entry points when you enter"],
    icon: BadgeCheck,
    accent: "border-white/15 bg-white/[0.04] hover:border-white/35",
  },
];

/** Real campaign timeline — dates match the frozen campaign terms. */
const ROADMAP = [
  { top: "Now", label: "Pool opens", desc: "Sign up free. Your entry locks your founder number." },
  { top: "100,000", label: "Pool seals", desc: "Doors shut the moment spot 100,000 goes." },
  { top: "Dec 31", label: "Entries close", desc: "Final close for the founding pool." },
  { top: "Jan 15", label: "Winners drawn", desc: "Random draw. Winners announced in-app." },
];

const FAQS = [
  {
    q: "Is entry into the 100K Founders Club completely free?",
    a: "Yes, 100% free. No credit card, no entry fees, and no purchase necessary. Simply sign up for a free AirPal account and claim your unique @handle before the 100,000 spot limit is reached.",
  },
  {
    q: "Who is eligible to participate and win prizes?",
    a: "The Founders 100K promotion is open to Australian residents aged 18 and over who hold an active AirPal account. Each person is entitled to one founding entry.",
  },
  {
    q: "What do I get when mates join with my link?",
    a: `Every mate who signs up with your personal link is recorded as your crew referral, and you earn +${REFERRAL_POINTS} points for each one. The draw itself stays one entry per person — referrals earn points, not extra entries.`,
  },
  {
    q: "How and when are winners drawn?",
    a: "Winners are drawn using a verified random selection method once the founding pool closes or at the scheduled draw date (announced in-app). Winners will be contacted directly via email and notified in their AirPal Inbox.",
  },
  {
    q: "What is founder status?",
    a: "Your founder number (e.g. #12,408 of 100,000) stays on your entry as proof you were here first — one of the 100,000 who built AirPal from the start.",
  },
];

function fmt(n: number): string {
  return n.toLocaleString("en-AU");
}

export function FoundersPage() {
  const [, nav] = useLocation();
  const { user } = useAuth();
  const { mine } = useBio();
  const [used, setUsed] = useState<number | null>(null);
  const [live, setLive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState<number>(0);
  const [myFounder, setMyFounder] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;
    let alive = true;
    void getDoc(doc(db, "promotions", DOC_ID))
      .then((snap) => {
        if (!alive || !snap.exists()) return;
        const data = snap.data() as { status?: string; entriesCount?: number };
        if (data.status !== "live" && data.status !== "closed") return;
        setLive(true);
        setUsed(Math.max(0, Math.floor(Number(data.entriesCount || 0))));
      })
      .catch(() => undefined);

    if (!user?.uid) {
      setMyFounder(null);
      setReferralCount(0);
    }
    if (user?.uid) {
      void fetchInviteOverview(user.uid).then((res) => {
        if (alive) {
          setReferralCount(res.joined.length);
        }
      });
      // The entrant's own real founder number — never invented.
      void getDocs(
        query(collection(db, "promotion_entries"), where("promotionId", "==", DOC_ID), where("uid", "==", user.uid), limit(1)),
      )
        .then((snap) => {
          if (!alive || snap.empty) return;
          const n = Number(snap.docs[0].data().founderNumber);
          if (Number.isFinite(n) && n > 0) setMyFounder(Math.floor(n));
        })
        .catch(() => undefined);
    }

    return () => {
      alive = false;
    };
  }, [user]);

  // Unknown until the live doc is readable — no placeholder counts, ever.
  const pool = foundingPoolState(used ?? 0, CAP);
  const poolKnown = used !== null;
  const signupHref = `/start?tab=signup&next=${encodeURIComponent("/giveaways/founders-100k")}`;
  const handle = mine?.handle || "";
  const myLink = user && handle ? inviteLinkFor(handle) : "";

  async function copyLink() {
    if (!myLink) return;
    try {
      await navigator.clipboard.writeText(myLink);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = myLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    toast.success("Invite link copied to clipboard! Share it with your crew.");
    window.setTimeout(() => setCopied(false), 2500);
  }

  async function shareNative() {
    const text = "Join me as an AirPal founding member — free entry into the July carry-on + Sydney weekend draw:";
    if (navigator.share) {
      try {
        await navigator.share({
          title: "AirPal Founders 100K Club",
          text,
          url: myLink || "https://airpal.me/founders",
        });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await copyLink();
  }

  return (
    <div className="min-h-screen bg-[#06060c] text-slate-100 selection:bg-brand selection:text-white">
      <style>{`
        @keyframes founders-ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .animate-shimmer{background:linear-gradient(90deg,rgba(255,214,10,0) 0%,rgba(255,214,10,0.3) 50%,rgba(255,214,10,0) 100%);background-size:200% 100%;animation:shimmer 4s infinite}
        @media (prefers-reduced-motion: reduce){.founders-ticker-track{animation:none !important}}
      `}</style>

      {/* Top Header Banner */}
      <div className="relative z-10 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/80">AIRPAL FOUNDING POOL · AUSTRALIA</span>
          </div>
          <div className="flex items-center gap-3 text-white/60">
            <span>{poolKnown ? `${fmt(pool.left)} Spots Left` : "100,000 spots"}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline text-amber-300 font-medium">100% Free Entry</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 overflow-hidden pb-16 pt-10 md:pt-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Left Column: Headlines & CTA */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-bold text-amber-300 backdrop-blur-md">
                <Sparkles size={14} className="text-amber-300" />
                <span>LIMITED TO THE FIRST 100,000 FOUNDERS</span>
              </div>

              <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-black leading-[0.98] tracking-tight text-white">
                First 100K in. <br />
                <span className="text-amber-300">Everyone else watches.</span>
              </h1>

              <p className="max-w-xl text-base sm:text-lg leading-relaxed text-slate-300 font-normal">
                A <strong className="text-white">July carry-on</strong>, a <strong className="text-white">Sydney weekend for two</strong>, and <strong className="text-white">$100 credit</strong> for ten founders. Claim your spot before 100,000 goes.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                {user ? (
                  <Button
                    size="lg"
                    onClick={() => {
                      const el = document.getElementById("crew-station");
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="gap-2 px-8 py-4 text-base font-bold bg-[#ffd60a] text-black hover:bg-amber-300 shadow-[0_0_30px_-5px_rgba(255,214,10,0.5)] border-0"
                  >
                    <Trophy size={18} className="text-black" />
                    <span>View My Founder Status</span>
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => nav(signupHref)}
                    className="gap-2 px-8 py-4 text-base font-bold bg-[#ffd60a] text-black hover:bg-amber-300 shadow-[0_0_30px_-5px_rgba(255,214,10,0.5)] border-0"
                  >
                    <span>Claim Free Founder Spot</span>
                    <ArrowRight size={18} className="text-black" />
                  </Button>
                )}

                <a
                  href="#prizes"
                  className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-white/90 bg-white/5 border border-white/15 backdrop-blur-md transition hover:bg-white/10 hover:border-white/30"
                >
                  <span>Explore Prizes</span>
                  <ArrowDown size={15} />
                </a>
              </div>

              {/* Live pool progress card — real count only, no placeholders */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5 backdrop-blur-xl shadow-2xl max-w-xl">
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">
                      {poolKnown ? fmt(pool.used) : "100,000"}
                    </span>
                    <span className="text-xs text-white/50 uppercase tracking-wider">
                      {poolKnown ? "/ 100,000 claimed" : "spots · doors open soon"}
                    </span>
                  </div>
                  {poolKnown && (
                    <span className="font-mono text-xs font-bold text-amber-300 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                      {pool.percent}% FULL
                    </span>
                  )}
                </div>

                <div
                  className="h-3.5 w-full overflow-hidden rounded-full bg-white/10 p-0.5 border border-white/10"
                  role="progressbar"
                  aria-valuenow={poolKnown ? pool.percent : 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-amber-300 transition-all duration-1000"
                    style={{ width: `${poolKnown ? Math.max(5, pool.percent) : 0}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>100% free · No card required</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                    {live ? "Live pool" : "Opening soon"}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Liquid Glass Founder Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[360px] sm:max-w-[400px]">
                {/* Glow accent */}
                <div className="absolute -inset-1 rounded-3xl bg-amber-300/20 blur-xl" aria-hidden />

                {/* Card container */}
                <div className="relative rounded-3xl border border-white/20 bg-black/80 p-6 sm:p-7 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-left">
                  
                  {/* Card top banner */}
                  <div className="flex items-center justify-between border-b border-white/15 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-[#1805db] to-indigo-500 font-display font-black text-white text-base shadow-md">
                        A
                      </div>
                      <div>
                        <p className="font-display text-sm font-black tracking-wider text-white">AIRPAL.ME</p>
                        <p className="text-[10px] font-medium tracking-widest text-amber-300 uppercase">FOUNDERS CLUB</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/15 px-2.5 py-1 text-[11px] font-extrabold text-amber-300">
                      <Star size={11} className="fill-amber-300" />
                      FOUNDER PASS
                    </span>
                  </div>

                  {/* Card Main Info */}
                  <div className="py-6 space-y-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">FOUNDING MEMBER</p>
                      <p className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {user && handle ? `@${handle}` : "@YOUR_HANDLE"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">PASS NUMBER</p>
                        <p className="font-mono text-sm sm:text-base font-bold text-amber-300">
                          {myFounder !== null ? `#${String(myFounder).padStart(6, "0")}` : user ? "PENDING" : "#······"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">POOL STATUS</p>
                        <p className="text-sm sm:text-base font-bold text-emerald-400 flex items-center gap-1">
                          <Check size={14} className="stroke-[3]" /> VERIFIED
                        </p>
                      </div>
                    </div>

                    {/* Holographic Security Strip */}
                    <div className="relative overflow-hidden rounded-xl border border-white/15 bg-white/5 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-amber-300" />
                        <span className="text-xs font-semibold text-slate-200">100K Founders Lock-in</span>
                      </div>
                      <span className="font-mono text-[11px] text-white/50">SYD-2026</span>
                      <div className="absolute inset-0 animate-shimmer pointer-events-none" />
                    </div>
                  </div>

                  {/* Card Bottom / Share CTA */}
                  <div className="border-t border-white/15 pt-4 flex items-center justify-between">
                    <p className="text-[11px] text-slate-400">
                      {user
                        ? myFounder !== null
                          ? `${referralCount} crew referred`
                          : "Enter the draw to lock your number"
                        : "Free enrollment open now"}
                    </p>
                    <button
                      type="button"
                      onClick={shareNative}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                    >
                      <Share2 size={13} />
                      <span>Share Pass</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Infinite Ticker Track */}
      <div aria-hidden className="relative z-10 overflow-hidden border-y border-white/15 bg-brand py-3.5">
        <div className="founders-ticker-track flex w-max whitespace-nowrap text-xs sm:text-sm font-black uppercase tracking-[0.18em] text-white [animation:founders-ticker_24s_linear_infinite]">
          <span className="pr-4">{TICKER.repeat(3)}</span>
          <span className="pr-4">{TICKER.repeat(3)}</span>
        </div>
      </div>

      {/* Road to the draw — real campaign dates, no invented unlocks */}
      <section className="relative z-10 border-b border-white/10 bg-black/30 py-12">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <p className="text-xs font-extrabold uppercase tracking-widest text-amber-300">POOL ROADMAP</p>
            <h2 className="font-display text-2xl sm:text-3xl font-black text-white mt-1">
              The road to the draw
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ROADMAP.map((m, idx) => (
              <div
                key={m.label}
                className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display text-lg font-black text-amber-300">
                    {m.top}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">0{idx + 1}</span>
                </div>
                <h3 className="font-display text-base font-bold text-white">{m.label}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prizes Showcase */}
      <section id="prizes" className="relative z-10 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-xs font-bold text-white">
              <Trophy size={14} className="text-amber-300" />
              <span>THE LAUNCH REWARDS</span>
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-white">
              The Founding Loot Vault.
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Every prize is drawn directly from the 100,000 founding member pool. No entry fees. No purchases required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PRIZES.map((p) => {
              const IconComp = p.icon;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "group relative overflow-hidden rounded-3xl border p-6 sm:p-8 backdrop-blur-xl transition shadow-xl flex flex-col justify-between",
                    p.accent,
                  )}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-3xl font-black text-amber-300/80">
                        {p.n}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs font-bold text-white">
                        <IconComp size={13} className="text-amber-300" />
                        {p.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display text-2xl sm:text-3xl font-bold text-white">
                        {p.name}
                      </h3>
                      <p className="text-xs sm:text-sm font-semibold text-amber-300 mt-1">
                        {p.highlight}
                      </p>
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed font-normal">
                      {p.line}
                    </p>

                    <div className="border-t border-white/10 pt-4 space-y-2">
                      {p.bullets.map((b) => (
                        <div key={b} className="flex items-center gap-2 text-xs text-slate-300">
                          <Check size={13} className="text-emerald-400 shrink-0" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {p.link && (
                    <div className="pt-5 mt-4 border-t border-white/10">
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 hover:underline"
                      >
                        <span>{p.linkText || "Official Website"}</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            {user ? (
              <Button
                size="lg"
                onClick={() => {
                  const el = document.getElementById("crew-station");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="gap-2 px-9 py-4 text-base font-bold bg-brand text-white hover:bg-brand/90"
              >
                <Share2 size={18} />
                <span>Get my invite link</span>
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={() => nav(signupHref)}
                className="gap-2 px-9 py-4 text-base font-bold bg-[#ffd60a] text-black hover:bg-amber-300"
              >
                <Ticket size={18} />
                <span>I'm In — Claim My Free Founder Spot</span>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 border-y border-white/10 bg-black/40 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-extrabold uppercase tracking-widest text-amber-300">EFFORTLESS ENTRY</p>
            <h2 className="font-display text-3xl sm:text-5xl font-black text-white mt-1">
              Three Steps. Zero Catch.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-xl">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#ffd60a] font-display text-xl font-black text-black mb-5 shadow-lg">
                1
              </div>
              <h3 className="font-display text-xl font-bold text-white">Sign Up Free</h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Takes 30 seconds. Pick your personal @handle. No payment method or credit card required.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-xl">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand font-display text-xl font-black text-white mb-5 shadow-lg">
                2
              </div>
              <h3 className="font-display text-xl font-bold text-white">Lock Your Founder Pass</h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Your entry is timestamped and secured the moment you register. Founder status remains forever.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-xl">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500 font-display text-xl font-black text-black mb-5 shadow-lg">
                3
              </div>
              <h3 className="font-display text-xl font-bold text-white">Bring Your Crew</h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Share your invite link with mates. Every mate who joins earns you +{REFERRAL_POINTS} points.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Crew Referral Station */}
      <section id="crew-station" className="relative z-10 py-16 md:py-24 bg-brand">
        <div className="mx-auto max-w-5xl px-5 text-center sm:text-left">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold text-white">
                <Users size={14} />
                <span>REFERRAL ACCELERATOR</span>
              </div>
              <h2 className="font-display text-3xl sm:text-5xl font-black text-white leading-tight">
                Your link. Your crew. <br />
                Your points.
              </h2>
              <p className="text-white/85 text-sm sm:text-base leading-relaxed">
                Every mate who signs up with your personal link counts as your crew referral — +{REFERRAL_POINTS} points each. The draw stays one entry per person.
              </p>

              {user && (
                <div className="grid grid-cols-2 gap-3 pt-2 max-w-md">
                  <div className="rounded-2xl bg-black/20 p-3.5 border border-white/15">
                    <p className="text-[11px] font-semibold text-white/70 uppercase">CREW REFERRED</p>
                    <p className="font-display text-2xl font-black text-amber-300">{referralCount}</p>
                  </div>
                  <div className="rounded-2xl bg-black/20 p-3.5 border border-white/15">
                    <p className="text-[11px] font-semibold text-white/70 uppercase">YOUR ENTRY</p>
                    <p className="font-display text-2xl font-black text-white">
                      {myFounder !== null ? `#${myFounder.toLocaleString("en-AU")}` : "—"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-white/20 bg-black/40 p-6 sm:p-7 backdrop-blur-xl shadow-2xl text-left">
                {myLink ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-white/70 uppercase">YOUR PERSONAL INVITE LINK</p>
                      <div className="mt-1.5 flex items-center gap-2 rounded-2xl bg-white/10 p-2.5 border border-white/15">
                        <span className="font-mono text-xs text-white truncate flex-1 pl-1">{myLink}</span>
                        <Button
                          size="sm"
                          variant="light"
                          onClick={copyLink}
                          className="shrink-0 gap-1.5 px-3.5 text-xs font-bold"
                        >
                          {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          <span>{copied ? "Copied!" : "Copy"}</span>
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join me as an AirPal founding member — free entry into the July carry-on + Sydney weekend draw: ${myLink}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500"
                      >
                        <MessageCircle size={14} />
                        <span>WhatsApp</span>
                      </a>
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Claimed my AirPal founder pass — first 100K in get free entry into the July carry-on + Sydney weekend draw: `)}&url=${encodeURIComponent(myLink)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-black px-3 py-2.5 text-xs font-bold text-white transition hover:bg-slate-900 border border-white/20"
                      >
                        <span>Post to X</span>
                      </a>
                    </div>

                    <Button
                      variant="light"
                      onClick={shareNative}
                      className="w-full justify-center gap-2 py-3 text-xs font-bold"
                    >
                      <Share2 size={15} />
                      <span>Share on Device</span>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 text-center">
                    <Zap size={32} className="text-amber-300 mx-auto" />
                    <div>
                      <h4 className="font-display text-xl font-bold text-white">Get Your Referral Link</h4>
                      <p className="text-xs text-white/70 mt-1">
                        Sign up in 30 seconds to generate your unique link and start stacking points.
                      </p>
                    </div>
                    <Button
                      size="lg"
                      variant="light"
                      onClick={() => nav(signupHref)}
                      className="w-full justify-center gap-2 py-3.5 text-sm font-bold"
                    >
                      <span>Sign Up to Get Invite Link</span>
                      <ArrowRight size={16} />
                    </Button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-5">
          <div className="text-center max-w-xl mx-auto mb-12">
            <p className="text-xs font-extrabold uppercase tracking-widest text-amber-300">FREQUENTLY ASKED</p>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-white mt-1">
              Everything You Need to Know
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="flex w-full items-center justify-between p-5 text-left text-sm sm:text-base font-bold text-white hover:text-amber-300 transition"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      className={cn("text-slate-400 transition-transform duration-200", isOpen && "rotate-180 text-amber-300")}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm leading-relaxed text-slate-300 border-t border-white/5 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Fine Print / Official Notice */}
      <section className="relative z-10 border-t border-white/10 bg-black/60 py-10">
        <div className="mx-auto max-w-6xl px-5 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p className="max-w-3xl leading-relaxed">
              <strong>Official Notice:</strong> 100% Free Entry · Open to Australian residents aged 18+ · Capped at 100,000 eligible entries · Winners drawn at random from the founding pool and announced in-app · Entry does not guarantee winning · The July suitcase prize is purchased at retail and is not sponsored by July.
            </p>
            <div className="flex items-center gap-4 shrink-0 font-medium">
              <Link href="/terms" className="text-white/70 hover:text-white hover:underline">
                Terms
              </Link>
              <span>·</span>
              <Link href="/privacy" className="text-white/70 hover:text-white hover:underline">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Mobile Floating Action Dock */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/15 bg-black/85 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2">
          {user ? (
            <Button
              onClick={shareNative}
              className="w-full justify-center py-3.5 text-sm font-bold bg-[#ffd60a] text-black shadow-lg"
            >
              <Share2 size={16} />
              <span>Share My Founder Pass</span>
            </Button>
          ) : (
            <Button
              onClick={() => nav(signupHref)}
              className="w-full justify-center py-3.5 text-sm font-bold bg-[#ffd60a] text-black shadow-lg"
            >
              <Ticket size={16} />
              <span>Claim Free Founder Spot</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
