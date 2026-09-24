import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Booking } from "@shared/booking";
import { AirPalTicketPass } from "@/components/tickets/AirPalTicketPass";

/** Single-ticket view for booking confirmations. The wallet home is /me/tickets. */
export function TicketPass({ bookingId }: { bookingId: string }) {
  const { user } = useAuth();
  const [booking, setBooking] = useState<(Booking & { id: string }) | null>(null);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !bookingId) return;
    let cancelled = false;
    void getDoc(doc(db, "bookings", bookingId))
      .then((snap) => {
        if (!snap.exists() || cancelled) return;
        setBooking({ id: snap.id, ...(snap.data() as Omit<Booking, "id">) });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  if (!booking) {
    return (
      <div className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-line">
        <p className="text-sm text-mute">Loading your ticket…</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <AirPalTicketPass booking={booking} guestName={user?.displayName || undefined} />
    </div>
  );
}
