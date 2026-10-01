import { useEffect, useState } from "react";
import { Link } from "wouter";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { bookingDisplayPaid, type Booking } from "@shared/booking";
import { AirPalTicketPass } from "@/components/tickets/AirPalTicketPass";

/** Bounded wait for the Stripe webhook before showing the pass as-is. */
const CONFIRM_TIMEOUT_MS = 45_000;

/**
 * Single-ticket view for `?booked=` return URLs. Confirmation is
 * webhook-only, so this listens live: a priced booking that still reads
 * unpaid is "confirming", never an unpaid hold, until the timeout.
 */
export function TicketPass({ bookingId }: { bookingId: string }) {
  const { user } = useAuth();
  const [booking, setBooking] = useState<(Booking & { id: string }) | null>(null);
  const [confirmTimedOut, setConfirmTimedOut] = useState(false);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !bookingId) return;
    return onSnapshot(
      doc(db, "bookings", bookingId),
      (snap) => {
        if (!snap.exists()) return;
        setBooking({ id: snap.id, ...(snap.data() as Omit<Booking, "id">) });
      },
      () => undefined,
    );
  }, [bookingId]);

  useEffect(() => {
    if (!booking || bookingDisplayPaid(booking) || confirmTimedOut) return;
    const t = window.setTimeout(() => setConfirmTimedOut(true), CONFIRM_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [booking, confirmTimedOut]);

  if (!booking) {
    return (
      <div className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-line">
        <p className="text-sm text-mute">Loading your ticket…</p>
      </div>
    );
  }

  if (!bookingDisplayPaid(booking) && !confirmTimedOut) {
    return (
      <div className="mt-4 rounded-2xl bg-card p-5 ring-1 ring-line" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <span className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <div>
            <p className="text-sm font-bold text-ink">Confirming your payment…</p>
            <p className="mt-0.5 text-[13px] leading-5 text-mute">
              Stripe approved it — we&apos;re updating your ticket now. This usually takes a few seconds.
            </p>
          </div>
        </div>
        <Link href="/me/tickets" className="mt-3 inline-block text-[13px] font-semibold text-brand">
          View all tickets →
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <AirPalTicketPass booking={booking} guestName={user?.displayName || undefined} />
      <Link href="/me/tickets" className="mt-2 inline-block text-[13px] font-semibold text-brand">
        View all tickets →
      </Link>
    </div>
  );
}
