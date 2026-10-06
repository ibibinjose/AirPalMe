import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { addDoc, collection } from "firebase/firestore";
import { Building2, Handshake, PartyPopper, Shirt, Sparkles, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { LEGAL } from "@/lib/legal";
import { cn } from "@/lib/cn";
import {
  PARTNER_SEGMENTS,
  PARTNER_SOURCES,
  validatePartnerLead,
  type PartnerSegment,
  type PartnerSource,
} from "@shared/partner";

const SEGMENT_ICONS: Record<PartnerSegment, typeof Store> = {
  stay: Building2,
  experience: Sparkles,
  event: PartyPopper,
  fashion: Shirt,
  other: Store,
};

/**
 * Partner with AirPal — the business-development front door. Segmented
 * inquiry (stay / experience / event & festival / fashion) with a public
 * form like the category leaders use; leads land in `partner_leads` for
 * admin triage, and the relationship itself starts in onboarding.
 */
export function PartnerPage() {
  const [segment, setSegment] = useState<PartnerSegment | "">("");
  const [source, setSource] = useState<PartnerSource | "">("");
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const input =
    "h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-mute/60";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problems = validatePartnerLead({ segment, source, company, name, email, phone, message });
    setErrors(problems);
    if (problems.length) return;
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured) {
      mailtoFallback();
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, "partner_leads"), {
        segment,
        source,
        company: company.trim(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        message: message.trim(),
        status: "new",
        createdAt: now,
        updatedAt: now,
      });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send — email us instead.");
    } finally {
      setBusy(false);
    }
  }

  function mailtoFallback() {
    const subject = `[AirPal.me] Partnership — ${company || name || "New inquiry"}`;
    const body = [`Name: ${name}`, `Company: ${company}`, `Email: ${email}`, `Segment: ${segment}`, "", message].join("\n");
    window.location.href = `mailto:${LEGAL.contacts}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-4 pb-24 pt-12 text-center md:px-6">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-600/10 text-emerald-700">
          <Handshake size={26} />
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold text-ink">Thanks — we got it.</h1>
        <p className="mx-auto mt-2 max-w-sm text-[15px] text-mute">
          We reply fast, usually within two business days. Want to move now? Start your application today.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/business/onboard">
            <Button>Apply now</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 md:px-6 md:pt-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Partner with AirPal</p>
      <h1 className="mt-1 font-display text-4xl font-bold text-ink">Let&apos;s talk.</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink/80">
        Tell us a little about your property or business and we&apos;ll get back to you fast. It takes under a
        minute — or just email us, your call. Already curious who&apos;s here?{" "}
        <Link href="/partners" className="font-semibold text-accent">
          See our partners
        </Link>
        .
      </p>

      <form onSubmit={onSubmit} className="mt-6 rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs sm:p-7">
        <p className="text-[13px] font-bold text-ink">
          Who are you? <span className="text-accent">*</span>
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Partner type">
          {PARTNER_SEGMENTS.map((s) => {
            const Icon = SEGMENT_ICONS[s.id];
            const on = segment === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setSegment(s.id)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl p-3.5 text-left ring-1 transition active:scale-[0.99]",
                  on ? "bg-brand text-white ring-brand shadow-sm" : "bg-paper text-ink ring-line hover:ring-brand/40",
                )}
              >
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1", on ? "bg-white/15 ring-white/25" : "bg-brand/10 text-accent ring-brand/20")}>
                  <Icon size={18} />
                </span>
                <span>
                  <span className="block text-sm font-bold">{s.label}</span>
                  <span className={cn("block text-[11px] leading-snug", on ? "text-white/80" : "text-mute")}>{s.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-5 text-[13px] font-bold text-ink">
          How did you find us? <span className="text-accent">*</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Discovery source">
          {PARTNER_SOURCES.map((s) => {
            const on = source === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setSource(s.id)}
                className={cn(
                  "rounded-full px-4 py-2 text-[13px] font-semibold ring-1 transition",
                  on ? "bg-ink text-paper ring-ink" : "bg-paper text-mute ring-line hover:text-ink",
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">
              Company name <span className="text-accent">*</span>
            </label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} className={input} maxLength={120} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">
              Your name <span className="text-accent">*</span>
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={input} maxLength={80} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">
              Work email <span className="text-accent">*</span>
            </label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" className={input} maxLength={120} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={input} maxLength={40} />
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1.5 block text-[13px] font-bold text-ink">
            Your message <span className="text-accent">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="What do you run, and what do you want from AirPal?"
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-mute/60"
          />
        </div>

        {errors.length > 0 && (
          <ul className="mt-3 rounded-2xl bg-red-50 p-3 text-[13px] text-red-700">
            {errors.map((err) => (
              <li key={err}>· {err}</li>
            ))}
          </ul>
        )}

        <Button type="submit" loading={busy} disabled={busy} className="mt-4 w-full">
          Send message →
        </Button>
        <p className="mt-3 text-center text-[13px] text-mute">
          Prefer email? We reply fast:{" "}
          <a href={`mailto:${LEGAL.contacts}`} className="font-semibold text-accent">
            {LEGAL.contacts}
          </a>
        </p>
      </form>

      <section className="mt-6 rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs sm:p-6">
        <h2 className="font-display text-xl font-bold text-ink">What happens next</h2>
        <ol className="mt-3 space-y-2 text-[14px] text-ink/80">
          <li><strong className="text-ink">1. We reply</strong> — usually within two business days.</li>
          <li><strong className="text-ink">2. You apply & verify</strong> — one application, reviewed by a human.</li>
          <li><strong className="text-ink">3. You go live & get paid</strong> — list, sell, and receive payouts after each event.</li>
        </ol>
        <Link href="/business/onboard" className="mt-4 inline-block rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white">
          Skip the wait — apply now
        </Link>
      </section>
    </div>
  );
}
