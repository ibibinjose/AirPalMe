import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { fieldInput } from "@/components/forms/ValidField";

export function ClubPage() {
  const [, nav] = useLocation();
  const { user } = useAuth();
  const { joinClub, leaveClub, memberByEmail } = useClub();
  const [name, setName] = useState(user?.displayName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [city, setCity] = useState("Sydney");
  const [invites, setInvites] = useState(true);
  const [offers, setOffers] = useState(true);
  const mine = memberByEmail(email);

  function onJoin(e: FormEvent) {
    e.preventDefault();
    try {
      joinClub({ name, email, city, invites, offers });
      toast.success("You're in AirPal Club");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div>
      <div className="mx-auto max-w-md px-4 pb-28 pt-6 md:px-6">
        <div className="overflow-hidden rounded-[28px]">
          <Photo src="/media/laneway.jpg" className="h-48 w-full object-cover" />
        </div>
        <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.16em] text-gold">AirPal Club</p>
        <h1 className="font-display mt-1 text-3xl font-semibold">Invites and offers, kept on this device.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/80">
          Join AirPal Club to be on our list for nights, markets, and deals. Clubs on AirPal can add you to their guest
          list. Invites today open the sender’s mail app with the list on BCC — we do not send bulk mail from our
          servers yet.
        </p>

        {mine ? (
          <div className="mt-6 rounded-3xl bg-card p-5 ring-1 ring-line">
            <p className="font-medium">You're in</p>
            <p className="mt-1 text-sm text-mute">
              {mine.email}
              {mine.invites ? " · invites" : ""}
              {mine.offers ? " · offers" : ""}
            </p>
            <button
              type="button"
              className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-brand"
              onClick={() => {
                leaveClub(mine.email);
                toast.message("Left AirPal Club");
              }}
            >
              Leave
            </button>
          </div>
        ) : (
          <form className="mt-6 space-y-3" onSubmit={onJoin}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              autoCapitalize="words"
              placeholder="Name"
              required
              className={fieldInput}
            />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className={fieldInput}
            />
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className={fieldInput} />
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={invites}
                onChange={(e) => setInvites(e.target.checked)}
                className="h-5 w-5 shrink-0 accent-brand"
              />
              Nights and guest-list invites
            </label>
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={offers}
                onChange={(e) => setOffers(e.target.checked)}
                className="h-5 w-5 shrink-0 accent-brand"
              />
              Offers from AirPal Club
            </label>
            <Button type="submit" className="w-full">
              Join AirPal Club
            </Button>
            <p className="text-[12px] text-mute">
              Unsubscribe any time. See{" "}
              <Link href="/privacy" className="text-brand">
                Privacy
              </Link>
              .
            </p>
          </form>
        )}

        <button
          type="button"
          className="mt-8 inline-flex min-h-[48px] w-full items-center justify-center text-center text-sm font-semibold text-brand"
          onClick={() => nav("/club/list")}
        >
          Clubs: open the guest list
        </button>
      </div>
    </div>
  );
}
