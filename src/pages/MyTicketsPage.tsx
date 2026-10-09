import { useEffect, useState } from "react";
import { Link } from "wouter";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { ArrowLeft, Ticket } from "lucide-react";
import { PageLoading } from "@/components/ui/PageLoading";
import { AirPalTicketPass } from "@/components/tickets/AirPalTicketPass";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import type { Booking } from "@shared/booking";

/**
 * AirPal Wallet — every ticket the guest holds, in one place. Paid and
 * free, events and experiences, each a scannable branded pass with
 * save-as-PDF and share.
 */
export function MyTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<(Booking & { id: string })[] | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured || !user) {
      setTickets([]);
      return;
    }
    let cancelled = false;
    setFailed(false);
    void getDocs(query(collection(db, "bookings"), where("customerUid", "==", user.uid), orderBy("createdAt", "desc")))
      .then((snap) => {
        if (cancelled) return;
        setTickets(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) })));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, attempt]);

  if (tickets === undefined && !failed) return <PageLoading />;
  const list = tickets ?? [];

  const retry = () => {
    setTickets(undefined);
    setFailed(false);
    setAttempt((a) => a + 1);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-4 md:px-6 md:pt-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/pass"
          className="no-print inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-semibold text-ink ring-1 ring-line hover:bg-paper"
        >
          <ArrowLeft size={15} /> AirPal Pass
        </Link>
        <Link
          href="/"
          className="no-print inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-semibold text-mute ring-1 ring-line hover:bg-paper hover:text-ink"
        >
          AirPal.Me
        </Link>
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">AirPal Pass · Wallet</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-ink">My event passes &amp; tickets</h1>

      {!user ? (
        <div className="mt-4 rounded-3xl bg-card p-8 text-center ring-1 ring-line shadow-xs">
          <Ticket size={28} className="mx-auto text-mute" />
          <p className="mt-2 font-display text-lg font-bold text-ink">Sign in to see your passes</p>
          <p className="mx-auto mt-1 max-w-sm text-[14px] text-mute">
            Tickets and passes live under your AirPal account — one account, tickets everywhere.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link href="/start?tab=signin" className="no-print inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-sm font-semibold text-white">
              Sign in
            </Link>
            <Link href="/pass" className="no-print inline-flex min-h-[44px] items-center rounded-full bg-paper px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card">
              Browse events
            </Link>
          </div>
        </div>
      ) : failed ? (
        <div className="mt-4 rounded-3xl bg-card p-8 text-center ring-1 ring-line shadow-xs">
          <Ticket size={28} className="mx-auto text-mute" />
          <p className="mt-2 font-display text-lg font-bold text-ink">Couldn&apos;t load your tickets</p>
          <p className="mx-auto mt-1 max-w-sm text-[14px] text-mute">
            Check your connection and try again — your passes are safe.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={retry}
              className="no-print inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-brand px-5 text-sm font-semibold text-white"
            >
              Try again
            </button>
            <Link href="/pass" className="no-print inline-flex min-h-[44px] items-center rounded-full bg-paper px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card">
              Browse events
            </Link>
          </div>
        </div>
      ) : list.length === 0 ? (
        <div className="mt-4 rounded-3xl bg-card p-8 text-center ring-1 ring-line shadow-xs">
          <Ticket size={28} className="mx-auto text-mute" />
          <p className="mt-2 font-display text-lg font-bold text-ink">No tickets or passes yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[14px] text-mute">
            Passes and tickets you get on AirPal Pass live here — ready to scan at the door, save, and share.
          </p>
          <Link href="/pass" className="no-print mt-4 inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-sm font-semibold text-white">
            Explore AirPal Pass
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {list.map((t) => (
            <AirPalTicketPass key={t.id} booking={t} guestName={user?.displayName || undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
