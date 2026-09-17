import { useLocation } from "wouter";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Compass,
  HeartHandshake,
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
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      {/* Header Section */}
      <header className="max-w-3xl">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3.5 py-1 text-xs font-black uppercase tracking-[0.16em] text-slate-950 border-2 border-ink shadow-xs">
          <Sparkles size={14} className="text-slate-950" />
          <span>Partner & Provider Hub · Sydney, Australia 🇦🇺</span>
        </div>
        <h1 className="font-display mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight text-ink">
          Join the AirPal Network — Made Easy
        </h1>
        <p className="mt-3 text-base text-mute leading-relaxed">
          One marketplace engine connecting people with <strong className="text-ink font-semibold">People (Mates), Places (Stays), Experiences, and Things</strong>. Whether you&apos;re an activity mate, hotel operator, local business, or experience creator — start welcoming guests today.
        </p>
      </header>

      {/* User Status Banner if logged in */}
      {user && (
        <div className="mt-6 rounded-3xl bg-card p-5 border-2 border-ink shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/10 text-brand border border-brand/20">
              <ShieldCheck size={22} />
            </span>
            <div>
              <p className="text-xs text-mute font-medium">Signed in as</p>
              <p className="text-sm font-bold text-ink">{user.displayName || user.email || "Your Account"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isHost && (
              <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-slate-950 border border-ink shadow-xs">
                Host Active
              </span>
            )}
            {business && (
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                Business Listed
              </span>
            )}
            {myEvent && (
              <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                Event Active
              </span>
            )}
          </div>
        </div>
      )}

      {/* Featured Primary Track: AirPal Mate Supply */}
      <div className="mt-8 rounded-3xl border-2 border-ink bg-gradient-to-r from-blue-500/10 via-brand/5 to-amber-500/10 p-6 md:p-8 shadow-xs">
        <div className="grid gap-6 md:grid-cols-3 items-center">
          <div className="md:col-span-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white shadow-xs">
              <HeartHandshake size={14} /> MVP Flagship Track
            </span>
            <h2 className="font-display mt-3 text-2xl sm:text-3xl font-bold text-ink">
              Become an AirPal Mate
            </h2>
            <p className="mt-2 text-sm text-mute leading-relaxed">
              Find someone to go with you! Accompany locals and visitors for dining, concerts, sports games, harbour walks, or coffee. Earn while sharing authentic Sydney experiences.
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-ink">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-brand shrink-0" />
                <span>Identity verified & admin approved supply</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-brand shrink-0" />
                <span>Set your availability & activity categories</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-brand shrink-0" />
                <span>Protected messaging & Stripe payouts</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-brand shrink-0" />
                <span>Transparent reviews & rating badges</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 justify-center items-stretch md:items-end">
            <Button
              size="lg"
              className="w-full text-base font-bold shadow-sm"
              onClick={() => {
                if (user) nav("/companion");
                else nav("/start?role=companion&next=/companion");
              }}
            >
              <span>Apply as AirPal Mate</span>
              <ArrowRight size={18} />
            </Button>
            <p className="text-center text-[11px] text-mute">
              Admin profile review required before live activation.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Provider Track Grid */}
      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Track 1: Stay Host */}
        <div className="flex flex-col justify-between rounded-3xl border-2 border-ink bg-card p-6 shadow-xs hover:-translate-y-0.5 transition">
          <div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Building2 size={24} strokeWidth={2} />
            </div>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-amber-600">
              AirPal Stay
            </p>
            <h2 className="font-display mt-1 text-xl font-bold text-ink">Stay Partner</h2>
            <p className="mt-1.5 text-xs text-mute leading-relaxed">
              Designed for boutique hotels, serviced apartments, hostels, and guest lodges.
            </p>

            <ul className="mt-4 space-y-2 text-xs text-ink/90">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="shrink-0 text-amber-500 mt-0.5" />
                <span>Interactive Guest Companion & digital lobby concierge</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="shrink-0 text-amber-500 mt-0.5" />
                <span>One-tap Wi-Fi QR print kit for guest rooms</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="shrink-0 text-amber-500 mt-0.5" />
                <span>Curated neighbourhood walks & local offers</span>
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
              <span>{isHost ? "Host Workspace" : "Start as Host"}</span>
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>

        {/* Track 2: Experiences Provider */}
        <div className="flex flex-col justify-between rounded-3xl border-2 border-ink bg-card p-6 shadow-xs hover:-translate-y-0.5 transition">
          <div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
              <Compass size={24} strokeWidth={2} />
            </div>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-purple-600">
              AirPal Experiences
            </p>
            <h2 className="font-display mt-1 text-xl font-bold text-ink">Experiences</h2>
            <p className="mt-1.5 text-xs text-mute leading-relaxed">
              For local tour guides, harbour charters, fitness coaches, and art workshops.
            </p>

            <ul className="mt-4 space-y-2 text-xs text-ink/90">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="shrink-0 text-purple-500 mt-0.5" />
                <span>Publish ticketed experience slots & group sizes</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="shrink-0 text-purple-500 mt-0.5" />
                <span>&ldquo;Going alone? Find a Mate&rdquo; cross-promotion</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="shrink-0 text-purple-500 mt-0.5" />
                <span>Instant customer bookings & payout tracking</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-line/60">
            <Button
              className="w-full justify-between"
              onClick={() => {
                if (user) nav("/business/campaigns");
                else nav("/start?role=business&next=/business/campaigns");
              }}
            >
              <span>Create Experience</span>
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>

        {/* Track 3: Local Business */}
        <div className="flex flex-col justify-between rounded-3xl border-2 border-ink bg-card p-6 shadow-xs hover:-translate-y-0.5 transition">
          <div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <Store size={24} strokeWidth={2} />
            </div>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              Local Commerce
            </p>
            <h2 className="font-display mt-1 text-xl font-bold text-ink">List a Business</h2>
            <p className="mt-1.5 text-xs text-mute leading-relaxed">
              Designed for cafés, restaurants, retail boutiques, and wellness spaces.
            </p>

            <ul className="mt-4 space-y-2 text-xs text-ink/90">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-500 mt-0.5" />
                <span>Claim unique verified `@handle` & mobile place card</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-500 mt-0.5" />
                <span>Publish live visitor deals & offers (e.g. 15% off)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-500 mt-0.5" />
                <span>AirPal VIP pass & guest list door check-in</span>
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
              <span>{business ? "Manage Business" : "List Business"}</span>
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>

        {/* Track 4: Event Organiser */}
        <div className="flex flex-col justify-between rounded-3xl border-2 border-ink bg-card p-6 shadow-xs hover:-translate-y-0.5 transition">
          <div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
              <CalendarDays size={24} strokeWidth={2} />
            </div>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-indigo-600">
              Community Events
            </p>
            <h2 className="font-display mt-1 text-xl font-bold text-ink">Run an Event</h2>
            <p className="mt-1.5 text-xs text-mute leading-relaxed">
              Designed for weekend markets, street festivals, and pop-up expos.
            </p>

            <ul className="mt-4 space-y-2 text-xs text-ink/90">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="shrink-0 text-indigo-500 mt-0.5" />
                <span>Gate QR code for paperless guest entry & schedules</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="shrink-0 text-indigo-500 mt-0.5" />
                <span>Stall directory with booth numbers & CSV import</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="shrink-0 text-indigo-500 mt-0.5" />
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
              <span>{myEvent ? "Event Manager" : "Create Event"}</span>
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <section className="mt-14 rounded-3xl border-2 border-ink bg-paper p-6 md:p-10">
        <div className="text-center">
          <span className="inline-block rounded-full bg-amber-400 px-3.5 py-1 text-[11px] font-black uppercase tracking-widest text-slate-950 border border-ink shadow-xs">
            Simplicity by Design
          </span>
        </div>
        <h2 className="font-display mt-1 text-2xl md:text-3xl font-extrabold text-ink text-center">
          Live in three simple steps
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border-2 border-ink bg-card p-5 shadow-xs">
            <span className="font-display text-2xl font-extrabold text-brand">01</span>
            <h3 className="font-display mt-2 text-base font-bold text-ink">Choose track & sign up</h3>
            <p className="mt-1 text-xs text-mute leading-relaxed">
              Create your account in 30 seconds. Apply as a Mate, Host, Business, or Event Organiser.
            </p>
          </div>
          <div className="rounded-2xl border-2 border-ink bg-card p-5 shadow-xs">
            <span className="font-display text-2xl font-extrabold text-brand">02</span>
            <h3 className="font-display mt-2 text-base font-bold text-ink">Enter your details & verification</h3>
            <p className="mt-1 text-xs text-mute leading-relaxed">
              Add your availability, photos, offers, or hotel Wi-Fi details. Submit for admin verification.
            </p>
          </div>
          <div className="rounded-2xl border-2 border-ink bg-card p-5 shadow-xs">
            <span className="font-display text-2xl font-extrabold text-brand">03</span>
            <h3 className="font-display mt-2 text-base font-bold text-ink">Publish & welcome guests</h3>
            <p className="mt-1 text-xs text-mute leading-relaxed">
              Go live! Receive booking requests, display your QR kit, and connect with Sydney visitors.
            </p>
          </div>
        </div>
      </section>

      {/* Trust & FAQ Highlights */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {[
          { icon: Smartphone, title: "Zero App Download Needed", desc: "Guests access your listings directly in standard mobile browsers." },
          { icon: QrCode, title: "Instant QR Print Kits", desc: "Download high-resolution print assets with one click." },
          { icon: Lock, title: "Safe & Privacy-First", desc: "Protected messaging, identity badges, and Firebase security rules." },
          { icon: Users, title: "One Unified Account", desc: "Manage stays, places, experiences, and events from one account." },
        ].map((item) => {
          const ItemIcon = item.icon;
          return (
            <div key={item.title} className="rounded-2xl border-2 border-ink bg-card p-4 shadow-xs">
              <ItemIcon size={20} className="text-brand" />
              <p className="mt-2 text-xs font-bold text-ink">{item.title}</p>
              <p className="mt-1 text-[11px] text-mute leading-relaxed">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
