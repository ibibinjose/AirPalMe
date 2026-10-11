import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { BadgeCheck, Crown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { createSubscriptionCheckoutRemote, createSubscriptionPortalRemote } from "@/lib/functions";
import { isSubscriptionActive, type BusinessSubscription } from "@shared/subscription";

/**
 * C4 — AirPal Partner card. Renders only behind a live place (the caller
 * gates on `mine`). Base tools stay free; Partner unlocks campaigns.
 */
export function BusinessSubscriptionCard() {
  const { user } = useAuth();
  const [sub, setSub] = useState<BusinessSubscription | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState<"buy" | "manage" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured || !user) return;
    void getDoc(doc(db, "business_subscriptions", user.uid))
      .then((snap) => {
        if (snap.exists()) setSub(snap.data() as BusinessSubscription);
      })
      .catch(() => undefined);
    void getDoc(doc(db, "platform_settings", "marketplace"))
      .then((snap) => {
        if (snap.exists()) setLabel(String((snap.data() as { businessPriceLabel?: unknown }).businessPriceLabel || ""));
      })
      .catch(() => undefined);
  }, [user]);

  const active = isSubscriptionActive(sub);

  async function subscribe() {
    setBusy("buy");
    setError(null);
    try {
      const res = await createSubscriptionCheckoutRemote();
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start checkout.");
    } finally {
      setBusy(null);
    }
  }

  async function manage() {
    setBusy("manage");
    setError(null);
    try {
      const res = await createSubscriptionPortalRemote();
      if (res.portalUrl) {
        window.location.href = res.portalUrl;
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open billing.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-[28px] bg-card p-4 ring-1 ring-line" aria-label="Partner subscription">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">AirPal Partner</p>
      <h2 className="font-display mt-1 text-lg font-semibold">{active ? "Partner active" : "Grow this place"}</h2>
      <p className="mt-1 text-sm text-mute">
        {active
          ? "Campaigns are unlocked on this place. Manage seats, invoices, and cancellation in billing."
          : `Your place, offers, and bookings stay free. Partner${label ? ` (${label})` : ""} unlocks campaigns that fill seats.`}
      </p>
      {active && (
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
          <BadgeCheck size={12} /> Partner place
        </p>
      )}
      {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {active ? (
          <Button size="sm" disabled={busy === "manage"} loading={busy === "manage"} onClick={() => void manage()}>
            Manage billing
          </Button>
        ) : (
          <Button size="sm" disabled={busy === "buy"} loading={busy === "buy"} onClick={() => void subscribe()}>
            <Crown size={14} /> Become a Partner
          </Button>
        )}
      </div>
    </section>
  );
}
