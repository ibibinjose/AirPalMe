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
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { AirPalMascot } from "@/components/brand/AirPalMascot";
import { ConfettiBurst } from "@/components/brand/ConfettiBurst";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { getFirebaseDb } from "@/lib/firebase";
import { fetchInviteOverview, inviteLinkFor } from "@/lib/app-invites";
import { REFERRAL_POINTS, foundingPoolState } from "@shared/promotions";
import { cn } from "@/lib/cn";

const DOC_ID = "founders-100k";
const CAP = 100000;
const TICKER = "JULY CARRY-ON /// SYDNEY WEEKEND FOR TWO /// 10 × $100 AIRPAL CREDIT /// LIFETIME FOUNDER STATUS /// 100% FREE ENTRY ///";

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
  color: string;
}

const PRIZES: PrizeItem[] = [
  {
    id: "july",
    n: "01",
    name: "July Carry-On Light Expandable",
    badge: "Grand Prize · Winner's Choice",
    highlight: "Rated 4.9 ★ · 500+ reviews · Lifetime warranty",
    line: "July's ultra-popular expandable cabin case engineered from aerospace polycarbonate. The lucky winner gets to pick their favorite colour (Forest Green, Sand, Navy, Black, Moss)!",
    bullets: ["Super lightweight & durable", "Expandable zip capacity (+7L)", "Silent 360° spinner wheels", "Lifetime July manufacturer warranty"],
    link: "https://july.com/au/luggage/carry-on-light-expandable/",
    linkText: "Check it out on July.com",
    icon: Luggage,
    color: "from-amber-500/10 to-orange-500/5 border-amber-200 text-amber-900",
  },
  {
    id: "sydney",
    n: "02",
    name: "Sydney VIP Luxury Weekend for Two",
    badge: "Weekend Getaway For Two",
    highlight: "5-Star Stay + Chef's Dinner + Sunset Harbour Cruise",
    line: "An unforgettable Sydney weekend package for you and a bestie. Includes a boutique luxury hotel stay, a multi-course chef's dinner with wine pairings, and harbour experiences.",
    bullets: ["2 nights boutique luxury stay", "Chef's curated tasting menu", "Private sunset harbour cruise", "Zero stress, all fun"],
    icon: BedDouble,
    color: "from-blue-500/10 to-indigo-500/5 border-blue-200 text-blue-900",
  },
  {
    id: "credits",
    n: "03",
    name: "Ten × $100 AirPal Credits",
    badge: "Ten Happy Winners",
    highlight: "10 Founders · $100 Cash Credit Each",
    line: "Ten lucky founding members get $100 in AirPal credits directly in their wallet. Spend it on verified Mates, weekend stays, local events, or food & dining!",
    bullets: ["10 winners drawn at random", "$100 AirPal credit each", "Usable across all AirPal services", "Instant credit to your wallet"],
    icon: Gift,
    color: "from-emerald-500/10 to-teal-500/5 border-emerald-200 text-emerald-900",
  },
  {
    id: "status",
    n: "04",
    name: "Lifetime Founder Status & Gold Badge",
    badge: "For Every Single Founder",
    highlight: "Permanent Gold Seal on Profile",
    line: "Every member in the 100K pool keeps their permanent Gold Founder badge and member number forever — proof that you were here from day one when AirPal was born.",
    bullets: ["Permanent Gold Founder profile badge", "Your personal founder number forever", "2× bonus referral points stacking", "VIP early access to new feature drops"],
    icon: BadgeCheck,
    color: "from-brand/10 to-brand/5 border-brand/20 text-brand",
  },
];

const ROADMAP = [
  { top: "Now", label: "Pool is Open", desc: "Sign up free in 30 seconds. Your entry locks your founder number." },
  { top: "100,000", label: "Pool Seals", desc: "Doors shut the moment spot 100,000 is claimed." },
  { top: "Dec 31", label: "Entries Close", desc: "Final celebration & close for the founding pool." },
  { top: "Jan 15", label: "Winners Drawn", desc: "Random draw broadcast in Sydney. Winners notified in-app." },
];

const FAQS = [
  {
    q: "Is entry into the 100K Founders Club completely free?",
    a: "Yes, 100% free! No credit card, no entry fees, and no purchase necessary. Simply create your free AirPal account and claim your unique @handle before the 100,000 spot limit is reached.",
  },
  {
    q: "Who is eligible to participate and win prizes?",
    a: "The Founders 100K giveaway is open to Australian residents aged 18 and over with an active AirPal account. Each person is entitled to one official founding entry.",
  },
  {
    q: "What do I get when my mates join with my link?",
    a: `Every friend who signs up using your personal invite link is counted as your crew referral. You earn +${REFERRAL_POINTS} bonus points for each mate who joins, giving you extra bragging rights, badges, and loyalty rewards!`,
  },
  {
    q: "How and when are winners chosen?",
    a: "Winners are drawn using a verified random draw when the founding pool seals. Winners are notified directly by email and in their AirPal Inbox.",
  },
  {
    q: "What is Lifetime Founder Status?",
    a: "Your founder number (e.g. #004,281 of 100,000) and Gold Founder Badge stay on your profile forever as proof that you were one of the original members of AirPal.",
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
  const [celebrate, setCelebrate] = useState(0);

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
    setCelebrate((n) => n + 1);
    toast.success("Invite link copied! Share it with your friends.");
    window.setTimeout(() => setCopied(false), 2500);
  }

  async function shareNative() {
    const text = "Join me as an AirPal founding member! Free entry into the July carry-on & Sydney weekend giveaway:";
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
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-brand selection:text-white">
      <ConfettiBurst fireKey={celebrate} />
      
      {/* Gentle ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-blue-100/60 blur-[130px]" />
        <div className="absolute top-1/3 -right-40 h-[400px] w-[500px] rounded-full bg-amber-100/50 blur-[120px]" />
        <div className="absolute bottom-10 -left-40 h-[400px] w-[500px] rounded-full bg-emerald-50/70 blur-[120px]" />
      </div>

      {/* Top Banner Notice */}
      <div className="relative z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
            <span className="font-bold tracking-wide text-slate-800">AIRPAL FOUNDERS CLUB · AUSTRALIA</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <span>{poolKnown ? `${fmt(pool.left)} Spots Left` : "100,000 spots"}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline text-brand font-bold">100% Free Entry 🎉</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 overflow-hidden pb-16 pt-8 md:pt-14">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Left Column */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-xs font-bold text-amber-900 shadow-xs">
                <Sparkles size={14} className="text-amber-600 animate-spin-slow" />
                <span>LIMITED TO THE FIRST 100,000 FOUNDERS</span>
              </div>

              <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-black leading-[1.02] tracking-tight text-slate-900">
                First 100K in. <br />
                <span className="text-brand">Come join the crew! 🎉</span>
              </h1>

              <p className="max-w-xl text-base sm:text-lg leading-relaxed text-slate-600 font-normal">
                Win a sleek <strong className="text-slate-900 font-bold">July Expandable Carry-On</strong>, a fun <strong className="text-slate-900 font-bold">Sydney 5-Star Weekend for Two</strong>, and <strong className="text-slate-900 font-bold">$100 credits</strong> for ten founders. Lock in your free Founder Pass today!
              </p>

              {/* Action CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                {user ? (
                  <Button
                    size="lg"
                    onClick={() => {
                      const el = document.getElementById("crew-station");
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="gap-2 px-8 py-4 text-base font-bold bg-brand text-white hover:bg-brand/90 shadow-lg shadow-brand/25 border-0"
                  >
                    <Trophy size={18} />
                    <span>View My Founder Status</span>
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => nav(signupHref)}
                    className="gap-2 px-8 py-4 text-base font-bold bg-brand text-white hover:bg-brand/90 shadow-lg shadow-brand/25 border-0"
                  >
                    <span>Claim Free Founder Spot</span>
                    <ArrowRight size={18} />
                  </Button>
                )}

                <a
                  href="#prizes"
                  className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 shadow-xs transition hover:bg-slate-100"
                >
                  <span>See Prizes & Perks</span>
                  <ArrowDown size={15} />
                </a>
              </div>

              {/* Live Pool Progress Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm max-w-xl">
                <div className="flex items-center justify-between text-sm mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-lg">
                      {poolKnown ? fmt(pool.used) : "100,000"}
                    </span>
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                      {poolKnown ? "/ 100,000 claimed" : "spots · doors open soon"}
                    </span>
                  </div>
                  {poolKnown && (
                    <span className="font-mono text-xs font-bold text-brand bg-brand/10 px-3 py-1 rounded-full">
                      {pool.percent}% FULL
                    </span>
                  )}
                </div>

                <div
                  className="h-3.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 border border-slate-200"
                  role="progressbar"
                  aria-valuenow={poolKnown ? pool.percent : 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-brand shadow-xs transition-all duration-1000"
                    style={{ width: `${poolKnown ? Math.max(6, pool.percent) : 0}%` }}
                  />
                </div>

                <div className="mt-3.5 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>✨ 100% Free · No Card Required</span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 motion-safe:animate-pulse" aria-hidden />
                    {live ? "Live Pool Active" : "Enrollment Active"}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Youth-Friendly Light Founder Pass Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[360px] sm:max-w-[390px]">
                {/* Soft ambient shadow */}
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-amber-200/50 via-blue-200/40 to-indigo-200/50 blur-xl" aria-hidden />

                {/* Card Container */}
                <div className="relative rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-amber-50/40 p-6 sm:p-7 shadow-xl text-left">
                  
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand font-display font-black text-white text-lg shadow-md shadow-brand/20">
                        A
                      </div>
                      <div>
                        <p className="font-display text-sm font-black tracking-wider text-slate-900">AIRPAL.ME</p>
                        <p className="text-[10px] font-bold tracking-widest text-amber-600 uppercase">FOUNDERS CLUB</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-bold text-amber-900">
                      <Star size={12} className="fill-amber-500 text-amber-600" />
                      GOLD PASS
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="py-6 space-y-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">FOUNDING MEMBER</p>
                      <p className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        {user && handle ? `@${handle}` : "@YOUR_HANDLE"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">PASS NUMBER</p>
                        <p className="font-mono text-base font-black text-brand">
                          {myFounder !== null ? `#${String(myFounder).padStart(6, "0")}` : user ? "PENDING" : "#······"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">STATUS</p>
                        <p className="text-sm font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                          <Check size={15} className="stroke-[3]" /> VERIFIED
                        </p>
                      </div>
                    </div>

                    {/* Holographic Seal */}
                    <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-amber-600" />
                        <span className="text-xs font-bold text-amber-950">100K Founders Lock-in</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-700">SYD-2026</span>
                    </div>
                  </div>

                  {/* Card Bottom */}
                  <div className="border-t border-slate-200/80 pt-4 flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-600">
                      {user
                        ? myFounder !== null
                          ? `${referralCount} friends referred`
                          : "Enter to lock your number"
                        : "Free spots open now"}
                    </p>
                    <button
                      type="button"
                      onClick={shareNative}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-800 shadow-2xs transition hover:bg-slate-100"
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

      {/* Infinite Ticker Bar */}
      <div aria-hidden className="relative z-10 overflow-hidden bg-brand py-3.5 shadow-md">
        <div className="founders-ticker-track flex w-max whitespace-nowrap text-xs sm:text-sm font-black uppercase tracking-[0.16em] text-white [animation:founders-ticker_24s_linear_infinite]">
          <span className="pr-6">{TICKER.repeat(3)}</span>
          <span className="pr-6">{TICKER.repeat(3)}</span>
        </div>
      </div>

      {/* Road to the Draw Timeline */}
      <section className="relative z-10 bg-white py-14 border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-xs font-extrabold uppercase tracking-widest text-brand">POOL ROADMAP</p>
            <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              The Road to the Grand Draw
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ROADMAP.map((m, idx) => (
              <div
                key={m.label}
                className="relative rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-xs transition hover:bg-white hover:shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display text-lg font-black text-brand">
                    {m.top}
                  </span>
                  <span className="text-xs font-bold text-slate-400">0{idx + 1}</span>
                </div>
                <h3 className="font-display text-base font-bold text-slate-900">{m.label}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prizes Showcase — Sunny, Youth-Friendly Light Aesthetic */}
      <section id="prizes" className="relative z-10 bg-amber-50/40 py-16 md:py-24 border-b border-amber-200/60">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <AirPalMascot className="mx-auto h-32 w-auto sm:h-40" />
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-4 py-1.5 text-xs font-bold text-amber-900">
              <Gift size={14} className="text-amber-600" />
              <span>THE LAUNCH PRIZES & REWARDS</span>
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-slate-900">
              The Founding Perks & Prizes.
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
              Every prize is drawn directly from our 100,000 founding member family. 100% free entry, always.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PRIZES.map((p) => {
              const IconComp = p.icon;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "group relative overflow-hidden rounded-3xl border bg-gradient-to-b bg-white p-6 sm:p-8 shadow-sm hover:shadow-md transition flex flex-col justify-between",
                    p.color,
                  )}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-3xl font-black text-brand">
                        {p.n}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-800">
                        <IconComp size={14} className="text-brand" />
                        {p.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                        {p.name}
                      </h3>
                      <p className="text-xs sm:text-sm font-bold text-brand mt-1">
                        {p.highlight}
                      </p>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed font-normal">
                      {p.line}
                    </p>

                    <div className="border-t border-slate-100 pt-4 space-y-2">
                      {p.bullets.map((b) => (
                        <div key={b} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                          <Check size={14} className="text-emerald-600 shrink-0 stroke-[2.5]" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {p.link && (
                    <div className="pt-5 mt-4 border-t border-slate-100">
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
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
                className="gap-2 px-9 py-4 text-base font-bold bg-brand text-white hover:bg-brand/90 shadow-md shadow-brand/20"
              >
                <Share2 size={18} />
                <span>Get My Referral Invite Link</span>
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={() => nav(signupHref)}
                className="gap-2 px-9 py-4 text-base font-bold bg-brand text-white hover:bg-brand/90 shadow-md shadow-brand/20"
              >
                <Ticket size={18} />
                <span>I'm In — Claim My Free Founder Spot</span>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* How It Works — Super Simple */}
      <section className="relative z-10 bg-white py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-extrabold uppercase tracking-widest text-brand">EFFORTLESS ENTRY</p>
            <h2 className="font-display text-3xl sm:text-5xl font-black text-slate-900 mt-1">
              Three Steps. Zero Catch.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-7 shadow-xs">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-400 font-display text-xl font-black text-slate-950 mb-5 shadow-xs">
                1
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900">Sign Up Free</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Takes 30 seconds. Pick your personal @handle. No payment method or credit card required.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-7 shadow-xs">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand font-display text-xl font-black text-white mb-5 shadow-xs">
                2
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900">Lock Your Founder Pass</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Your entry is timestamped and secured the moment you register. Founder status stays forever.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-7 shadow-xs">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500 font-display text-xl font-black text-white mb-5 shadow-xs">
                3
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900">Bring Your Crew</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Share your invite link with mates. Every mate who joins earns you +{REFERRAL_POINTS} bonus points!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission band — why joining matters beyond the prizes */}
      <section className="relative z-10 bg-mango py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-extrabold uppercase tracking-widest text-ink/60">WHY JOIN</p>
              <h2 className="font-display mt-2 text-3xl sm:text-5xl font-black tracking-tight text-ink">
                Join to make a change.
              </h2>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-ink/75">
                AirPal is built by the people who use it. The first 100,000 founders shape the
                marketplace — what launches, what stays, what goes.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => nav(signupHref)}
              className="gap-2 shrink-0 bg-ink px-8 py-4 text-base font-bold text-white hover:bg-black"
            >
              <span>Join the 100K</span>
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </section>

      {/* Crew Referral Station */}
      <section id="crew-station" className="relative z-10 py-16 md:py-24 bg-gradient-to-br from-brand via-indigo-600 to-brand text-white">
        <div className="mx-auto max-w-5xl px-5 text-center sm:text-left">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1 text-xs font-bold text-white">
                <Users size={14} />
                <span>REFERRAL ACCELERATOR</span>
              </div>
              <h2 className="font-display text-3xl sm:text-5xl font-black text-white leading-tight">
                Your link. Your crew. <br />
                Your points.
              </h2>
              <p className="text-white/85 text-sm sm:text-base leading-relaxed">
                Every friend who signs up with your personal invite link is recorded as your crew referral — earning you +{REFERRAL_POINTS} points each.
              </p>

              {user && (
                <div className="grid grid-cols-2 gap-3 pt-2 max-w-md">
                  <div className="rounded-2xl bg-black/20 p-3.5 border border-white/15">
                    <p className="text-[11px] font-semibold text-white/75 uppercase">CREW REFERRED</p>
                    <p className="font-display text-2xl font-black text-amber-300">{referralCount}</p>
                  </div>
                  <div className="rounded-2xl bg-black/20 p-3.5 border border-white/15">
                    <p className="text-[11px] font-semibold text-white/75 uppercase">YOUR ENTRY</p>
                    <p className="font-display text-2xl font-black text-white">
                      {myFounder !== null ? `#${myFounder.toLocaleString("en-AU")}` : "—"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-white/20 bg-white/10 p-6 sm:p-7 backdrop-blur-xl shadow-2xl text-left">
                {myLink ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-white/80 uppercase">YOUR PERSONAL INVITE LINK</p>
                      <div className="mt-1.5 flex items-center gap-2 rounded-2xl bg-white p-2 border border-white/30 text-slate-900 shadow-sm">
                        <span className="font-mono text-xs text-slate-800 truncate flex-1 pl-1.5 font-medium">{myLink}</span>
                        <Button
                          size="sm"
                          onClick={copyLink}
                          className="shrink-0 gap-1.5 px-3.5 text-xs font-bold bg-brand text-white hover:bg-brand/90"
                        >
                          {copied ? <Check size={14} className="text-white" /> : <Copy size={14} />}
                          <span>{copied ? "Copied!" : "Copy"}</span>
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join me as an AirPal founding member — free entry into the July carry-on + Sydney weekend giveaway: ${myLink}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 text-xs font-bold text-white transition hover:bg-emerald-600 shadow-sm"
                      >
                        <MessageCircle size={14} />
                        <span>WhatsApp</span>
                      </a>
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Claimed my AirPal founder pass! First 100K get free entry into the July carry-on + Sydney weekend giveaway: `)}&url=${encodeURIComponent(myLink)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-black px-3 text-xs font-bold text-white transition hover:bg-slate-900 shadow-sm"
                      >
                        <span>Post to 𝕏</span>
                      </a>
                    </div>

                    <Button
                      variant="light"
                      onClick={shareNative}
                      className="w-full justify-center gap-2 py-3 text-xs font-bold text-slate-900"
                    >
                      <Share2 size={15} />
                      <span>Share on Device</span>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 text-center">
                    <AirPalMascot className="mx-auto h-24 w-auto" />
                    <div>
                      <h4 className="font-display text-xl font-bold text-white">Get Your Invite Link</h4>
                      <p className="text-xs text-white/80 mt-1">
                        Sign up in 30 seconds to get your personal referral link and start stacking points!
                      </p>
                    </div>
                    <Button
                      size="lg"
                      variant="light"
                      onClick={() => nav(signupHref)}
                      className="w-full justify-center gap-2 py-3.5 text-sm font-bold text-slate-900"
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
      <section className="relative z-10 bg-slate-50 py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-5">
          <div className="text-center max-w-xl mx-auto mb-12">
            <p className="text-xs font-extrabold uppercase tracking-widest text-brand">FREQUENTLY ASKED</p>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-slate-900 mt-1">
              Everything You Need to Know
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between p-5 text-left text-sm sm:text-base font-bold text-slate-900 hover:text-brand transition"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      className={cn("text-slate-400 transition-transform duration-200", isOpen && "rotate-180 text-brand")}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm leading-relaxed text-slate-600 border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Official Fine Print Notice */}
      <section className="relative z-10 bg-white border-t border-slate-200 py-10">
        <div className="mx-auto max-w-6xl px-5 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p className="max-w-3xl leading-relaxed">
              <strong>Official Notice:</strong> 100% Free Entry · Open to Australian residents aged 18+ · Capped at 100,000 eligible entries · Winners drawn at random from the founding pool and announced in-app · Entry does not guarantee winning · The July suitcase prize is purchased at retail and is not sponsored by July.
            </p>
            <div className="flex items-center gap-4 shrink-0 font-medium">
              <Link href="/terms" className="text-slate-600 hover:text-brand hover:underline">
                Terms
              </Link>
              <span>·</span>
              <Link href="/privacy" className="text-slate-600 hover:text-brand hover:underline">
                Privacy
              </Link>
            </div>
          </div>
          <p className="font-display mt-6 text-center text-sm font-bold text-ink sm:text-left">
            Built by Bibin, for you.
          </p>
        </div>
      </section>

      {/* Sticky Mobile Floating Action Dock */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden shadow-lg">
        <div className="flex items-center gap-2">
          {user ? (
            <Button
              onClick={shareNative}
              className="w-full justify-center py-3.5 text-sm font-bold bg-brand text-white shadow-md shadow-brand/20"
            >
              <Share2 size={16} />
              <span>Share My Founder Pass</span>
            </Button>
          ) : (
            <Button
              onClick={() => nav(signupHref)}
              className="w-full justify-center py-3.5 text-sm font-bold bg-brand text-white shadow-md shadow-brand/20"
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
