import type { ReactNode } from "react";
import { Link } from "wouter";
import { LEGAL } from "@/lib/legal";

export function LegalDoc({
  kicker,
  title,
  lede,
  children,
}: {
  kicker: string;
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <article className="mx-auto max-w-2xl px-4 pb-6 pt-8 md:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">{kicker}</p>
        <h1 className="font-display mt-1 text-3xl font-semibold md:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-mute">
          Effective {LEGAL.updated} · {LEGAL.location}
        </p>
        {lede && <p className="mt-5 text-[15px] leading-relaxed text-ink/85">{lede}</p>}
        <div className="legal-prose mt-8">{children}</div>
        <p className="mt-12 text-sm text-mute">
          Questions?{" "}
          <Link href="/contact" className="text-accent">
            Contact us
          </Link>{" "}
          or write to{" "}
          <a href={`mailto:${LEGAL.email}`} className="text-accent">
            {LEGAL.email}
          </a>
          .
        </p>
      </article>
    </div>
  );
}
