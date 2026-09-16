import { useState } from "react";
import { Link } from "wouter";
import { addDoc, collection } from "firebase/firestore";
import {
  ArrowRight,
  BadgeCheck,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Megaphone,
  QrCode,
  Settings2,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { WALKTHROUGH_KINDS, emptyWalkthrough, walkthroughValid } from "@shared/studio";

const inputCls =
  "mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none placeholder:text-mute focus:border-brand";

const AUDIENCES = [
  {
    icon: BedDouble,
    title: "Hotels & Stays",
    body: "Rooms, Wi-Fi, dining and print-ready QR kits — run the whole stay from one backend.",
    href: "/host",
    cta: "Open Stay backend",
  },
  {
    icon: Store,
    title: "Venues & Hospitality",
    body: "Claim your listing, publish deals guests redeem with a QR at the table.",
    href: "/business/onboard",
    cta: "Claim your listing",
  },
  {
    icon: CalendarDays,
    title: "Events & Organisers",
    body: "List nights, sell tickets, scan guests at the door.",
    href: "/event",
    cta: "Run an event",
  },
  {
    icon: Megaphone,
    title: "Brands & Retail",
    body: "Campaigns, creator Mates and attribution — not banner ads.",
    href: "/business",
    cta: "Promote with AirPal",
  },
];

const MANAGE = [
  { icon: BedDouble, title: "Stay backend", body: "Property, rooms, Wi-Fi, dining, print QR.", href: "/host" },
  { icon: Store, title: "Listings & deals", body: "Venues, offers, handles and reviews.", href: "/business" },
  { icon: CalendarDays, title: "Events & tickets", body: "Nights, stalls, guest lists.", href: "/event" },
  { icon: QrCode, title: "Scan & print", body: "QR kits for tables, doors and lobbies.", href: "/scan" },
];

export function StudioPage() {
  const { user, isAdmin, authReady, requireUser } = useAuth();
  const [form, setForm] = useState(emptyWalkthrough());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);

  async function book() {
    setError(null);
    if (!requireUser("Sign in to book a Studio walkthrough.")) return;
    if (!user || !walkthroughValid(form)) return;
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured) {
      setError("Connect Firebase first — bookings go through the live backend.");
      return;
    }
    setSending(true);
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, "studio_walkthroughs"), {
        ownerUid: user.uid,
        name: form.name.trim(),
        business: form.business.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        kind: form.kind,
        preferredDay: form.preferredDay,
        notes: form.notes.trim(),
        status: "new",
        createdAt: now,
        updatedAt: now,
      });
      setBooked(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't book your walkthrough. Try again.");
    } finally {
      setSending(false);
    }
  }

  if (!authReady) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-mute">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">AirPal Studio</p>
      <h1 className="font-display mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
        Run your business on AirPal.
      </h1>
      <p className="mt-3 max-w-md text-[15px] leading-7 text-mute">
        One backend for your hotel, venue, events and brand. Claim your listing or book a walkthrough and the team
        will set it up with you.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/business/onboard">
          <Button size="lg">
            Claim your listing <ArrowRight size={17} />
          </Button>
        </Link>
        <a href="#walkthrough">
          <Button size="lg" variant="ghost">
            Book a walkthrough
          </Button>
        </a>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold tracking-tight">Who&apos;s it for?</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {AUDIENCES.map((a) => (
            <li key={a.title} className="rounded-2xl border border-line bg-card p-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-brand/10 text-brand">
                <a.icon size={18} />
              </span>
              <p className="font-display mt-2 text-base font-bold">{a.title}</p>
              <p className="mt-1 text-[13px] leading-6 text-mute">{a.body}</p>
              <Link href={a.href} className="mt-2 inline-block text-[13px] font-semibold text-brand">
                {a.cta} →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-display flex items-center gap-2 text-xl font-bold tracking-tight">
          <Settings2 size={19} /> Backend management
        </h2>
        <p className="mt-1 text-[13px] text-mute">
          {user ? "Pick up where you left off." : "Sign in to manage — every tool lives behind your account."}
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {MANAGE.map((m) => (
            <li key={m.title}>
              <Link
                href={m.href}
                className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3.5 hover:border-mute"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                  <m.icon size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{m.title}</span>
                  <span className="block text-xs text-mute">{m.body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {isAdmin && (
          <Link href="/admin" className="mt-2 inline-block text-[13px] font-semibold text-brand">
            Open admin operations →
          </Link>
        )}
      </section>

      <section className="mt-8 rounded-2xl bg-ink p-5 text-white">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
          <Megaphone size={13} /> Promote AirPal.me for business
        </p>
        <h2 className="font-display mt-1 text-xl font-bold">Don&apos;t advertise. Host.</h2>
        <ul className="mt-3 space-y-2 text-[13px] leading-6 text-white/75">
          <li>· Turn slow nights into AirPal Experiences — we bring the guests.</li>
          <li>· Guest deals redeemed by QR, attributed to your venue.</li>
          <li>· Reviews and analytics in the same backend you already use.</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/business/onboard">
            <Button variant="light">
              <BadgeCheck size={15} /> Claim your listing
            </Button>
          </Link>
          <Link href="/business/campaigns">
            <Button variant="onDark">Create an Experience</Button>
          </Link>
        </div>
      </section>

      <section id="walkthrough" className="mt-8 scroll-mt-20 rounded-2xl border border-line bg-card p-5">
        <h2 className="font-display text-xl font-bold tracking-tight">Book a walkthrough</h2>
        <p className="mt-1 text-[13px] text-mute">
          20 minutes with the team. We&apos;ll tour your venue&apos;s setup and switch everything on together.
        </p>
        {booked ? (
          <div className="mt-4 rounded-xl bg-paper p-4 text-center ring-1 ring-line">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand text-white">
              <CheckCircle2 size={24} />
            </span>
            <p className="font-display mt-2 text-base font-bold">Walkthrough booked</p>
            <p className="mt-1 text-[13px] text-mute">We&apos;ll confirm a time by email shortly.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[13px] font-semibold">Your name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputCls}
                  placeholder="Sam Chen"
                />
              </label>
              <label className="block">
                <span className="text-[13px] font-semibold">Business</span>
                <input
                  value={form.business}
                  onChange={(e) => setForm((f) => ({ ...f, business: e.target.value }))}
                  className={inputCls}
                  placeholder="Harbour View Hotel"
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[13px] font-semibold">Work email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={inputCls}
                  placeholder="sam@venue.com.au"
                />
              </label>
              <label className="block">
                <span className="text-[13px] font-semibold">Phone</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className={inputCls}
                  placeholder="0412 345 678"
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[13px] font-semibold">Business type</span>
                <select
                  value={form.kind}
                  onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
                  className={inputCls}
                >
                  {WALKTHROUGH_KINDS.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[13px] font-semibold">Preferred day</span>
                <input
                  type="date"
                  value={form.preferredDay}
                  onChange={(e) => setForm((f) => ({ ...f, preferredDay: e.target.value }))}
                  className={inputCls}
                />
              </label>
            </div>
            <label className="block">
              <span className="text-[13px] font-semibold">Anything we should know? (optional)</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className={inputCls}
                placeholder="Two venues, busy Friday nights…"
                maxLength={500}
              />
            </label>
            {error && <p className="rounded-xl bg-paper p-3 text-[13px] text-mute ring-1 ring-line">{error}</p>}
            <Button className="w-full" size="lg" disabled={!walkthroughValid(form) || sending} loading={sending} onClick={() => void book()}>
              Book my walkthrough
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
