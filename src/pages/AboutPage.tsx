import { Link } from "wouter";
import { ArrowRight, AtSign, Compass, ShieldCheck, Smartphone, Users } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { LEGAL } from "@/lib/legal";

const PILLARS = [
  {
    icon: Users,
    t: "Your networking app",
    d: "Verified mates matched on interests, availability and area — with understandable reasons, QR connect, and plans you build together.",
    href: "/mate",
    cta: "Find a mate",
  },
  {
    icon: AtSign,
    t: "Your link-in-bio",
    d: "One link for your whole world: plans, favourite stays, rentals and events at airpal.me/@you. It opens instantly, no app install needed.",
    href: "/getAirPalApp",
    cta: "Claim your link",
  },
  {
    icon: Compass,
    t: "Discover life around you",
    d: "Tonight's gigs, weekend plans, boutique stays and fresh local drops — one discovery layer for Sydney and the world around you.",
    href: "/",
    cta: "Explore Sydney",
  },
  {
    icon: Smartphone,
    t: "iPhone, Android and web",
    d: "Runs instantly in your browser today and installs to your home screen in seconds. Native iOS and Android apps are on the way.",
    href: "/getAirPalApp",
    cta: "Get the app",
  },
  {
    icon: ShieldCheck,
    t: "Trust is the product",
    d: "Identity verification where required, transaction-based reviews, on-platform messaging, reporting and blocking, and admin review at every stage.",
    href: "/privacy",
    cta: "How we protect you",
  },
];

export function AboutPage() {
  return (
    <div>
      <div className="mx-auto max-w-2xl px-4 pb-6 pt-6 md:px-6">
        <div className="overflow-hidden rounded-[28px]">
          <Photo src="/media/harbour.jpg" className="h-52 w-full object-cover md:h-72" />
        </div>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Life Made Easy.</p>
        <h1 className="font-display mt-1 text-3xl font-semibold md:text-4xl">
          People, places, things and experiences — made easier.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink/85">
          AirPal.Me is your networking app, your link-in-bio, and your guide to life and the world around you. Starting
          in Sydney: find someone to go with you, make a plan together, and discover what&apos;s on nearby — mates,
          stays, experiences, fashion and more, all in one app.
        </p>

        <ul className="mt-6 space-y-3">
          {PILLARS.map((row) => (
            <li key={row.t} className="rounded-3xl bg-card px-5 py-4 ring-1 ring-line">
              <p className="flex items-center gap-2 font-medium">
                <row.icon size={17} className="shrink-0 text-brand" />
                {row.t}
              </p>
              <p className="mt-1 text-sm text-mute">{row.d}</p>
              <Link
                href={row.href}
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
              >
                {row.cta} <ArrowRight size={14} />
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-3xl bg-card px-5 py-4 ring-1 ring-line">
          <p className="font-medium">One login, every vertical</p>
          <p className="mt-1 text-sm text-mute">
            Guests browse free. Sign in to circle family and friends, make plans, host a stay, or run a business listing
            — one AirPal account across the whole platform, never a separate login per vertical.
          </p>
        </div>

        <p className="mt-6 text-[15px] leading-relaxed text-ink/85">
          We started in The Rocks, Sydney — sandstone lanes, harbour weather, and a code on a door. The product is built
          in {LEGAL.location}. {LEGAL.brand} is operated by {LEGAL.company} (ABN {LEGAL.abn}).
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
