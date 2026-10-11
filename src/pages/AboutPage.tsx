import { Link } from "wouter";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Compass,
  HeartHandshake,
  Mail,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { LEGAL } from "@/lib/legal";
import { triggerHaptic } from "@/lib/native";

const VERTICALS = [
  {
    icon: Ticket,
    title: "AirPal Pass",
    subtitle: "Events & Access",
    desc: "Live concerts, Indian cultural festivals, and scannable tickets with native Stripe checkout and 1-tap Apple/Google Wallet passbooks.",
    href: "/pass",
    cta: "Explore Passes",
    badge: "Events",
  },
  {
    icon: Compass,
    title: "What now?",
    subtitle: "Discovery",
    desc: "Tell AirPal your urge and time window — get ambient suggestions for right now, with live weather, outfit recommendations, and precinct guides.",
    href: "/now",
    cta: "What now?",
    badge: "Discovery",
  },
  {
    icon: CalendarDays,
    title: "Hangouts & Plans",
    subtitle: "Planning",
    desc: "Coordinate with your crew: stops voting, one-tap web RSVPs, and synced personal calendar — no account required to view.",
    href: "/plan",
    cta: "Create a Plan",
    badge: "Planning",
  },
  {
    icon: Building2,
    title: "Arrival & Business",
    subtitle: "PBSA & Commerce",
    desc: "B2B2C PBSA resident onboarding, cohort loneliness mitigation, executive Belonging Reports, and local merchant perks.",
    href: "/business",
    cta: "For Business",
    badge: "Arrival Engine",
  },
  {
    icon: Sparkles,
    title: "Circle & Digital Bio",
    subtitle: "Identity (@handle)",
    desc: "One universal link for your world: your public bio, live presence check-in, connector quests, and inner circle hangouts.",
    href: "/circle",
    cta: "Explore Circle",
    badge: "Networking",
  },
];

const ARRIVAL_ENGINE_POINTS = [
  {
    icon: Users,
    title: "60-Second Resident Check-In",
    desc: "Check in with your building code or scan the reception QR plaque. Instant building cohort assignment and room orientation without waiting.",
  },
  {
    icon: HeartHandshake,
    title: "Loneliness Mitigation Index",
    desc: "Mitigate resident isolation from day one. Connect with fellow residents living on your floor and in your building cohort through shared meetups.",
  },
  {
    icon: Compass,
    title: "Local Precinct Perks",
    desc: "Curated student and resident perks from nearby cafes, gyms, and dining spots. Discover the precinct like a local from your first week.",
  },
  {
    icon: CalendarDays,
    title: "Tonight's Resident Events",
    desc: "Floor dinners, campus tours, and weekend hangouts organized right inside the app. Residents RSVP with one tap.",
  },
  {
    icon: MessageSquare,
    title: "Incident & Support Dispatch",
    desc: "Need room assistance or building maintenance? Dispatch support tickets straight to the building desk with real-time tracking.",
  },
  {
    icon: Building2,
    title: "Executive Belonging Reports",
    desc: "For accommodation operators: comprehensive Belonging Reports showing cohort connectivity rates, loneliness mitigation, and retention metrics.",
  },
];

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: "Verified Identity & Moderation",
    desc: "Phone and email verification, human admin review of moderation cases, and encrypted Stripe payment rails.",
  },
  {
    icon: Smartphone,
    title: "Cross-Platform Access",
    desc: "Seamless on Web, iOS, and Android. Lightweight, instant loading, and optimized with Apple HIG ergonomics.",
  },
  {
    icon: Users,
    title: "Single Universal Account",
    desc: "One universal login across all 5 ecosystem pillars — never fragmented logins or parallel accounts.",
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-paper/90 px-3.5 py-1 text-xs font-bold text-accent shadow-md backdrop-blur-md">
              <Sparkles size={13} className="text-accent" />
              <span>Life Made Easy</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-paper/80 px-3 py-1 text-xs font-semibold text-ink/80 shadow-md backdrop-blur-md">
              <MapPin size={12} className="text-red-500" />
              <span>Sydney & Worldwide</span>
            </span>
          </div>

          <div className="absolute inset-x-4 bottom-4 sm:inset-x-6 sm:bottom-6 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">The AirPal Mission</p>
            <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl max-w-3xl leading-tight">
              People, places, things and experiences — made easier.
            </h1>
          </div>
        </div>

        <div className="p-6 sm:p-8 md:p-10 bg-card">
          <p className="text-base sm:text-lg leading-relaxed text-ink/85 max-w-3xl">
            <strong className="font-bold text-ink">AirPal.me</strong> is a trusted, people-powered master ecosystem
            and discovery platform. In Sydney and worldwide, we connect friends, family, colleagues, and mates with
            live events, social plans, resident arrival cohorts, and real-time community discovery.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-mute">
            <span className="rounded-full bg-brand/10 px-3 py-1 text-accent">ME = Made Easy</span>
            <span>·</span>
            <span>One Unified Platform</span>
            <span>·</span>
            <span>Zero Wasted Time</span>
          </div>
        </div>
      </div>

      {/* The 5 Pillars Grid */}
      <div className="mt-12">
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Master Ecosystem</p>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Five Pillars. One Account.
            </h2>
          </div>
          <p className="text-xs text-mute sm:max-w-xs sm:text-right">
            Every pillar shares one identity, trust system, and seamless interaction loop.
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
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand/10 text-accent ring-1 ring-brand/20 transition-transform group-hover:scale-105">
                      <Icon size={20} strokeWidth={2} />
                    </span>
                    <span className="rounded-full bg-paper px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mute ring-1 ring-line/60">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="font-display mt-4 text-base font-bold text-ink group-hover:text-accent transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-mute leading-relaxed line-clamp-3">{item.desc}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-line/60">
                  <Link
                    href={item.href}
                    onClick={() => void triggerHaptic("light")}
                    className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-accent hover:underline"
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

      {/* Arrival & Belonging Engine */}
      <div className="mt-12">
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Arrival Engine</p>
        <h2 className="font-display mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          The student onboarding companion — and Belonging Reports behind it.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-mute sm:text-base">
          AirPal is the B2B2C Arrival Engine for PBSA student accommodation, residential colleges, and campus communities.
          Residents get 60-second check-in and instant cohort connection. Operators get quantifiable Belonging Reports.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ARRIVAL_ENGINE_POINTS.map((pt) => {
            const Icon = pt.icon;
            return (
              <div key={pt.title} className="rounded-[28px] bg-card p-5 ring-1 ring-line/80 shadow-xs">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand/10 text-accent ring-1 ring-brand/20">
                  <Icon size={20} strokeWidth={2} />
                </span>
                <h3 className="font-display mt-4 text-base font-bold text-ink">{pt.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-mute sm:text-[13px]">{pt.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-[28px] bg-neutral-900 p-6 text-white sm:p-8">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">For PBSA Operators & Hosts</p>
          <h3 className="font-display mt-1 text-xl font-bold tracking-tight sm:text-2xl">
            Empower belonging from night one.
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
            Track resident cohort connectivity, loneliness mitigation indexes, and retention metrics. Dispatch
            resident support and connect residents with verified local merchants.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link
              href="/join"
              onClick={() => void triggerHaptic("light")}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-ink transition hover:bg-white/90 active:scale-[0.98]"
            >
              Resident Arrival Check-In <ArrowRight size={16} />
            </Link>
            <Link
              href="/host"
              onClick={() => void triggerHaptic("light")}
              className="inline-flex min-h-[44px] items-center rounded-full px-6 text-sm font-bold text-white ring-1 ring-white/30 transition hover:bg-white/10 active:scale-[0.98]"
            >
              Belonging Reports & Console
            </Link>
          </div>
        </div>
      </div>

      {/* Trust & Safety Highlights */}
      <div className="mt-12 rounded-[32px] bg-paper/60 p-6 sm:p-8 ring-1 ring-line/80 backdrop-blur-md shadow-2xs">
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Built on Trust</p>
        <h2 className="font-display mt-1 text-xl font-bold text-ink sm:text-2xl">
          Trust & Safety Are Core Product Features
        </h2>
        <Link
          href="/trust"
          onClick={() => void triggerHaptic("light")}
          className="mt-2 inline-block text-xs font-bold text-accent hover:underline"
        >
          Company facts, verification & what AirPal.Me isn&apos;t →
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {TRUST_POINTS.map((pt) => {
            const Icon = pt.icon;
            return (
              <div key={pt.title} className="flex flex-col gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-card text-accent ring-1 ring-line">
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
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Australian Roots</p>
            <h3 className="font-display mt-1 text-lg font-bold text-ink sm:text-xl">Born in The Rocks, Sydney.</h3>
            <p className="mt-2 text-xs sm:text-sm text-mute leading-relaxed">
              We started amidst sandstone lanes, harbour weather, and historic hospitality. Built in{" "}
              <strong className="text-ink font-semibold">{LEGAL.location}</strong>. {LEGAL.brand} is proudly operated by{" "}
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
