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
      <div className="relative overflow-hidden rounded-3xl border-2 border-ink bg-slate-950 p-5 md:p-6 text-white shadow-md">
        {/* Subtle Ambient Blue Glow */}
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-brand/25 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-brand border border-brand/30 mb-2">
              <Sparkles size={12} /> Discover. Experience. Win.
            </span>
            {featured ? (
              <Link href={`/giveaways/${featured.id}`} className="block group">
                <h3 className="font-display text-xl md:text-2xl font-extrabold text-white group-hover:text-brand transition leading-snug">
                  {featured.title}
                </h3>
                <p className="mt-1 text-xs text-white/70 font-medium">
                  {featured.prizeValue || featured.prize.title} · Closes{" "}
                  {featured.endAt ? new Date(featured.endAt).toLocaleDateString() : "soon"}
                </p>
              </Link>
            ) : (
              <h3 className="font-display text-xl md:text-2xl font-extrabold text-white leading-snug">
                Giveaways &amp; offers from local partners.
              </h3>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/giveaways"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-xs font-black text-white border border-brand-ink hover:bg-brand-ink transition shadow-xs cursor-pointer"
            >
              <Gift size={14} /> Giveaways
            </Link>
            <Link
              href="/promotions"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-xs font-bold text-white border border-white/20 hover:bg-white/20 backdrop-blur-md transition cursor-pointer"
            >
              <BadgePercent size={14} /> Offers near you
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
