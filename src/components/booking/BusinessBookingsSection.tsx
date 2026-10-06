import { useEffect, useState } from "react";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { completePaidBookingRemote } from "@/lib/functions";
import {
  canProviderComplete,
  canProviderConfirm,
  canRetryPayout,
  isBusinessProviderBooking,
  isOpenProviderBooking,
  type Booking,
} from "@shared/booking";

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting you",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  in_progress: "In progress",
  completed: "Completed",
  disputed: "Disputed",
  refunded: "Refunded",
};

/**
 * §18 Business booking inbox — same `bookings` collection as Mate.
 * Owner confirms and completes bookings for their listings / experiences.
 */
export function BusinessBookingsSection() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  async function reload(uid: string) {
    const db = getFirebaseDb();
    if (!db) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "bookings"), where("providerUid", "==", uid)));
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) }))
        .filter((b) => isBusinessProviderBooking(b, uid));
      list.sort((a, b) => {
        const aOpen = isOpenProviderBooking(a.status) ? 0 : 1;
        const bOpen = isOpenProviderBooking(b.status) ? 0 : 1;
        if (aOpen !== bOpen) return aOpen - bOpen;
        return b.createdAt.localeCompare(a.createdAt);
      });
      setRows(list);
      setLoadError(false);
    } catch {
      setRows([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    void reload(user.uid);
  }, [user]);

  async function transition(b: Booking, status: Booking["status"]) {
    const db = getFirebaseDb();
    if (!db || !user || user.uid !== b.providerUid) return;
    setBusy(b.id);
    try {
      if (status === "completed") {
        await completePaidBookingRemote({ bookingId: b.id });
      } else {
        const now = new Date().toISOString();
        await updateDoc(doc(db, "bookings", b.id), { status, updatedAt: now });
      }
      await reload(user.uid);
    } finally {
      setBusy(null);
    }
  }

  if (!user) return null;

  if (loading) {
    return <p className="mt-5 text-sm text-mute">Loading bookings…</p>;
  }

  if (loadError) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-line bg-card p-6 text-center">
        <p className="font-display text-lg font-bold">Couldn&apos;t load bookings</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] leading-6 text-mute">
          Check your connection and retry.
        </p>
        <Button size="sm" variant="ghost" className="mt-3" onClick={() => void reload(user.uid)}>
          Retry
        </Button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-line bg-card p-6 text-center">
        <p className="font-display text-lg font-bold">No bookings yet</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] leading-6 text-mute">
          When guests book your listing or Experience, they land here on the shared bookings engine. Confirm, then mark
          delivered when the night is done.
        </p>
      </div>
    );
  }

  const openCount = rows.filter((b) => isOpenProviderBooking(b.status)).length;

  return (
    <section className="mt-5 rounded-2xl border border-line bg-card p-4">
      <h2 className="font-display text-base font-bold">Booking inbox</h2>
      <p className="mt-0.5 text-[13px] text-mute">
        {openCount > 0
          ? `${openCount} open · confirm pending, then mark delivered.`
          : "Guests pay AirPal. Your share is sent after you mark a booking delivered."}
      </p>
      <ul className="mt-2 divide-y divide-line">
        {rows.map((b) => (
          <li key={b.id} className="py-2.5 text-sm">
            <span className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{b.title}</span>
                <span className="block text-xs text-mute">
                  {b.suburb} · {b.date}
                  {b.time ? ` · ${b.time}` : ""}
                  {b.campaignId ? " · Experience" : b.listingId ? " · Listing" : ""}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
                {STATUS_LABEL[b.status] ?? b.status}
              </span>
            </span>
            <span className="mt-1.5 flex flex-wrap gap-1.5">
              {canProviderConfirm(b.status) && (
                <Button
                  size="sm"
                  disabled={busy === b.id}
                  loading={busy === b.id}
                  onClick={() => void transition(b, "confirmed")}
                >
                  Confirm
                </Button>
              )}
              {canProviderComplete(b.status) && (b.priceCents <= 0 || b.paymentStatus === "paid") && (
                <Button
                  size="sm"
                  disabled={busy === b.id}
                  loading={busy === b.id}
                  onClick={() => void transition(b, "completed")}
                >
                  Mark delivered
                </Button>
              )}
              {canRetryPayout(b) && (
                <Button
                  size="sm"
                  disabled={busy === b.id}
                  loading={busy === b.id}
                  onClick={() => void transition(b, "completed")}
                >
                  Get paid
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
