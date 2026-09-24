import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { useSearch } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import {
  createConnectAccountLinkRemote,
  createConnectLoginLinkRemote,
  refreshConnectAccountRemote,
  releaseHeldPayoutsRemote,
} from "@/lib/functions";
import { providerShareCents, type Booking } from "@shared/booking";

/** Stripe Connect payouts: onboard, send held shares, open Express dashboard. */
export function PayoutSetupCard() {
  const { user } = useAuth();
  const search = useSearch();
  const [busy, setBusy] = useState<"setup" | "refresh" | "release" | "login" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [heldCents, setHeldCents] = useState(0);
  const [paidCents, setPaidCents] = useState(0);
  const [heldCount, setHeldCount] = useState(0);

  async function load() {
    const db = getFirebaseDb();
    if (!db || !user) return;
    const [acct, books] = await Promise.all([
      getDoc(doc(db, "connect_accounts", user.uid)),
      getDocs(query(collection(db, "bookings"), where("providerUid", "==", user.uid))),
    ]);
    if (acct.exists()) {
      const row = acct.data() as { transfersActive?: boolean };
      setHasAccount(true);
      setReady(Boolean(row.transfersActive));
    }
    let held = 0;
    let heldN = 0;
    let paid = 0;
    for (const d of books.docs) {
      const b = d.data() as Booking;
      if (b.paymentStatus !== "paid" || b.priceCents <= 0) continue;
      const share = providerShareCents(b);
      if (b.payoutStatus === "transferred") paid += share;
      else if (b.status === "completed") {
        held += share;
        heldN += 1;
      }
    }
    setHeldCents(held);
    setHeldCount(heldN);
    setPaidCents(paid);
  }

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const flag = new URLSearchParams(search).get("payouts");
    if (flag !== "return" && flag !== "refresh") return;
    setBusy("refresh");
    void refreshConnectAccountRemote()
      .then(async (res) => {
        setHasAccount(Boolean(res.stripeAccountId));
        setReady(res.transfersActive);
        if (res.transfersActive) {
          const out = await releaseHeldPayoutsRemote();
          if (out.released > 0) {
            toast.success(
              `Sent ${out.released} payout${out.released === 1 ? "" : "s"} · $${(out.amountCents / 100).toFixed(0)}`,
            );
          }
        }
        await load();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not refresh payouts."))
      .finally(() => {
        setBusy(null);
        const url = new URL(window.location.href);
        url.searchParams.delete("payouts");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      });
  }, [user, search]);

  async function start() {
    if (!user) return;
    setBusy("setup");
    setError(null);
    try {
      const res = await createConnectAccountLinkRemote({
        returnPath: `${window.location.pathname}${window.location.search}`,
      });
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      setReady(res.transfersActive);
      setHasAccount(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open payout setup.");
    } finally {
      setBusy(null);
    }
  }

  async function sendHeld() {
    setBusy("release");
    setError(null);
    try {
      const out = await releaseHeldPayoutsRemote();
      if (out.released > 0) {
        toast.success(`Sent $${(out.amountCents / 100).toFixed(0)} to your Stripe payouts`);
      } else if (out.held > 0) {
        toast.message("Finish payout setup so we can send the held share.");
      } else {
        toast.message("Nothing waiting to send.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send payouts.");
    } finally {
      setBusy(null);
    }
  }

  async function openDashboard() {
    setBusy("login");
    setError(null);
    try {
      const res = await createConnectLoginLinkRemote();
      if (res.url) window.location.href = res.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open Stripe.");
    } finally {
      setBusy(null);
    }
  }

  if (!user) return null;

  return (
    <section className="mt-6 rounded-2xl border border-line bg-card p-4 text-left">
      <h2 className="font-display text-base font-bold">How you get paid</h2>
      <p className="mt-1 text-[13px] text-mute">
        {ready
          ? "Guests pay AirPal. After you mark a booking delivered, we send your share (price minus AirPal’s fee) to the bank account on your Stripe payouts."
          : hasAccount
            ? "Finish Stripe’s form. Then we can send held money after each completed booking."
            : "Guests never pay you directly. Set up payouts once, then mark jobs delivered to get paid."}
      </p>
      {(heldCents > 0 || paidCents > 0) && (
        <p className="mt-2 text-[13px] font-semibold text-ink">
          {heldCount > 0 ? `$${Math.round(heldCents / 100)} waiting` : "Nothing waiting"}
          {paidCents > 0 ? ` · $${Math.round(paidCents / 100)} already sent` : ""}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {!ready && (
          <Button size="sm" loading={busy === "setup"} disabled={Boolean(busy)} onClick={() => void start()}>
            {hasAccount ? "Continue payout setup" : "Set up payouts"}
          </Button>
        )}
        {ready && heldCount > 0 && (
          <Button size="sm" loading={busy === "release"} disabled={Boolean(busy)} onClick={() => void sendHeld()}>
            Send held payouts
          </Button>
        )}
        {ready && (
          <Button
            size="sm"
            variant="ghost"
            loading={busy === "login"}
            disabled={Boolean(busy)}
            onClick={() => void openDashboard()}
          >
            Open Stripe payouts
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}
