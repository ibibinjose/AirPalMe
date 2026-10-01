import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { DEMO_SHOWCASE } from "@shared/demo-business";

const LOOP = ["Want", "Discover", "Connect", "Plan", "Go", "Remember"] as const;

const STOPS: { n: string; title: string; body: string; href: string; cta: string; account?: boolean }[] = [
  {
    n: "01",
    title: "See tonight",
    body: "Open Home: tonight near you, live from the city. No account needed.",
    href: "/",
    cta: "Open Home",
  },
  {
    n: "02",
    title: "Find your people",
    body: "AirPal Mate: say what you want to do, get matched with someone to go with.",
    href: "/mate",
    cta: "Meet Mates",
  },
  {
    n: "03",
    title: "Make the plan",
    body: "What, when, where, who — then an invite link that just works.",
    href: "/plan/new",
    cta: "Start a plan",
    account: true,
  },
  {
    n: "04",
    title: "Scan a stay",
    body: "The hotel binder, replaced: Wi-Fi, dining, housekeeping in one scan. Try it live.",
    href: "/DemoHotel",
    cta: "Tour the demo hotel",
  },
  {
    n: "05",
    title: "Book the night",
    body: "Events, festivals, and experiences with real tickets and check-in.",
    href: "/calendar",
    cta: "What's on",
  },
  {
    n: "06",
    title: "List a business",
    body: "Onboard a venue, host a stay, publish an event — then get paid.",
    href: "/join",
    cta: "Join as a business",
  },
  {
    n: "07",
    title: "Keep the night",
    body: "Ticket wallet, memories, people met — then do it again.",
    href: "/me/tickets",
    cta: "Open wallet",
    account: true,
  },
];

const TRUST = [
  { title: "Verified Mates", body: "ID checks plus human approval before anyone earns." },
  { title: "Held payouts", body: "Money releases after delivery. Refunds with teeth." },
  { title: "Report anything", body: "Block, report, moderated — with a human in the loop." },
];

type DemoDocState = "checking" | "live" | "missing";

/**
 * The demo business as built through the real onboarding flows, with live
 * build status. Every doc read is guest-safe: demo docs are public when
 * live, and anything else (missing, unpublished, backend offline) renders
 * honestly as "Not live" instead of a broken link.
 */
function DemoBusinessStatus() {
  const { isAdmin } = useAuth();
  const [states, setStates] = useState<Record<string, DemoDocState>>(() =>
    Object.fromEntries(DEMO_SHOWCASE.map((s) => [s.key, "checking" as DemoDocState])),
  );

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) {
      setStates(Object.fromEntries(DEMO_SHOWCASE.map((s) => [s.key, "missing" as DemoDocState])));
      return;
    }
    const unsubs = DEMO_SHOWCASE.map((stop) =>
      onSnapshot(
        doc(db, stop.collection, stop.docId),
        (snap) => {
          const live = snap.exists() && snap.data()?.demo === true;
          setStates((prev) => ({ ...prev, [stop.key]: live ? "live" : "missing" }));
        },
        () => setStates((prev) => ({ ...prev, [stop.key]: "missing" })),
      ),
    );
    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  return (
    <section aria-label="Demo business status" className="mt-12">
      <h2 className="font-display text-2xl font-bold tracking-tight text-ink">The demo business, live</h2>
      <p className="mt-1 max-w-xl text-[13px] leading-5 text-mute">
        Demo Harbour Hotel — onboarded as a listing, a stay, and an event through the real business
        flows. Open each one exactly as a guest would.
      </p>
      <ul className="mt-4 space-y-2.5">
        {DEMO_SHOWCASE.map((stop) => {
          const state = states[stop.key] || "checking";
          const badge =
            state === "live" ? (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 ring-1 ring-emerald-500/25">
                Live
              </span>
            ) : state === "checking" ? (
              <span className="motion-safe:animate-pulse rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mute ring-1 ring-line">
                Checking…
              </span>
            ) : (
              <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mute ring-1 ring-line">
                Not live
              </span>
            );
          const inner = (
            <>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold text-ink">{stop.title}</span>
                  {badge}
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-mute">{stop.body}</span>
                {state === "live" ? (
                  <span className="mt-1 block text-[13px] font-bold text-brand">Open it →</span>
                ) : state === "missing" && isAdmin ? (
                  <span className="mt-1 block text-[13px] font-bold text-brand">
                    Build it in Admin → Demo →
                  </span>
                ) : state === "missing" ? (
                  <span className="mt-1 block text-[13px] text-mute">
                    Not built yet — an admin builds it from Admin → Demo.
                  </span>
                ) : null}
              </span>
              <ArrowUpRight
                size={18}
                className="shrink-0 text-mute transition group-hover:text-brand"
                aria-hidden
              />
            </>
          );
          const cls =
            "group flex items-center gap-4 rounded-3xl bg-card p-4 ring-1 ring-line shadow-xs transition active:scale-[0.99]";
          return (
            <li key={stop.key}>
              {state === "live" ? (
                <Link href={stop.href} className={`${cls} hover:ring-brand/30`}>
                  {inner}
                </Link>
              ) : state === "missing" && isAdmin ? (
                <Link href="/admin" className={`${cls} hover:ring-brand/30`}>
                  {inner}
                </Link>
              ) : (
                <div className={cls} aria-busy={state === "checking"}>
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Public showcase tour (/Demo): the full AirPal loop as clickable stops.
 * Every stop is a live route — nothing here is mock UI.
 */
export function DemoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-8 md:pt-12">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">Showcase tour</p>
      <h1 className="font-display mt-2 text-4xl font-bold tracking-tight text-ink md:text-5xl">
        AirPal.me in five minutes
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-mute">
        One loop: want something, find who, make the plan, go. Walk it below — every stop is live.
      </p>

      <ol aria-label="The AirPal loop" className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2">
        {LOOP.map((step, i) => (
          <li key={step} className="flex items-center gap-2">
            <span className="rounded-full bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand ring-1 ring-brand/20">
              {step}
            </span>
            {i < LOOP.length - 1 && (
              <ArrowRight size={14} className="text-mute" aria-hidden />
            )}
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-6 text-sm font-bold text-white shadow-[0_6px_20px_rgba(18,22,20,0.15)] transition hover:bg-brand-ink active:scale-[0.98]"
        >
          Start exploring <ArrowRight size={16} />
        </Link>
        <Link
          href="/getAirPalApp"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-card px-6 text-sm font-bold text-ink ring-1 ring-line transition hover:bg-paper active:scale-[0.98]"
        >
          Get the app
        </Link>
      </div>

      <DemoBusinessStatus />

      <h2 className="font-display mt-12 text-2xl font-bold tracking-tight text-ink">The tour</h2>
      <ol className="mt-4 space-y-2.5">
        {STOPS.map((s) => (
          <li key={s.n}>
            <Link
              href={s.href}
              className="group flex items-center gap-4 rounded-3xl bg-card p-4 ring-1 ring-line shadow-xs transition hover:ring-brand/30 active:scale-[0.99]"
            >
              <span className="font-display w-9 shrink-0 text-lg font-bold text-mute transition group-hover:text-brand">
                {s.n}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold text-ink">{s.title}</span>
                  {s.account && (
                    <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mute ring-1 ring-line">
                      Account
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-mute">{s.body}</span>
                <span className="mt-1 block text-[13px] font-bold text-brand">
                  {s.cta} →
                </span>
              </span>
              <ArrowUpRight
                size={18}
                className="shrink-0 text-mute transition group-hover:text-brand"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ol>

      <h2 className="font-display mt-12 text-2xl font-bold tracking-tight text-ink">Why people trust it</h2>
      <ul className="mt-4 grid gap-2.5 sm:grid-cols-3">
        {TRUST.map((t) => (
          <li key={t.title} className="rounded-3xl bg-card p-4 ring-1 ring-line shadow-xs">
            <p className="text-sm font-bold text-ink">{t.title}</p>
            <p className="mt-1 text-[13px] leading-5 text-mute">{t.body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-12 rounded-3xl bg-ink p-6 text-white md:p-8">
        <p className="font-display text-2xl font-bold tracking-tight">Someone wants to do something.</p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">
          AirPal finds the right person, place, or experience — then makes the transaction safe.
          That is the whole company.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link
            href="/join"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-ink transition hover:bg-white/90 active:scale-[0.98]"
          >
            List your business <ArrowRight size={16} />
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-11 items-center rounded-full px-6 text-sm font-bold text-white ring-1 ring-white/30 transition hover:bg-white/10 active:scale-[0.98]"
          >
            Talk to us
          </Link>
        </div>
      </div>
    </div>
  );
}
