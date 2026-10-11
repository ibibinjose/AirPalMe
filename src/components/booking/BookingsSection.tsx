import { useEffect, useRef, useState } from "react";
import { addDoc, collection, doc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { createSubmitGuard } from "@/lib/submit-guard";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { logAdminAction } from "@/lib/admin-audit";
import { getDoc } from "firebase/firestore";
import {
  completePaidBookingRemote,
  createBookingCheckoutSessionRemote,
  payBookingBalanceRemote,
  refundPaidBookingRemote,
} from "@/lib/functions";
import {
  balanceDueCents,
  bookingValid,
  canCustomerCancel,
  canProviderComplete,
  canProviderConfirm,
  canRefundPaid,
  canRetryPayout,
  experienceReviewValid,
  DEFAULT_FEE_CONFIG,
  paymentStatusForPrice,
  payoutStatusForPrice,
  quoteFees,
  type Booking,
  type FeeConfig,
} from "@shared/booking";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  in_progress: "In progress",
  completed: "Completed",
  disputed: "Disputed",
  refunded: "Refunded",
};

async function loadFeeConfig(): Promise<FeeConfig> {
  const db = getFirebaseDb();
  if (!db || !isFirebaseConfigured) return DEFAULT_FEE_CONFIG;
  try {
    const snap = await getDoc(doc(db, "platform_settings", "marketplace"));
    if (!snap.exists()) return DEFAULT_FEE_CONFIG;
    const row = snap.data() as Partial<FeeConfig>;
    return {
      platformFeeBps: Number(row.platformFeeBps) || DEFAULT_FEE_CONFIG.platformFeeBps,
      minimumPlatformFeeCents: Number(row.minimumPlatformFeeCents) || 0,
    };
  } catch {
    return DEFAULT_FEE_CONFIG;
  }
}

/** §9 bookings for the signed-in user — as guest and as Mate. */
export function BookingsSection() {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<Booking[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  // Synchronous double-tap guard per booking: `busy` only disables the button
  // after a re-render, so a second tap on Pay could open a second Stripe
  // checkout session for the same booking (double charge risk).
  const guardRef = useRef(createSubmitGuard());

  const [balances, setBalances] = useState<Record<string, number>>({});

  async function reload(uid: string) {
    const db = getFirebaseDb();
    if (!db) return;
    try {
      const [asCustomer, asProvider, ledger] = await Promise.all([
        getDocs(query(collection(db, "bookings"), where("customerUid", "==", uid))),
        getDocs(query(collection(db, "bookings"), where("providerUid", "==", uid))),
        getDocs(query(collection(db, "plan_bookings"), where("guestUid", "==", uid))),
      ]);
      const seen = new Map<string, Booking>();
      for (const d of [...asCustomer.docs, ...asProvider.docs]) {
        seen.set(d.id, { id: d.id, ...(d.data() as Omit<Booking, "id">) });
      }
      const list = Array.from(seen.values());
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setRows(list);
      // C2 — remaining balance per deposit ledger, computed from server totals.
      const due: Record<string, number> = {};
      for (const d of ledger.docs) {
        const row = d.data() as { totalAmount?: number; amountPaidCents?: number; status?: string };
        if (row.status !== "confirmed") continue;
        const left = balanceDueCents(Math.round(Number(row.totalAmount || 0) * 100), Number(row.amountPaidCents || 0));
        if (left > 0) due[d.id] = left;
      }
      setBalances(due);
      setLoadError(false);
    } catch {
      setRows([]);
      setBalances({});
      setLoadError(true);
    }
  }

  useEffect(() => {
    if (!user) {
      setRows([]);
      setBalances({});
      return;
    }
    void reload(user.uid);
  }, [user]);

  async function pay(b: Booking) {
    if (!user) return;
    if (!guardRef.current.tryAcquire()) return;
    setBusy(b.id);
    try {
      const res = await createBookingCheckoutSessionRemote({ bookingId: b.id });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      await reload(user.uid);
    } finally {
      guardRef.current.release();
      setBusy(null);
    }
  }

  async function payBalance(planBookingId: string) {
    if (!user) return;
    if (!guardRef.current.tryAcquire()) return;
    setBusy(planBookingId);
    try {
      const res = await payBookingBalanceRemote({ planBookingId });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      await reload(user.uid);
    } finally {
      guardRef.current.release();
      setBusy(null);
    }
  }

  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [stars, setStars] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  // C5 — one review per completed paid experience booking (doc id = booking id).
  async function submitReview(b: Booking) {
    const db = getFirebaseDb();
    if (!db || !user || !experienceReviewValid(stars, reviewText)) return;
    if (!guardRef.current.tryAcquire()) return;
    setSavingReview(true);
    try {
      const existing = await getDoc(doc(db, "experience_reviews", b.id));
      if (existing.exists()) {
        setReviewFor(null);
        return;
      }
      const now = new Date().toISOString();
      const guestName = user.displayName?.trim().split(/\s+/)[0]?.slice(0, 40) || "Guest";
      await setDoc(doc(db, "experience_reviews", b.id), {
        guestUid: user.uid,
        planId: b.planId,
        bookingId: b.id,
        rating: stars,
        reviewText: reviewText.trim(),
        guestName,
        createdAt: now,
        updatedAt: now,
      });
      setReviewFor(null);
      setReviewText("");
      setStars(5);
    } finally {
      guardRef.current.release();
      setSavingReview(false);
    }
  }

  async function refund(b: Booking) {
    if (!user) return;
    if (!guardRef.current.tryAcquire()) return;
    setBusy(b.id);
    try {
      await refundPaidBookingRemote({ bookingId: b.id });
      await reload(user.uid);
    } finally {
      guardRef.current.release();
      setBusy(null);
    }
  }

  async function complete(b: Booking) {
    if (!user) return;
    if (!guardRef.current.tryAcquire()) return;
    setBusy(b.id);
    try {
      await completePaidBookingRemote({ bookingId: b.id });
      if (isAdmin) {
        void logAdminAction(user.uid, "booking.status", "bookings", b.id, b.status, "completed");
      }
      await reload(user.uid);
    } finally {
      guardRef.current.release();
      setBusy(null);
    }
  }

  async function transition(b: Booking, status: Booking["status"], extra: Record<string, unknown> = {}) {
    const db = getFirebaseDb();
    if (!db || !user) return;
    if (!guardRef.current.tryAcquire()) return;
    setBusy(b.id);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "bookings", b.id), { status, updatedAt: now, ...extra });
      if (isAdmin) {
        void logAdminAction(user.uid, "booking.status", "bookings", b.id, b.status, status);
      }
      await reload(user.uid);
    } finally {
      guardRef.current.release();
      setBusy(null);
    }
  }

  if (!user) return null;

  if (loadError) {
    return (
      <section className="mt-6 rounded-2xl border border-line bg-card p-4">
        <h2 className="font-display text-base font-bold">Tickets & bookings</h2>
        <p className="mt-0.5 text-[13px] text-mute">
          Couldn&apos;t load your bookings. Check your connection and retry.
        </p>
        <Button size="sm" variant="ghost" className="mt-2" onClick={() => void reload(user.uid)}>
          Retry
        </Button>
      </section>
    );
  }

  if (rows.length === 0) return null;

  return (
    <section className="mt-6 rounded-2xl border border-line bg-card p-4">
      <h2 className="font-display text-base font-bold">Tickets & bookings</h2>
      <p className="mt-0.5 text-[13px] text-mute">
        Event tickets and Mate bookings. Paid ones go through Stripe. We hold the host’s share until they mark it
        delivered.
      </p>
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
                    {b.priceCents > 0 ? ` · $${(b.priceCents / 100).toFixed(0)}` : " · free"}
                    {b.paymentStatus === "unpaid" ? " · unpaid" : b.paymentStatus === "paid" ? " · paid" : ""}
                    {b.payoutStatus === "held"
                      ? " · held for payout"
                      : b.payoutStatus === "transferred" && b.priceCents > 0
                        ? " · paid out"
                        : ""}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
                  {STATUS_LABEL[b.status] ?? b.status}
                </span>
              </span>
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                {mine && b.paymentStatus === "unpaid" && b.priceCents > 0 && (
                  <Button size="sm" disabled={busy === b.id} loading={busy === b.id} onClick={() => void pay(b)}>
                    Pay now
                  </Button>
                )}
                {mine && balances[b.id] !== undefined && balances[b.id]! > 0 && (
                  <Button
                    size="sm"
                    disabled={busy === b.id}
                    loading={busy === b.id}
                    onClick={() => void payBalance(b.id)}
                  >
                    Pay balance ${(balances[b.id]! / 100).toFixed(0)}
                  </Button>
                )}
                {mine && canCustomerCancel(b.status) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy === b.id}
                    onClick={() => void transition(b, "cancelled")}
                  >
                    Cancel booking
                  </Button>
                )}
                {!mine && canProviderConfirm(b.status) && (
                  <Button
                    size="sm"
                    disabled={busy === b.id}
                    loading={busy === b.id}
                    onClick={() => void transition(b, "confirmed")}
                  >
                    Confirm
                  </Button>
                )}
                {!mine && canProviderComplete(b.status) && (
                  <Button size="sm" disabled={busy === b.id} loading={busy === b.id} onClick={() => void complete(b)}>
                    Mark delivered
                  </Button>
                )}
                {!mine && canRetryPayout(b) && (
                  <Button size="sm" disabled={busy === b.id} loading={busy === b.id} onClick={() => void complete(b)}>
                    Get paid
                  </Button>
                )}
                {!mine && canRefundPaid(b, user.uid, isAdmin) === null && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy === b.id}
                    loading={busy === b.id}
                    onClick={() => void refund(b)}
                  >
                    Refund guest
                  </Button>
                )}
                {mine &&
                  b.status === "completed" &&
                  b.paymentStatus === "paid" &&
                  b.providerKind === "host" &&
                  b.planId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setReviewFor(reviewFor === b.id ? null : b.id);
                        setStars(5);
                        setReviewText("");
                      }}
                    >
                      Review experience
                    </Button>
                  )}
              </span>
              {reviewFor === b.id && (
                <span className="mt-2 block rounded-2xl bg-paper p-3 ring-1 ring-line/60">
                  <span className="flex items-center gap-1" role="group" aria-label="Your rating">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStars(s)}
                        aria-label={`${s} star${s === 1 ? "" : "s"}`}
                        aria-pressed={stars === s}
                        className="cursor-pointer touch-manipulation p-1"
                      >
                        <Star size={20} className={s <= stars ? "fill-gold text-accent" : "text-mute"} />
                      </button>
                    ))}
                  </span>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="How was it? (optional)"
                    className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none placeholder:text-mute focus:border-brand"
                  />
                  <span className="mt-2 flex gap-1.5">
                    <Button
                      size="sm"
                      disabled={savingReview}
                      loading={savingReview}
                      onClick={() => void submitReview(b)}
                    >
                      Submit review
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setReviewFor(null)}>
                      Cancel
                    </Button>
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Plan-linked pay-later booking for ticketed experiences (host providers). */
export async function createBookingForPlan(args: {
  planId: string;
  providerUid: string;
  providerName: string;
  title: string;
  suburb: string;
  date: string;
  time: string;
  customerUid: string;
  priceCents?: number;
}): Promise<string> {
  const db = getFirebaseDb();
  if (!db || !isFirebaseConfigured) throw new Error("Connect Firebase first.");
  const { priceCents: requestedPrice = 0, ...rest } = args;
  const priceCents = Math.max(0, Math.round(requestedPrice));
  const input = { ...rest, requestId: "", providerKind: "host" as const, priceCents };
  if (!bookingValid(input)) throw new Error("Booking details are incomplete.");
  const fees = quoteFees(priceCents, await loadFeeConfig());
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, "bookings"), {
    ...input,
    feeCents: fees.feeCents,
    paymentStatus: paymentStatusForPrice(priceCents),
    payoutStatus: payoutStatusForPrice(priceCents),
    status: "pending",
    cancelReason: "",
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
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
  priceCents?: number;
}): Promise<string> {
  const db = getFirebaseDb();
  if (!db || !isFirebaseConfigured) throw new Error("Connect Firebase first.");
  const { priceCents: requestedPrice = 0, ...rest } = args;
  const priceCents = Math.max(0, Math.round(requestedPrice));
  const input = { ...rest, planId: "", providerKind: "mate" as const, priceCents };
  if (!bookingValid(input)) throw new Error("Booking details are incomplete.");
  const fees = quoteFees(priceCents, await loadFeeConfig());
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, "bookings"), {
    ...input,
    feeCents: fees.feeCents,
    paymentStatus: paymentStatusForPrice(priceCents),
    payoutStatus: payoutStatusForPrice(priceCents),
    status: "pending",
    cancelReason: "",
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

/** Guest books a business Experience — same `bookings` collection, not a parallel RSVP path. */
export async function createBookingForCampaign(args: {
  campaignId: string;
  providerUid: string;
  providerName: string;
  title: string;
  suburb: string;
  date: string;
  time: string;
  priceCents: number;
  customerUid: string;
  listingId?: string;
}): Promise<string> {
  const db = getFirebaseDb();
  if (!db || !isFirebaseConfigured) throw new Error("Connect Firebase first.");
  const priceCents = Math.max(0, Math.round(args.priceCents || 0));
  const input = {
    requestId: "",
    planId: "",
    providerUid: args.providerUid,
    providerKind: "business" as const,
    providerName: args.providerName,
    title: args.title,
    suburb: args.suburb,
    date: args.date,
    time: args.time,
    priceCents,
    campaignId: args.campaignId,
    listingId: args.listingId,
  };
  if (!bookingValid(input)) throw new Error("Booking details are incomplete.");
  const fees = quoteFees(priceCents, await loadFeeConfig());
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, "bookings"), {
    requestId: args.campaignId,
    customerUid: args.customerUid,
    providerUid: input.providerUid,
    providerKind: input.providerKind,
    providerName: input.providerName,
    title: input.title,
    suburb: input.suburb,
    date: input.date,
    time: input.time,
    priceCents,
    feeCents: fees.feeCents,
    paymentStatus: paymentStatusForPrice(priceCents),
    payoutStatus: payoutStatusForPrice(priceCents),
    status: "pending",
    cancelReason: "",
    campaignId: args.campaignId,
    spots: 1,
    ...(args.listingId ? { listingId: args.listingId } : {}),
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

/** Ticketed events book through the same engine as campaigns: one pending row, fees quoted, Stripe collects. */
export async function createBookingForEvent(args: {
  eventId: string;
  providerUid: string;
  providerName: string;
  title: string;
  suburb: string;
  date: string;
  time: string;
  priceCents: number;
  customerUid: string;
  spots?: number;
}): Promise<string> {
  const db = getFirebaseDb();
  if (!db || !isFirebaseConfigured) throw new Error("Connect Firebase first.");
  const priceCents = Math.max(0, Math.round(args.priceCents || 0));
  const input = {
    requestId: args.eventId,
    planId: "",
    providerUid: args.providerUid,
    providerKind: "business" as const,
    providerName: args.providerName,
    title: args.title,
    suburb: args.suburb,
    date: args.date,
    time: args.time,
    priceCents,
    eventId: args.eventId,
  };
  if (!bookingValid(input)) throw new Error("Booking details are incomplete.");
  const fees = quoteFees(priceCents, await loadFeeConfig());
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, "bookings"), {
    requestId: args.eventId,
    customerUid: args.customerUid,
    providerUid: input.providerUid,
    providerKind: input.providerKind,
    providerName: input.providerName,
    title: input.title,
    suburb: input.suburb,
    date: input.date,
    time: input.time,
    priceCents,
    feeCents: fees.feeCents,
    paymentStatus: paymentStatusForPrice(priceCents),
    payoutStatus: payoutStatusForPrice(priceCents),
    status: "pending",
    cancelReason: "",
    eventId: args.eventId,
    spots: args.spots || 1,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}
