import { useEffect, useState } from "react";
import { Link } from "wouter";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ArrowLeft, BadgePercent, ChevronRight, Star, Users } from "lucide-react";
import { InvitePanel } from "@/components/invite/InvitePanel";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { getFirebaseDb } from "@/lib/firebase";
import type { Promotion } from "@shared/promotions";

/**
 * Two duties, one page:
 * 1. Rewards — live offers posted by the AirPal platform (admin: /admin/promotions).
 * 2. Referral — your invite code and Stars (earn, never buy).
 */
export function RewardsPage() {
  const { user } = useAuth();
  const { mine, biosReady } = useBio();
  const [rewards, setRewards] = useState<Promotion[] | undefined>(undefined);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) {
      setRewards([]);
      return;
    }
    let cancelled = false;
    void getDocs(
      query(
        collection(db, "promotions"),
        where("kind", "==", "promotion"),
        where("status", "in", ["live", "approved"]),
      ),
    )
      .then((snap) => {
        if (cancelled) return;
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Promotion, "id">) }));
        list.sort((a, b) => (a.endAt || "").localeCompare(b.endAt || ""));
        setRewards(list.slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setRewards([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-4 md:px-6 md:pt-6">
      <Link
        href="/me"
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-semibold text-ink ring-1 ring-line hover:bg-paper"
      >
        <ArrowLeft size={15} /> Me
      </Link>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
        <Star size={12} aria-hidden /> Stars & Perks
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold text-ink">Rewards</h1>
      <p className="mt-1 text-sm text-mute">Platform offers for you — plus Stars for bringing your mates.</p>

      {/* Duty 1: platform Rewards (admin posts these at /admin/promotions) */}
      <section aria-label="Platform rewards" className="mt-4 rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
        <h2 className="flex items-center gap-1.5 font-display text-lg font-bold text-ink">
          <BadgePercent size={18} className="text-brand" aria-hidden /> Rewards from AirPal
        </h2>
        <div className="mt-3 space-y-2">
          {rewards === undefined ? (
            <p className="text-sm text-mute">Loading live offers…</p>
          ) : rewards.length === 0 ? (
            <div className="rounded-2xl bg-paper/70 px-4 py-5 text-center ring-1 ring-line/70">
              <p className="text-sm font-semibold text-ink">No live rewards right now</p>
              <p className="mt-1 text-xs text-mute">New platform offers land here first.</p>
            </div>
          ) : (
            rewards.map((promo) => (
              <Link
                key={promo.id}
                href={`/promotions/${promo.id}`}
                className="flex items-center gap-3 rounded-2xl bg-paper/70 px-3.5 py-3 ring-1 ring-line/70 transition hover:bg-paper active:scale-[0.99]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink">{promo.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-mute">
                    {[promo.sponsorName, promo.category].filter(Boolean).join(" · ")}
                    {promo.endAt ? ` · Ends ${new Date(promo.endAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}` : ""}
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-mute" aria-hidden />
              </Link>
            ))
          )}
        </div>
        <Link
          href="/promotions"
          className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-[13px] font-semibold text-brand hover:underline"
        >
          Browse all offers <ChevronRight size={14} aria-hidden />
        </Link>
      </section>

      {/* Duty 2: referral — invite code and Stars */}
      <section aria-label="Referral" className="mt-4 rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
        <h2 className="flex items-center gap-1.5 font-display text-lg font-bold text-ink">
          <Users size={18} className="text-brand" aria-hidden /> Refer a mate, earn Stars
        </h2>
        <div className="mt-3">
          {!user ? (
            <div className="py-2 text-center">
              <p className="text-sm font-semibold text-ink">Sign in to get your invite code</p>
              <p className="mt-1 text-xs text-mute">Your invites and tiers stay on your account.</p>
              <Link
                href={`/start?next=${encodeURIComponent("/me/rewards")}`}
                className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
              >
                Sign in / Create account
              </Link>
            </div>
          ) : (
            <InvitePanel handle={mine?.handle} loading={!biosReady} />
          )}
        </div>
      </section>
    </div>
  );
}
