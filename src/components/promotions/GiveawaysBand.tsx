import { useEffect, useState } from "react";
import { Link } from "wouter";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { BadgePercent, Gift, Sparkles } from "lucide-react";
import { getFirebaseDb } from "@/lib/firebase";
import type { Promotion } from "@shared/promotions";

/** Homepage band: featured giveaway + links into giveaways/promotions. */
export function GiveawaysBand() {
  const [featured, setFeatured] = useState<Promotion | null>(null);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;
    void getDocs(
      query(
        collection(db, "promotions"),
        where("kind", "==", "giveaway"),
        where("status", "==", "live"),
        limit(10),
      ),
    )
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Promotion, "id">) }));
        const pick = list.find((p) => p.featured) || list[0];
        if (pick) setFeatured(pick);
      })
      .catch(() => undefined);
  }, []);

  return (
    <section className="mx-4 mt-6 md:mx-6">
      <div className="overflow-hidden rounded-[28px] border-2 border-ink bg-card p-5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
          <Sparkles size={13} /> Discover. Experience. Win.
        </p>
        {featured ? (
          <Link href={`/giveaways/${featured.id}`} className="mt-2 block">
            <span className="font-display text-xl font-bold leading-snug">{featured.title}</span>
            <span className="mt-0.5 block text-sm text-mute">
              {featured.prizeValue || featured.prize.title} · closes{" "}
              {featured.endAt ? new Date(featured.endAt).toLocaleDateString() : "soon"}
            </span>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white">
              <Gift size={15} /> Enter now
            </span>
          </Link>
        ) : (
          <p className="font-display mt-2 text-xl font-bold leading-snug">
            Giveaways and offers from local partners.
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <Link
            href="/giveaways"
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink px-3 py-1.5 text-xs font-bold"
          >
            <Gift size={13} /> Giveaways
          </Link>
          <Link
            href="/promotions"
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink px-3 py-1.5 text-xs font-bold"
          >
            <BadgePercent size={13} /> Offers near you
          </Link>
        </div>
      </div>
    </section>
  );
}
