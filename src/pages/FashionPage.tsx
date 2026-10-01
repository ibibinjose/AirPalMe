import { useLocation } from "wouter";
import { ArrowRight, BadgeCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function FashionPage() {
  const [, nav] = useLocation();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 pb-28 md:px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">Coming later</p>
      <h1 className="font-display mt-2 text-4xl font-extrabold tracking-tight">AirPal Fashion</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-mute">
        Brand campaigns, rentals and swaps will land after listings and plans are live. We are not running a clothing
        store, and we are not listing designer inventory until a brand is actually on AirPal.
      </p>
      <div className="mt-6 rounded-3xl ring-1 ring-line bg-card p-5">
        <p className="font-display text-lg font-bold">What you can do now</p>
        <ul className="mt-3 space-y-2 text-sm text-ink">
          <li className="flex items-start gap-2">
            <BadgeCheck size={16} className="mt-0.5 shrink-0 text-brand" />
            List your boutique or brand as a business so people nearby can find you.
          </li>
          <li className="flex items-start gap-2">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-brand" />
            Publish an experience or a guest offer on your listing.
          </li>
        </ul>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={() => nav("/business/onboard")}>
          List a business <ArrowRight size={16} />
        </Button>
        <Button variant="ghost" className="ring-1 ring-line" onClick={() => nav("/")}>
          Explore places
        </Button>
      </div>
    </div>
  );
}
