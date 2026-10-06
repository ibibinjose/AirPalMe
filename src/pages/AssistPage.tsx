import { Link } from "wouter";
import { ChevronRight, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LEGAL } from "@/lib/legal";
import { ASSIST_FAQ, buildAssistJsonLd } from "@/lib/assist-meta";

const GUIDES = [
  { href: "/help?a=stay-guest", title: "Staying guest guide", note: "Scans, Wi-Fi, dining, the front desk" },
  { href: "/help?a=meet-safely", title: "Meet safely", note: "Public places, check-ins, instincts" },
  { href: "/help?a=report-block", title: "Report or block someone", note: "Human review on every case" },
  { href: "/help?a=tickets-payments", title: "Tickets and payments", note: "Bookings, cancellations, refunds" },
  { href: "/help?a=account-bio", title: "Account and profile", note: "Sign in, bio, settings" },
] as const;

/**
 * Customer support landing: the stable URL for app-store listings,
 * reviewers, and anyone who needs help. Purely static and
 * guest-browsable: no auth, no Firestore reads. Prerendered to static
 * HTML at build time so non-JS crawlers can read it.
 */
export function AssistPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      {buildAssistJsonLd().map((block, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }} />
      ))}

      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">Support</p>
      <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Help &amp; support</h1>
      <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink/80">
        Real help from the Sydney team behind AirPal.Me. Start with the guides, or write to us — no account needed on
        this website.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href="/contact">
          <Button className="w-full cursor-pointer sm:w-auto">
            <MessageCircle size={16} aria-hidden />
            Contact us
          </Button>
        </Link>
        <Link href="/help">
          <Button variant="ghost" className="w-full cursor-pointer sm:w-auto">
            Browse all guides
          </Button>
        </Link>
      </div>

      <section aria-labelledby="assist-contact" className="mt-10">
        <h2 id="assist-contact" className="font-display text-xl font-bold tracking-tight text-ink">
          Talk to a human
        </h2>
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl bg-card ring-1 ring-line">
          {[
            { label: "General", value: LEGAL.email },
            { label: "Direct", value: LEGAL.contacts },
          ].map((row) => (
            <li key={row.value}>
              <a
                href={`mailto:${row.value}`}
                className="flex min-h-[52px] items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-ink/[0.03]"
              >
                <Mail size={17} aria-hidden className="shrink-0 text-mute" />
                <span className="min-w-0">
                  <span className="block text-[13px] text-mute">{row.label}</span>
                  <span className="block truncate text-[15px] font-medium text-accent">{row.value}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[13px] leading-relaxed text-mute">
          We read every message and aim to reply within 30 days. For a copy of your data or deletion, choose that topic
          on the contact page.
        </p>
      </section>

      <section aria-labelledby="assist-guides" className="mt-10">
        <h2 id="assist-guides" className="font-display text-xl font-bold tracking-tight text-ink">
          Popular guides
        </h2>
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl bg-card ring-1 ring-line">
          {GUIDES.map((g) => (
            <li key={g.href}>
              <Link
                href={g.href}
                className="flex min-h-[52px] items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-ink/[0.03]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">{g.title}</span>
                  <span className="block truncate text-[13px] text-mute">{g.note}</span>
                </span>
                <ChevronRight size={17} aria-hidden className="shrink-0 text-mute" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="assist-safety" className="mt-10 rounded-xl bg-card p-5 ring-1 ring-line">
        <h2
          id="assist-safety"
          className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-ink"
        >
          <ShieldCheck size={20} aria-hidden className="text-accent" />
          Safety first
        </h2>
        <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink/80">
          Use report and block inside the app — every safety case gets human review. Meet in public places and keep chat
          and payment inside AirPal.Me. No marketplace can guarantee personal safety; in an emergency, call your local
          emergency number.
        </p>
        <p className="mt-3 text-[15px]">
          <Link href="/help?a=meet-safely" className="font-semibold text-accent hover:underline">
            Read the safe-meeting guide
          </Link>
        </p>
      </section>

      <section aria-labelledby="assist-faq" className="mt-10">
        <h2 id="assist-faq" className="font-display text-xl font-bold tracking-tight text-ink">
          Frequent questions
        </h2>
        <div className="mt-3 divide-y divide-line overflow-hidden rounded-xl bg-card ring-1 ring-line">
          {ASSIST_FAQ.map((item) => (
            <details key={item.q} className="group px-4 py-3">
              <summary className="cursor-pointer list-none text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  {item.q}
                  <ChevronRight
                    size={17}
                    aria-hidden
                    className="shrink-0 text-mute transition-transform duration-150 group-open:rotate-90"
                  />
                </span>
              </summary>
              <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-ink/80">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="mt-10 border-t border-line pt-5 text-[13px] leading-relaxed text-mute">
        AirPal.Me is operated by SarvamDaily Pty Ltd (ABN 83 702 462 977), Sydney, Australia.{" "}
        <Link href="/trust" className="font-semibold text-accent hover:underline">
          Company facts and verification
        </Link>
      </p>
    </div>
  );
}
