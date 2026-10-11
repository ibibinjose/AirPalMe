import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";

/** First Sydney cluster. Booking URLs stay empty until partner tracking links exist. */
export const DAY_PASSES = [
  {
    id: "sea-life-sydney",
    name: "SEA LIFE Sydney",
    place: "Darling Harbour",
    note: "Aquarium DayPass in the Merlin cluster.",
  },
  {
    id: "wild-life-sydney",
    name: "WILD LIFE Sydney",
    place: "Darling Harbour",
    note: "Wildlife DayPass beside SEA LIFE. Merlin cluster.",
  },
  {
    id: "madame-tussauds-sydney",
    name: "Madame Tussauds Sydney",
    place: "Darling Harbour",
    note: "Waxworks DayPass. Merlin cluster.",
  },
  {
    id: "sydney-tower-eye",
    name: "Sydney Tower Eye",
    place: "Sydney CBD",
    note: "Lookout DayPass. Merlin cluster.",
  },
  {
    id: "taronga-zoo",
    name: "Taronga Zoo",
    place: "Mosman",
    note: "Harbour zoo DayPass. Separate from Merlin — terms still open.",
  },
] as const;

/** Bundles of the same passes. No prices until partner rates are in writing. */
export const DAY_PASS_BUNDLES = [
  {
    id: "family-day",
    name: "Family Day",
    includes: "SEA LIFE Sydney, WILD LIFE Sydney, Madame Tussauds Sydney",
  },
  {
    id: "date-night",
    name: "Date Night",
    includes: "Madame Tussauds Sydney and Sydney Tower Eye",
  },
  {
    id: "tourist-essentials",
    name: "Tourist Essentials",
    includes: "Sydney Tower Eye, SEA LIFE Sydney, Taronga Zoo",
  },
] as const;

export function AttractionsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-28">
      <Link
        href="/explore"
        className={cn(
          "inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5",
          "text-[13px] font-semibold text-ink ring-1 ring-line hover:bg-paper",
        )}
      >
        <ArrowLeft size={14} /> Explore
      </Link>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
        Your Local Pass to Experiences
      </p>
      <h1 className="font-display mt-2 text-3xl font-bold tracking-tight">Sydney DayPasses</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-mute">
        Life Made Easy. Compare a short cluster, bundle the day, and book. Five passes, not a city-wide list.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {DAY_PASSES.map((pass) => (
          <li key={pass.id} className="rounded-3xl bg-card p-4 ring-1 ring-line">
            <p className="text-[11px] font-bold uppercase tracking-wide text-mute">DayPass</p>
            <h2 className="font-display mt-1 text-lg font-bold">{pass.name}</h2>
            <p className="mt-1 text-[13px] text-mute">{pass.place}</p>
            <p className="mt-2 text-sm leading-6 text-ink">{pass.note}</p>
            <p className="mt-3 text-[12px] font-semibold text-mute" data-booking="placeholder">
              Booking link pending — placeholder until the partner tracking link is live.
            </p>
          </li>
        ))}
      </ul>
      <section className="mt-8" aria-label="Bundles">
        <h2 className="font-display text-xl font-bold">Bundle the same passes</h2>
        <p className="mt-1 text-sm text-mute">
          Same inventory, sold as a day. Prices TBD. No checkout until tracking links exist.
        </p>
        <ul className="mt-3 space-y-2">
          {DAY_PASS_BUNDLES.map((bundle) => (
            <li key={bundle.id} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
              <p className="font-display font-bold">{bundle.name}</p>
              <p className="text-[13px] text-mute">{bundle.includes}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
