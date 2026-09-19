import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { getFirebaseDb } from "@/lib/firebase";
import { completePaidBookingRemote } from "@/lib/functions";
import type { Booking } from "@shared/booking";
import { canProviderComplete, canRetryPayout } from "@shared/booking";
import { PayoutSetupCard } from "@/components/connect/PayoutSetupCard";

export function TicketSalesPanel({ planId }: { planId: string }) {
  const [rows, setRows] = useState<Booking[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function reload() {
    const db = getFirebaseDb();
    if (!db) return;
    const snap = await getDocs(query(collection(db, "bookings"), where("planId", "==", planId)));
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) }));
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setRows(list);
  }

  useEffect(() => {
    void reload();
  }, [planId]);

  const paid = rows.filter((b) => b.paymentStatus === "paid");
  const takings = paid.reduce((sum, b) => sum + b.priceCents, 0);

  return (
    <section className="mt-8 rounded-3xl bg-card p-5 ring-1 ring-line">
      <h2 className="font-display text-xl font-bold">Ticket sales</h2>
      <p className="mt-1 text-[13px] text-mute">
        {paid.length} paid · ${(takings / 100).toFixed(0)} taken. We send your share after you mark a ticket delivered.
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-mute">No tickets yet. Share the event so people can buy.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {rows.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-semibold">
                  {b.spots && b.spots > 1 ? `${b.spots} tickets` : "1 ticket"}
                </span>
                <span className="block text-[12px] text-mute">
                  {b.paymentStatus === "paid" ? "Paid" : "Unpaid"} · ${(b.priceCents / 100).toFixed(0)}
                  {b.payoutStatus === "held" ? " · held" : b.payoutStatus === "transferred" ? " · paid out" : ""}
                </span>
              </span>
              {canProviderComplete(b.status) && b.paymentStatus === "paid" && (
                <Button
                  size="sm"
                  disabled={busy === b.id}
                  loading={busy === b.id}
                  onClick={() => {
                    setBusy(b.id);
                    void completePaidBookingRemote({ bookingId: b.id })
                      .then(() => reload())
                      .finally(() => setBusy(null));
                  }}
                >
                  Mark delivered
                </Button>
              )}
              {canRetryPayout(b) && (
                <Button
                  size="sm"
                  disabled={busy === b.id}
                  loading={busy === b.id}
                  onClick={() => {
                    setBusy(b.id);
                    void completePaidBookingRemote({ bookingId: b.id })
                      .then(() => reload())
                      .finally(() => setBusy(null));
                  }}
                >
                  Get paid
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <PayoutSetupCard />
    </section>
  );
}
