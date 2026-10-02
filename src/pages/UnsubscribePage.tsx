import { useState } from "react";
import { Link, useSearch } from "wouter";
import { MailX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ensureAnonymousSession } from "@/lib/firebase";
import { unsubscribeGuestlistRemote } from "@/lib/functions";

function emailFromSearch(search: string): string {
  try {
    return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("email") || "";
  } catch {
    return "";
  }
}

/**
 * One-click unsubscribe for the AirPal Guestlist. No account needed:
 * an anonymous session carries the rate-limited callable, which answers
 * OK even for unknown addresses so the endpoint never oracles membership.
 */
export function UnsubscribePage() {
  const search = useSearch();
  const [email, setEmail] = useState(() => emailFromSearch(search));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || done) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      toast.error("Add a valid email address.");
      return;
    }
    setBusy(true);
    try {
      await ensureAnonymousSession();
      await unsubscribeGuestlistRemote({ email: email.trim() });
      setDone(true);
    } catch {
      toast.error("Couldn't unsubscribe right now. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <MailX size={28} aria-hidden className="mx-auto text-mute" />
      <h1 className="font-display mt-3 text-3xl font-bold tracking-tight">Unsubscribe</h1>
      {done ? (
        <>
          <p className="mt-2 text-[15px] leading-relaxed text-ink/80">
            You&apos;re off the AirPal Guestlist — no more event invites to {email.trim()}. Changed your mind? Rejoin
            from any bio anytime.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
            Back to AirPal.Me
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm leading-6 text-mute">
            Leave the AirPal Guestlist and we&apos;ll stop emailing event invites to this address.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-3 text-left">
            <label htmlFor="unsub-email" className="text-sm font-semibold">
              Email address
            </label>
            <input
              id="unsub-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 w-full rounded-xl bg-card px-3 text-[16px] text-ink ring-1 ring-line"
            />
            <Button type="submit" disabled={busy} className="h-11 w-full">
              {busy ? "Working…" : "Unsubscribe me"}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
