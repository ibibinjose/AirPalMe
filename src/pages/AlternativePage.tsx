import { Link, useParams } from "wouter";
import { ALTERNATIVES, ALTERNATIVE_SLUGS } from "@/lib/alternatives";

/**
 * One template for /alternatives/:slug. Static, guest-browsable, no auth, no
 * Firestore reads. Prerendered per slug at build time. Copy comes from
 * src/lib/alternatives.ts, where honesty tests pin the contract.
 */
export function AlternativePage() {
  const { slug } = useParams<{ slug: string }>();
  const config = (slug && ALTERNATIVES[slug]) || null;

  if (!config) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Compare</p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          We haven&apos;t written that comparison
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/85">
          These are the only comparisons we publish — each one sticks to verified AirPal facts:
        </p>
        <ul className="mt-4 space-y-2">
          {ALTERNATIVE_SLUGS.map((key) => (
            <li key={key}>
              <Link href={`/alternatives/${key}`} className="font-semibold text-accent hover:underline">
                {ALTERNATIVES[key]!.headline} →
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">{config.competitor} alternative</p>
      <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{config.headline}</h1>

      <div className="mt-6 rounded-[28px] bg-card p-6 ring-1 ring-line sm:p-8">
        <p className="text-[15px] leading-relaxed text-ink/85 sm:text-base">{config.intro}</p>
        <p className="mt-3 border-t border-line/70 pt-3 text-[13px] leading-relaxed text-mute">
          {config.competitor} is {config.competitorDescriptor}; AirPal.Me is not affiliated with it. Everything below
          describes AirPal.Me only.
        </p>
      </div>

      <section aria-label="What you'd use AirPal.Me for instead" className="mt-10">
        <h2 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
          What you&apos;d use AirPal.Me for instead
        </h2>
        <div className="mt-3 divide-y divide-line/70">
          {config.useCases.map((useCase) => (
            <div key={useCase.title} className="py-4">
              <h3 className="text-[15px] font-bold text-ink">{useCase.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink/80">{useCase.body}</p>
              <Link
                href={useCase.href}
                className="mt-1.5 inline-block text-sm font-semibold text-accent hover:underline"
              >
                {useCase.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="How to compare" className="mt-10">
        <h2 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">How to compare</h2>
        <div className="mt-4 overflow-x-auto rounded-[28px] bg-card ring-1 ring-line">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line/70 text-[13px] uppercase tracking-wide text-mute">
                <th scope="col" className="px-5 py-3 font-bold">
                  What to check
                </th>
                <th scope="col" className="px-5 py-3 font-bold">
                  AirPal.Me
                </th>
              </tr>
            </thead>
            <tbody>
              {config.criteria.map((row) => (
                <tr key={row.check} className="border-t border-line/70 first:border-t-0">
                  <td className="px-5 py-3 font-semibold text-ink">{row.check}</td>
                  <td className="px-5 py-3 text-ink/80">{row.airpal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Availability status" className="mt-10 rounded-[28px] bg-paper p-6 ring-1 ring-line sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
          Early access · Sydney · October 2026
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink/80">
          Everything above is live in the product today. We publish no customer counts, ratings or customer stories yet
          — this page grows only with real, permissioned evidence. Running a student residence, venue or event?{" "}
          <Link href="/business" className="font-semibold text-accent hover:underline">
            List your place
          </Link>{" "}
          or{" "}
          <Link href="/contact" className="font-semibold text-accent hover:underline">
            talk to us
          </Link>
          .
        </p>
      </section>

      <section aria-label="Next step" className="mt-10 rounded-[28px] bg-card p-6 ring-1 ring-line sm:p-8">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          <Link
            href={config.primaryCta.href}
            className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-6 text-sm font-bold text-white transition hover:bg-brand-ink active:scale-[0.98]"
          >
            {config.primaryCta.label}
          </Link>
          <Link
            href="/trust"
            className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-bold text-ink ring-1 ring-line transition hover:bg-paper active:scale-[0.98]"
          >
            Verify us first
          </Link>
        </div>
      </section>
    </div>
  );
}
