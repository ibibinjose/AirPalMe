import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ArrowLeft, BadgePercent, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getFirebaseDb } from "@/lib/firebase";
import { cn } from "@/lib/cn";
import { PROMOTION_CATEGORIES, type Promotion } from "@shared/promotions";

export function PromotionsPage() {
  const [rows, setRows] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("All");

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) {
      setLoading(false);
      return;
    }
    void getDocs(
      query(collection(db, "promotions"), where("kind", "==", "promotion"), where("status", "in", ["live", "closed"])),
    )
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Promotion, "id">) }));
        list.sort((a, b) => (a.endAt || "").localeCompare(b.endAt || ""));
        setRows(list);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (category === "All" ? rows : rows.filter((r) => r.category === category)),
    [rows, category],
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="flex items-center gap-1 text-[13px] font-medium text-mute">
        <ArrowLeft size={14} /> Explore
      </Link>
      <p className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
        <BadgePercent size={13} /> AirPal Promotions
      </p>
      <h1 className="font-display mt-1 text-3xl font-bold">Offers near you.</h1>
      <p className="mt-1 text-sm text-mute">Discounts and member offers from local businesses.</p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {["All", ...PROMOTION_CATEGORIES].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "shrink-0 rounded-full border-2 px-3 py-1 text-xs font-semibold",
              category === c ? "border-brand bg-brand text-white" : "border-ink/15 bg-card",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-mute">Loading promotions…</p>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-3xl border-2 border-dashed border-ink/20 p-8 text-center">
          <BadgePercent size={32} className="mx-auto text-mute" />
          <p className="font-display mt-2 text-lg font-bold">No promotions near you yet.</p>
          <p className="mt-1 text-sm text-mute">New partner offers land here every week.</p>
          <Link href="/giveaways">
            <Button className="mt-4">Browse giveaways</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {filtered.map((p) => {
            const expired = p.endAt && Date.parse(p.endAt) <= Date.now();
            return (
              <Link
                key={p.id}
                href={`/promotions/${p.id}`}
                className="flex items-center gap-3 rounded-2xl ring-1 ring-line bg-card p-3"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                  <BadgePercent size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{p.title}</span>
                  <span className="block truncate text-xs text-mute">{p.prizeValue || p.sponsorName}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-mute">
                    {p.locationText && (
                      <span className="inline-flex items-center gap-0.5">
                        <MapPin size={11} />
                        {p.locationText}
                      </span>
                    )}
                    {p.endAt && !expired && (
                      <span className="inline-flex items-center gap-0.5">
                        <Clock size={11} />
                        Ends {new Date(p.endAt).toLocaleDateString()}
                      </span>
                    )}
                    {expired && <span>Ended</span>}
                  </span>
                </span>
                <span className="shrink-0 rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-white">View</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
