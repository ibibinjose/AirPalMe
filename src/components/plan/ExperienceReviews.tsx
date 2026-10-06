import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Star } from "lucide-react";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

interface ExperienceReview {
  id: string;
  rating: number;
  reviewText: string;
  guestName: string;
  createdAt: string;
}

/** C5 — public guest reviews for a completed experience. Honest empty. */
export function ExperienceReviews({ planId }: { planId: string }) {
  const [rows, setRows] = useState<ExperienceReview[] | null>(null);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured || !planId) {
      setRows([]);
      return;
    }
    void getDocs(
      query(collection(db, "experience_reviews"), where("planId", "==", planId), orderBy("createdAt", "desc"), limit(20)),
    )
      .then((snap) => {
        setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ExperienceReview, "id">) })));
      })
      .catch(() => setRows([]));
  }, [planId]);

  if (!rows || rows.length === 0) return null;
  const avg = rows.reduce((n, r) => n + r.rating, 0) / rows.length;

  return (
    <section className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs" aria-label="Guest reviews">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Completed experiences</p>
      <h2 className="font-display text-xl font-bold text-ink">
        Guest reviews · {avg.toFixed(1)} <Star size={15} className="inline fill-gold text-accent" />
      </h2>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-2xl bg-paper p-3 ring-1 ring-line/60">
            <p className="flex items-center gap-1" aria-label={`${r.rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={13} className={s <= r.rating ? "fill-gold text-accent" : "text-line"} />
              ))}
              <span className="ml-1 text-[12px] font-semibold text-mute">{r.guestName}</span>
            </p>
            {r.reviewText.trim() && <p className="mt-1 text-[14px] text-ink">{r.reviewText}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
