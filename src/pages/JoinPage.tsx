import { useLocation } from "wouter";
import { ArrowRight, CheckCircle2, Compass, Store, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { partnerAccountPath } from "@/lib/partner-account";
import { NAMES } from "@shared/names";

export function JoinPage() {
  const [, nav] = useLocation();
  const { user, authReady } = useAuth();
  const { mine, business } = useBio();

  if (!authReady) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-mute">Loading…</div>;
  }

  const hasAccount = Boolean(user);
  const hasPlace = Boolean(business);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">AirPal.me · Sydney</p>
        <h1 className="font-display mt-2 text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight text-ink">
          Join the AirPal Network — Made Easy
        </h1>
        <p className="mt-4 text-base leading-relaxed text-mute">
          Everyone on AirPal has a personal account. That&apos;s how you explore places, make plans, and join a Circle.
        </p>
        <p className="mt-3 text-base leading-relaxed text-mute">
          Some people stay as a user. That&apos;s enough. Others also create a{" "}
          <strong className="font-semibold text-ink">business profile</strong> so their café, shop, stay, or studio can
          be found in Discover — with products, services, and offers.
        </p>
      </header>

      {user && (
        <p className="mt-6 rounded-2xl border border-line bg-card px-4 py-3 text-sm">
          Signed in{mine?.handle ? ` as @${mine.handle}` : user.displayName ? ` as ${user.displayName}` : ""}.
          {hasPlace ? " Your business profile is live." : " You can stay a user, or add a business profile below."}
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col rounded-3xl ring-1 ring-line bg-card p-6">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/10 text-brand">
            <User size={22} />
          </span>
          <h2 className="font-display mt-4 text-xl font-bold">Just use AirPal</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-mute">
            Create a personal account if you don&apos;t have one. Find places, start a Circle, make plans. No business
            listing required.
          </p>
          <Button
            className="mt-5 w-full justify-between"
            variant={hasAccount ? "ghost" : "primary"}
            onClick={() => nav(hasAccount ? "/" : "/start?tab=signup&next=/")}
          >
            <span>{hasAccount ? "Explore" : "Create my account"}</span>
            <ArrowRight size={16} />
          </Button>
        </div>

        <div className="flex flex-col rounded-3xl ring-1 ring-line bg-card p-6">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-700">
            <Store size={22} />
          </span>
          <h2 className="font-display mt-4 text-xl font-bold">{NAMES.partnerAccount}</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-mute">
            Same AirPal login. Import the place from Google, go live, then add a product, a service, and an offer.
            Guests find it on What&apos;s on and in search.
          </p>
          <Button
            className="mt-5 w-full justify-between"
            onClick={() => nav(partnerAccountPath({ signedIn: hasAccount, hasPlace }))}
          >
            <span>{hasPlace ? NAMES.yourPlace : "Open a partner account"}</span>
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>

      <section className="mt-10 rounded-3xl ring-1 ring-line bg-paper p-6">
        <h2 className="font-display text-xl font-bold">How a business profile goes live</h2>
        <ol className="mt-4 space-y-3">
          {[
            {
              n: "1",
              t: "Open a partner account",
              d: "Same login. Name the place and what it is — café, shop, stay, and so on.",
            },
            {
              n: "2",
              t: "You",
              d: "Who we can contact. Featured needs a work email on the Google website, or an ABN.",
            },
            {
              n: "3",
              t: "Verify",
              d: "Import the public Google listing. A checkbox is a directory claim, not Google ownership.",
            },
            {
              n: "4",
              t: "Go live, then add 3 things",
              d: "One product, one service, one offer so people nearby can find you.",
            },
          ].map((row) => (
            <li key={row.n} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">
                {row.n}
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{row.t}</span>
                <span className="block text-[13px] text-mute">{row.d}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-start gap-2 text-[13px] text-mute">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand" />
          Stay host tools, events, and experiences open after the profile is live. One thing at a time.
        </p>
      </section>

      <p className="mt-6 text-center text-sm text-mute">
        <button type="button" className="font-semibold text-brand hover:underline" onClick={() => nav("/")}>
          <Compass size={14} className="mr-1 inline" />
          Browse as a guest
        </button>
      </p>
    </div>
  );
}
