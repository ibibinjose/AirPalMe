import { Link } from "wouter";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { LEGAL } from "@/lib/legal";
import { TRUST_FAQ, buildTrustJsonLd } from "@/lib/trust-meta";

const ABN_LOOKUP = "https://abr.business.gov.au/ABN/View?id=83702462977";

const FACTS: Array<{ term: string; body: React.ReactNode }> = [
  { term: "Legal name", body: "SarvamDaily Pty Ltd" },
  { term: "Trading as", body: "AirPal.Me" },
  {
    term: "ABN",
    body: (
      <span>
        83 702 462 977{" "}
        <a
          href={ABN_LOOKUP}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
        >
          Check on ABN Lookup <ExternalLink size={13} />
        </a>
      </span>
    ),
  },
  { term: "Location", body: "Sydney, New South Wales, Australia" },
  {
    term: "Support",
    body: (
      <span>
        <Link href="/contact" className="font-semibold text-brand hover:underline">
          Contact page
        </Link>{" "}
        <span className="text-mute">
          · direct {LEGAL.contacts} · {LEGAL.email}
        </span>
      </span>
    ),
  },
  {
    term: "Website",
    body: (
      <a href="https://airpal.me/" className="font-semibold text-brand hover:underline">
        https://airpal.me/
      </a>
    ),
  },
];

const NOT_AFFILIATED = [
  { name: "Arjo AirPal", what: "Medical patient-transfer mattress by Arjo" },
  { name: "airpal.app", what: "Flight-search tool" },
  { name: "airpal.ie and older AirPal-named apps", what: "Telemedicine and earlier apps sharing the name" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">{children}</h2>;
}

/**
 * Company facts, disambiguation, and honest early-access status. Purely
 * static and guest-browsable: no auth, no Firestore reads. Prerendered to
 * static HTML at build time so AI crawlers can quote it.
 */
export function TrustPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      {buildTrustJsonLd().map((block, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }} />
      ))}

      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Trust & company facts</p>
      <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Is AirPal.Me legit?</h1>

      {/* Answer capsule */}
      <div className="mt-6 rounded-[28px] bg-ink p-6 text-white sm:p-8">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gold">
          <ShieldCheck size={14} /> The short answer
        </p>
        <p className="mt-3 text-base leading-relaxed text-white/90 sm:text-lg">
          AirPal.Me is a guest-companion and local-discovery platform built in Sydney by SarvamDaily Pty Ltd (ABN 83 702
          462 977). It is not Arjo&apos;s AirPal patient-transfer mattress and not the airpal.app flight-search tool.
          One account connects mates, stays, experiences and plans, with human-reviewed trust and safety.
        </p>
      </div>

      {/* Company facts */}
      <section aria-labelledby="trust-facts" className="mt-10">
        <SectionTitle>
          <span id="trust-facts">Company facts</span>
        </SectionTitle>
        <dl className="mt-4 overflow-hidden rounded-[28px] bg-card ring-1 ring-line">
          {FACTS.map((fact, i) => (
            <div
              key={fact.term}
              className={`grid gap-1 px-5 py-4 sm:grid-cols-[12rem_1fr] sm:gap-4 ${i > 0 ? "border-t border-line/70" : ""}`}
            >
              <dt className="text-[13px] font-bold uppercase tracking-wide text-mute">{fact.term}</dt>
              <dd className="text-[15px] leading-relaxed text-ink">{fact.body}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[13px] leading-relaxed text-mute">
          {LEGAL.byline} · {LEGAL.location}. Fields we cannot verify — founder, founding date, street address — are left
          out until the company confirms them.
        </p>
      </section>

      {/* What it is */}
      <section aria-labelledby="trust-is" className="mt-10">
        <SectionTitle>
          <span id="trust-is">What AirPal.Me is</span>
        </SectionTitle>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/85">
          AirPal.Me is the guest companion for stays and the local-discovery platform for going out — and the operating
          system for the people who run those places. Guests get one place for everything about their stay or plan;
          hosts and businesses get one place to run it.{" "}
          <Link href="/about" className="font-semibold text-brand hover:underline">
            About
          </Link>
          {" · "}
          <Link href="/concierge" className="font-semibold text-brand hover:underline">
            Stay & Guide
          </Link>
          {" · "}
          <Link href="/business" className="font-semibold text-brand hover:underline">
            For business
          </Link>
        </p>
      </section>

      {/* What it is not */}
      <section aria-labelledby="trust-isnt" className="mt-10">
        <SectionTitle>
          <span id="trust-isnt">What AirPal.Me is not</span>
        </SectionTitle>
        <div className="mt-4 overflow-x-auto rounded-[28px] bg-card ring-1 ring-line">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line/70 text-[13px] uppercase tracking-wide text-mute">
                <th scope="col" className="px-5 py-3 font-bold">
                  Name
                </th>
                <th scope="col" className="px-5 py-3 font-bold">
                  What it is
                </th>
                <th scope="col" className="px-5 py-3 font-bold">
                  Relation to AirPal.Me
                </th>
              </tr>
            </thead>
            <tbody>
              {NOT_AFFILIATED.map((row) => (
                <tr key={row.name} className="border-t border-line/70 first:border-t-0">
                  <td className="px-5 py-3 font-semibold text-ink">{row.name}</td>
                  <td className="px-5 py-3 text-ink/80">{row.what}</td>
                  <td className="px-5 py-3 text-ink/80">No affiliation</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Payments, data, identity */}
      <section aria-labelledby="trust-handling" className="mt-10">
        <SectionTitle>
          <span id="trust-handling">Payments, data and identity</span>
        </SectionTitle>
        <div className="mt-3 divide-y divide-line/70">
          <div className="py-4">
            <h3 className="text-[15px] font-bold text-ink">Payments</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink/80">
              Processed by Stripe. Paid bookings go through the platform — never direct transfers, never card numbers
              over chat. AirPal never sees or stores card numbers.
            </p>
          </div>
          <div className="py-4">
            <h3 className="text-[15px] font-bold text-ink">Data</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink/80">
              Hosted on Google Firebase infrastructure. The full picture is in our{" "}
              <Link href="/privacy" className="font-semibold text-brand hover:underline">
                privacy policy
              </Link>{" "}
              and{" "}
              <Link href="/terms" className="font-semibold text-brand hover:underline">
                terms
              </Link>
              .
            </p>
          </div>
          <div className="py-4">
            <h3 className="text-[15px] font-bold text-ink">Identity</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink/80">
              Accounts are 18+. Sign in with email, phone, Google or Apple, with email and phone verification where
              required. Home addresses, verification documents, phone numbers and emails are never exposed.
            </p>
          </div>
        </div>
      </section>

      {/* Proof module: real evidence only */}
      <section aria-labelledby="trust-live" className="mt-10 rounded-[28px] bg-paper p-6 ring-1 ring-line sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gold">Where AirPal.Me is live</p>
        <h2 id="trust-live" className="font-display mt-1 text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Early access · Sydney · October 2026
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/85">
          We&apos;re early — here is exactly what is live, and nothing we cannot stand behind.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink/80">
          <li>The public website is live: guests can browse places, stays, plans and events without an account.</li>
          <li>
            An interactive demonstration showcase walks the full loop (
            <Link href="/DemoHotel" className="font-semibold text-brand hover:underline">
              demo hotel
            </Link>
            ,{" "}
            <Link href="/Demo" className="font-semibold text-brand hover:underline">
              showcase tour
            </Link>
            ) — labelled as a demonstration, not a customer.
          </li>
          <li>Reporting, blocking and human admin review are part of the product from day one.</li>
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-ink/80">
          No customer counts, ratings or testimonials are published yet. This section grows only with real, permissioned
          evidence. Running a stay, venue or college in Sydney and want to pilot with us?{" "}
          <Link href="/business" className="font-semibold text-brand hover:underline">
            List your place
          </Link>{" "}
          or{" "}
          <Link href="/contact" className="font-semibold text-brand hover:underline">
            talk to us
          </Link>
          .
        </p>
      </section>

      {/* FAQ */}
      <section aria-labelledby="trust-faq" className="mt-10">
        <SectionTitle>
          <span id="trust-faq">Questions</span>
        </SectionTitle>
        <div className="mt-3 divide-y divide-line/70">
          {TRUST_FAQ.map((item) => (
            <div key={item.q} className="py-4">
              <h3 className="text-[15px] font-bold text-ink">{item.q}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink/80">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Verify close */}
      <section aria-labelledby="trust-verify" className="mt-10 rounded-[28px] bg-card p-6 ring-1 ring-line sm:p-8">
        <h2 id="trust-verify" className="font-display text-xl font-bold tracking-tight text-ink">
          Verify us yourself
        </h2>
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          <a
            href={ABN_LOOKUP}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-ink ring-1 ring-line transition hover:bg-paper active:scale-[0.98]"
          >
            ABN Lookup record <ExternalLink size={15} />
          </a>
          <Link
            href="/contact"
            className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-6 text-sm font-bold text-white transition hover:bg-brand-ink active:scale-[0.98]"
          >
            Contact us
          </Link>
          <Link
            href="/business"
            className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-bold text-ink ring-1 ring-line transition hover:bg-paper active:scale-[0.98]"
          >
            For hosts
          </Link>
        </div>
      </section>
    </div>
  );
}
