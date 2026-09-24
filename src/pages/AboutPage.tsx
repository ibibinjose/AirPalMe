import { Link } from "wouter";
import {
  Activity,
  ArrowRight,
  AtSign,
  Building2,
  CalendarDays,
  Compass,
  HeartHandshake,
  Mail,
  MapPin,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { LEGAL } from "@/lib/legal";
import { triggerHaptic } from "@/lib/native";

const VERTICALS = [
  {
    icon: HeartHandshake,
    title: "AirPal Mate & Circles",
    subtitle: "People",
    desc: "Connect your circle of friends, family, and colleagues, or find a trusted Mate to go with you based on real availability, shared interests, and verified badges.",
    href: "/mate",
    cta: "Find a Mate",
    badge: "Social & Connection",
    accent: "from-blue-600 to-indigo-700",
  },
  {
    icon: Building2,
    title: "AirPal Stay",
    subtitle: "Places",
    desc: "Boutique hotels, hostels, serviced apartments, and campus stays with frictionless digital concierge, local guides, and instant room tools.",
    href: "/explore",
    cta: "Explore Stays",
    badge: "Hospitality",
    accent: "from-indigo-600 to-violet-700",
  },
  {
    icon: Compass,
    title: "AirPal Experiences",
    subtitle: "Experiences",
    desc: "Discover local tours, food trails, workshops, and outdoor adventures curated by passionate hosts and local creators.",
    href: "/experiences",
    cta: "Find Experiences",
    badge: "Activities",
    accent: "from-violet-600 to-purple-700",
  },
  {
    icon: Activity,
    title: "AirPal Pulse",
    subtitle: "Quality & Voice",
    desc: "Instant, real-time feedback with dynamic QR codes for cafes, hotels, and events. Turn negative sentiment into immediate resolutions.",
    href: "/pulse",
    cta: "Create a Pulse",
    badge: "Real-Time VoC",
    accent: "from-emerald-600 to-teal-700",
  },
  {
    icon: CalendarDays,
    title: "AirPal Daily & Events",
    subtitle: "Discovery",
    desc: "What's happening near you right now. Gigs, community markets, festivals, and local drops tied directly to shared plans.",
    href: "/calendar",
    cta: "View Events",
    badge: "What's On",
    accent: "from-amber-500 to-orange-600",
  },
  {
    icon: AtSign,
    title: "AirPal Bio Link",
    subtitle: "Identity (@handle)",
    desc: "One universal link for your whole world: your plans, favourite stays, shop, and social circles at airpal.me/@you.",
    href: "/bio/setup",
    cta: "Claim Your @handle",
    badge: "Link-in-Bio",
    accent: "from-pink-600 to-rose-700",
  },
];

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: "Verified Identity & Reviews",
    desc: "Identity verification where required, transaction-backed reviews, and safety checks on every listing and provider.",
  },
  {
    icon: Smartphone,
    title: "Cross-Platform Access",
    desc: "Seamless on Web, iOS, and Android. Lightweight, instant loading, and optimized for mobile-first speed.",
  },
  {
    icon: Users,
    title: "One Platform Engine",
    desc: "Single universal login across all 6 verticals — never fragmented logins or disconnected apps.",
  },
];

export function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-[32px] bg-card ring-1 ring-line shadow-xs">
        <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden">
          <Photo
            src="/media/harbour.jpg"
            className="h-full w-full object-cover brightness-90 transition-transform duration-700 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />

          {/* Floating Badges */}
          <div className="absolute left-4 top-4 sm:left-6 sm:top-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-paper/90 px-3.5 py-1 text-xs font-bold text-brand shadow-md backdrop-blur-md">
              <Sparkles size={13} className="text-gold" />
              <span>Life Made Easy</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-paper/80 px-3 py-1 text-xs font-semibold text-ink/80 shadow-md backdrop-blur-md">
              <MapPin size={12} className="text-red-500" />
              <span>Sydney & Worldwide</span>
            </span>
          </div>

          <div className="absolute inset-x-4 bottom-4 sm:inset-x-6 sm:bottom-6 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">The AirPal Mission</p>
            <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl max-w-3xl leading-tight">
              People, places, things and experiences — made easier.
            </h1>
          </div>
        </div>

        <div className="p-6 sm:p-8 md:p-10 bg-card">
          <p className="text-base sm:text-lg leading-relaxed text-ink/85 max-w-3xl">
            <strong className="font-bold text-ink">AirPal.me</strong> is a trusted, people-powered global marketplace
            and discovery platform. In any city worldwide, we connect friends, family, colleagues, and mates with
            unforgettable stays, local activities, and real-time community discovery.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-mute">
            <span className="rounded-full bg-brand/10 px-3 py-1 text-brand">ME = Made Easy</span>
            <span>·</span>
            <span>One Unified Platform</span>
            <span>·</span>
            <span>Zero Wasted Time</span>
          </div>
        </div>
      </div>

      {/* The 6 Verticals Grid */}
      <div className="mt-12">
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gold">Platform Ecosystem</p>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              One Engine. Six Verticals.
            </h2>
          </div>
          <p className="text-xs text-mute sm:max-w-xs sm:text-right">
            Every vertical shares one identity, trust system, and seamless booking loop.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VERTICALS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="group relative flex flex-col justify-between rounded-[28px] bg-card p-5 ring-1 ring-line/80 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-brand/30"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20 transition-transform group-hover:scale-105">
                      <Icon size={20} strokeWidth={2} />
                    </span>
                    <span className="rounded-full bg-paper px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mute ring-1 ring-line/60">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="font-display mt-4 text-base font-bold text-ink group-hover:text-brand transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-mute leading-relaxed line-clamp-3">{item.desc}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-line/60">
                  <Link
                    href={item.href}
                    onClick={() => void triggerHaptic("light")}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
                  >
                    <span>{item.cta}</span>
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trust & Safety Highlights */}
      <div className="mt-12 rounded-[32px] bg-paper/60 p-6 sm:p-8 ring-1 ring-line/80 backdrop-blur-md shadow-2xs">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gold">Built on Trust</p>
        <h2 className="font-display mt-1 text-xl font-bold text-ink sm:text-2xl">
          Trust & Safety Are Core Product Features
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {TRUST_POINTS.map((pt) => {
            const Icon = pt.icon;
            return (
              <div key={pt.title} className="flex flex-col gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-card text-brand ring-1 ring-line">
                  <Icon size={18} />
                </span>
                <h4 className="text-sm font-bold text-ink">{pt.title}</h4>
                <p className="text-xs text-mute leading-relaxed">{pt.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Origin & Company Accreditation */}
      <div className="mt-12 rounded-[32px] bg-card p-6 sm:p-8 ring-1 ring-line shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gold">Australian Roots</p>
            <h3 className="font-display mt-1 text-lg font-bold text-ink sm:text-xl">
              Born in The Rocks, Sydney.
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-mute leading-relaxed">
              We started amidst sandstone lanes, harbour weather, and historic hospitality. Built in{" "}
              <strong className="text-ink font-semibold">{LEGAL.location}</strong>.{" "}
              {LEGAL.brand} is proudly operated by{" "}
              <strong className="text-ink font-semibold">{LEGAL.company}</strong> (ABN {LEGAL.abn}).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <Link
              href="/contact"
              onClick={() => void triggerHaptic("light")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-xs font-bold text-white shadow-md hover:bg-brand-ink transition active:scale-95"
            >
              <Mail size={15} />
              <span>Contact Us</span>
            </Link>
            <Link
              href="/privacy"
              onClick={() => void triggerHaptic("light")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-paper px-5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition active:scale-95"
            >
              <span>Privacy & Legal</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
