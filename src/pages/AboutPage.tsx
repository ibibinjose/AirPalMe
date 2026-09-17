import { Link } from "wouter";
import { Photo } from "@/components/ui/Photo";
import { LEGAL } from "@/lib/legal";

export function AboutPage() {
  return (
    <div>
      <div className="mx-auto max-w-2xl px-4 pb-6 pt-6 md:px-6">
        <div className="overflow-hidden rounded-[28px]">
          <Photo src="/media/harbour.jpg" className="h-52 w-full object-cover md:h-72" />
        </div>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Life Made Easy.</p>
        <h1 className="font-display mt-1 text-3xl font-semibold md:text-4xl">People, places, things and experiences — made easier.</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink/85">
          AirPal connects people with the people, places, things and experiences that make life easier. A host prints a code. A visitor scans it. What’s around, the stay, the market stall, or the @handle opens on the phone they already have — no app store, no account for guests.
        </p>
        <ul className="mt-6 space-y-3">
          {[
            { t: "One login", d: "Guests can browse free. The same account is for a personal @handle and, if you host, a registered business." },
            { t: "Hosts", d: "Print a room, lobby, or street marker. Guests land in the stay, not a homepage." },
            { t: "Local places", d: "A business @handle must match the registered name, trade mark, or domain. The owner can recover a squatted handle." },
            { t: "AirPal Club", d: "Join once. Clubs keep a guest list on this device and invite from their own mail app. We are not a bulk-mail house yet." },
            { t: "Markets", d: "Organisers import stalls. Attendees save a list. The same @handle appears at the gate." },
          ].map((row) => (
            <li key={row.t} className="rounded-3xl bg-card px-5 py-4 ring-1 ring-line">
              <p className="font-medium">{row.t}</p>
              <p className="mt-1 text-sm text-mute">{row.d}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[15px] leading-relaxed text-ink/85">
          We started in The Rocks, Sydney — sandstone lanes, harbour weather, and a code on a door. The product is built in {LEGAL.location}. {LEGAL.brand} is operated by {LEGAL.company}.
        </p>
        <p className="mt-4 text-[15px] leading-relaxed text-ink/85">
          <Link href="/contact" className="text-brand">
            Write to us
          </Link>
          . Privacy, cookies, and terms live in the footer.
        </p>
      </div>
    </div>
  );
}
