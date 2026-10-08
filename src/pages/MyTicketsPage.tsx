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

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured || !user) {
      setTickets([]);
      return;
    }
    let cancelled = false;
    void getDocs(query(collection(db, "bookings"), where("customerUid", "==", user.uid), orderBy("createdAt", "desc")))
      .then((snap) => {
        if (cancelled) return;
        setTickets(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) })));
      })
      .catch(() => {
        if (!cancelled) setTickets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  if (tickets === undefined) return <PageLoading />;

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

      {tickets.length === 0 ? (
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
          {tickets.map((t) => (
            <AirPalTicketPass key={t.id} booking={t} guestName={user?.displayName || undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
