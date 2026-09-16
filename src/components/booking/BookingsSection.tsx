import { useEffect, useState } from "react";
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { logAdminAction } from "@/lib/admin-audit";
import {
  bookingValid,
  canCustomerCancel,
  canProviderComplete,
  canProviderConfirm,
  quoteFees,
  type Booking,
} from "@shared/booking";

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting mate",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  in_progress: "In progress",
  completed: "Completed",
  disputed: "Disputed",
  refunded: "Refunded",
};

/** §9 bookings for the signed-in user — as guest and as Mate. Money deferred until Stripe. */
export function BookingsSection() {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<Booking[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function reload(uid: string) {
    const db = getFirebaseDb();
    if (!db) return;
    try {
      const [asCustomer, asProvider] = await Promise.all([
        getDocs(query(collection(db, "bookings"), where("customerUid", "==", uid))),
        getDocs(query(collection(db, "bookings"), where("providerUid", "==", uid))),
      ]);
      const seen = new Map<string, Booking>();
      for (const d of [...asCustomer.docs, ...asProvider.docs]) {
        seen.set(d.id, { id: d.id, ...(d.data() as Omit<Booking, "id">) });
      }
      const list = Array.from(seen.values());
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setRows(list);
    } catch {
      setRows([]);
    }
  }

  useEffect(() => {
    if (!user) {
      setRows([]);
      return;
    }
    void reload(user.uid);
  }, [user]);

  async function transition(b: Booking, status: Booking["status"], extra: Record<string, unknown> = {}) {
    const db = getFirebaseDb();
    if (!db || !user) return;
    setBusy(b.id);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "bookings", b.id), { status, updatedAt: now, ...extra });
      // Provider completing also closes the request loop (§30 acceptance).
      if (status === "completed" && user.uid === b.providerUid) {
        try {
          await updateDoc(doc(db, "mate_requests", b.requestId), {
            status: "completed",
            completedAt: now,
            updatedAt: now,
          });
        } catch {
          // Request close is best-effort; admin can always intervene.
        }
      }
      if (isAdmin) {
        void logAdminAction(user.uid, "booking.status", "bookings", b.id, b.status, status);
      }
      await reload(user.uid);
    } finally {
      setBusy(null);
    }
  }

  if (!user || rows.length === 0) return null;

  return (
    <section className="mt-6 rounded-2xl border border-line bg-card p-4">
      <h2 className="font-display text-base font-bold">Bookings</h2>
      <p className="mt-0.5 text-[13px] text-mute">Payment lands with Stripe — until then, bookings confirm intent.</p>
      <ul className="mt-2 divide-y divide-line">
        {rows.map((b) => {
          const mine = b.customerUid === user.uid;
          return (
            <li key={b.id} className="py-2 text-sm">
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{b.title}</span>
                  <span className="block text-xs text-mute">
                    {mine ? `with ${b.providerName}` : `for ${b.title}`} · {b.suburb} · {b.date}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">
                  {STATUS_LABEL[b.status] ?? b.status}
                </span>
              </span>
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                {mine && canCustomerCancel(b.status) && (
                  <Button size="sm" variant="ghost" disabled={busy === b.id} onClick={() => void transition(b, "cancelled")}>
                    Cancel booking
                  </Button>
                )}
                {!mine && canProviderConfirm(b.status) && (
                  <Button size="sm" disabled={busy === b.id} loading={busy === b.id} onClick={() => void transition(b, "confirmed")}>
                    Confirm
                  </Button>
                )}
                {!mine && canProviderComplete(b.status) && (
                  <Button size="sm" disabled={busy === b.id} loading={busy === b.id} onClick={() => void transition(b, "completed")}>
                    Mark delivered
                  </Button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export async function createBookingForRequest(args: {
  requestId: string;
  providerUid: string;
  providerName: string;
  title: string;
  suburb: string;
  date: string;
  time: string;
  customerUid: string;
}): Promise<string> {
  const db = getFirebaseDb();
  if (!db || !isFirebaseConfigured) throw new Error("Connect Firebase first.");
  const input = { ...args, providerKind: "mate" as const, priceCents: 0 };
  if (!bookingValid(input)) throw new Error("Booking details are incomplete.");
  const { feeCents } = quoteFees(0);
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, "bookings"), {
    ...input,
    feeCents,
    paymentStatus: "deferred",
    status: "pending",
    cancelReason: "",
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}
