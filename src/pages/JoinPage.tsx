import { useLocation } from "wouter";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Lock,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useEvents } from "@/contexts/EventsContext";

export function JoinPage() {
  const [, nav] = useLocation();
  const { user, isHost, authReady } = useAuth();
  const { business } = useBio();
  const { myEvent } = useEvents();

  if (!authReady) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-mute">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      {/* Header */}
      <header className="max-w-2xl">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20">
          <Sparkles size={13} />
          <span>Partner & Creator Hub</span>
        </div>
        <h1 className="font-display mt-3 text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight text-ink">
          Welcome visitors, publish guides & grow locally
        </h1>
        <p className="mt-3 text-sm md:text-base text-mute leading-relaxed">
          Whether you run a hotel, boutique venue, neighbourhood café, or weekend community market — AirPal provides
          the contactless digital tools to connect with guests instantly.
        </p>
      </header>

      {/* User Status Strip if logged in */}
      {user && (
        <div className="mt-6 rounded-2xl bg-card p-4 ring-1 ring-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
              <ShieldCheck size={20} />
            </span>
            <div>
              <p className="text-xs text-mute">Signed in as</p>
              <p className="text-sm font-semibold text-ink">{user.displayName || user.email || "Your Account"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isHost && (
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20">
                Host Active
              </span>
            )}
            {business && (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20">
                Business Listed
              </span>
            )}
            {myEvent && (
              <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20">
                Event Active
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3 Main Role Pillar Cards */}
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {/* Track 1: Host */}
        <div className="flex flex-col justify-between rounded-3xl bg-card p-6 ring-1 ring-line shadow-sm hover:shadow-md transition">
          <div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Building2 size={24} strokeWidth={2} />
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-400">
              Hospitality
            </p>
            <h2 className="font-display mt-1 text-2xl font-semibold text-ink">Become a Host</h2>
            <p className="mt-2 text-xs text-mute leading-relaxed">
              Designed for hotels, serviced apartments, venues, hostels, and campuses.
            </p>

            <ul className="mt-5 space-y-2.5 text-xs text-ink/80">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-amber-500 mt-0.5" />
                <span>Instant interactive Guest Companion for rooms & lobby</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-amber-500 mt-0.5" />
                <span>One-tap Wi-Fi QR connection with downloadable print kit</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-amber-500 mt-0.5" />
                <span>Contactless service requests & ticket dispatch</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-amber-500 mt-0.5" />
                <span>Curated neighbourhood walks & local recommendations</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-line/60">
            <Button
              className="w-full justify-between"
              onClick={() => {
                if (user) nav("/host");
                else nav("/start?role=host&next=/host");
              }}
            >
              <span>{isHost ? "Open Host Workspace" : "Start as Host"}</span>
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>

        {/* Track 2: Local Business */}
        <div className="flex flex-col justify-between rounded-3xl bg-card p-6 ring-1 ring-line shadow-sm hover:shadow-md transition">
          <div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Store size={24} strokeWidth={2} />
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
              Local Commerce
            </p>
            <h2 className="font-display mt-1 text-2xl font-semibold text-ink">List a Business</h2>
            <p className="mt-2 text-xs text-mute leading-relaxed">
              Designed for cafés, bakeries, restaurants, boutiques, and wellness spots.
            </p>

            <ul className="mt-5 space-y-2.5 text-xs text-ink/80">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-500 mt-0.5" />
                <span>Claim your unique public @handle & mobile place card</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-500 mt-0.5" />
                <span>Publish live visitor deals & offers (e.g. 15% off)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-500 mt-0.5" />
                <span>Featured placement in neighbourhood discovery guides</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-500 mt-0.5" />
                <span>AirPal Club guest list & VIP pass holder check-in</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-line/60">
            <Button
              className="w-full justify-between"
              onClick={() => {
                if (business) nav("/business");
                else if (user) nav("/bio/setup?kind=business");
                else nav("/start?role=business&next=/bio/setup?kind=business");
              }}
            >
              <span>{business ? "Manage Place Listing" : "List Your Business"}</span>
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>

        {/* Track 3: Event Organiser */}
        <div className="flex flex-col justify-between rounded-3xl bg-card p-6 ring-1 ring-line shadow-sm hover:shadow-md transition">
          <div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <CalendarDays size={24} strokeWidth={2} />
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
              Community Events
            </p>
            <h2 className="font-display mt-1 text-2xl font-semibold text-ink">Run an Event</h2>
            <p className="mt-2 text-xs text-mute leading-relaxed">
              Designed for weekend markets, street festivals, food fairs, and craft expos.
            </p>

            <ul className="mt-5 space-y-2.5 text-xs text-ink/80">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-indigo-500 mt-0.5" />
                <span>Gate QR code for paperless guest entry and live schedule</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-indigo-500 mt-0.5" />
                <span>Interactive stall directory with booth numbers & CSV import</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-indigo-500 mt-0.5" />
                <span>Live attendee sentiment and emoji ratings</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-indigo-500 mt-0.5" />
                <span>Add directly to visitor Apple / Google calendars</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-line/60">
            <Button
              className="w-full justify-between"
              onClick={() => {
                if (user) nav("/event");
                else nav("/start?role=event&next=/event");
              }}
            >
              <span>{myEvent ? "Open Event Manager" : "Create an Event"}</span>
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <section className="mt-16 rounded-3xl bg-card p-6 md:p-10 ring-1 ring-line">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold text-center">Simplicity by Design</p>
        <h2 className="font-display mt-1 text-2xl md:text-3xl font-semibold text-ink text-center">
          Live in three simple steps
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-paper p-5 ring-1 ring-line">
            <span className="font-display text-2xl font-bold text-brand">01</span>
            <h3 className="font-display mt-2 text-base font-semibold text-ink">Choose role & sign up</h3>
            <p className="mt-1 text-xs text-mute leading-relaxed">
              Create your free account in 30 seconds via email or mobile SMS code. No credit card or contract required.
            </p>
          </div>
          <div className="rounded-2xl bg-paper p-5 ring-1 ring-line">
            <span className="font-display text-2xl font-bold text-brand">02</span>
            <h3 className="font-display mt-2 text-base font-semibold text-ink">Enter your details</h3>
            <p className="mt-1 text-xs text-mute leading-relaxed">
              Set your Wi-Fi credentials for hotels, upload a photo & deal for local shops, or import your stall list.
            </p>
          </div>
          <div className="rounded-2xl bg-paper p-5 ring-1 ring-line">
            <span className="font-display text-2xl font-bold text-brand">03</span>
            <h3 className="font-display mt-2 text-base font-semibold text-ink">Print & display your QR</h3>
            <p className="mt-1 text-xs text-mute leading-relaxed">
              Download your ready-to-print QR kit. Guests scan with any phone camera — no app download required.
            </p>
          </div>
        </div>
      </section>

      {/* Trust & FAQ Highlights */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {[
          { icon: Smartphone, title: "Zero App Download", desc: "Guests access everything in standard mobile browsers." },
          { icon: QrCode, title: "Instant QR Kits", desc: "Download high-resolution print assets with one click." },
          { icon: Lock, title: "Safe & Privacy-First", desc: "End-to-end encrypted with Firebase security rules." },
          { icon: Users, title: "Unified Account", desc: "Manage stays, places, and events from a single login." },
        ].map((item) => {
          const ItemIcon = item.icon;
          return (
            <div key={item.title} className="rounded-2xl bg-card p-4 ring-1 ring-line">
              <ItemIcon size={18} className="text-brand" />
              <p className="mt-2 text-xs font-semibold text-ink">{item.title}</p>
              <p className="mt-1 text-[11px] text-mute">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

