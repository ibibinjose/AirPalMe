import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { Ticket } from "lucide-react";
import { getFirebaseDb } from "@/lib/firebase";
import { makeQrDataUrl } from "@/lib/qr";
import { publicSiteOrigin } from "@/lib/public-origin";
import type { Booking } from "@shared/booking";

export function TicketPass({ bookingId }: { bookingId: string }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [qr, setQr] = useState<string>("");

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !bookingId) return;
    void getDoc(doc(db, "bookings", bookingId)).then((snap) => {
      if (!snap.exists()) return;
      const row = { id: snap.id, ...(snap.data() as Omit<Booking, "id">) };
      setBooking(row);
      const origin = publicSiteOrigin();
      const href = row.planId
        ? `${origin}/plan/${row.planId}?ticket=${row.id}`
        : `${origin}/experiences?ticket=${row.id}`;
      void makeQrDataUrl(href, 200)
        .then(setQr)
        .catch(() => setQr(""));
    });
  }, [bookingId]);

  if (!booking) {
    return (
      <div className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-line">
        <p className="text-sm text-mute">Loading your ticket…</p>
      </div>
    );
  }

  const paid = booking.paymentStatus === "paid" || booking.priceCents <= 0;

  return (
    <article className="mt-4 overflow-hidden rounded-3xl bg-card ring-1 ring-line">
      <div className="flex items-center justify-between bg-amber-500 px-4 py-2 text-slate-950">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
          <Ticket size={14} /> {paid ? "Ticket" : "Unpaid hold"}
        </span>
        <span className="text-[11px] font-semibold">
          {booking.spots && booking.spots > 1 ? `${booking.spots} spots` : "1 spot"}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3 p-4">
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-tight">{booking.title}</p>
          <p className="mt-1 text-[13px] text-mute">
            {booking.date}
            {booking.time ? ` · ${booking.time}` : ""} · {booking.suburb}
          </p>
          <p className="mt-2 font-mono text-[12px] text-ink">{booking.id}</p>
          <p className="mt-1 text-[12px] font-semibold text-brand">
            {paid ? "Paid on AirPal" : "Pay to activate this ticket"}
          </p>
        </div>
        {qr ? <img src={qr} alt="" className="h-24 w-24 rounded-xl bg-white p-1 ring-1 ring-line" /> : null}
      </div>
    </article>
  );
}
