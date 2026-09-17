import { useEffect, useState } from "react";
import { Link } from "wouter";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ArrowLeft, Megaphone, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PromoStatusChip } from "@/components/promotions/PromoStatusChip";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import type { Promotion } from "@shared/promotions";

export function BusinessPromotionsPage() {
  const { user, authReady, requireUser } = useAuth();
  const [rows, setRows] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authReady) return;
    if (!requireUser("Sign in to manage your promotions.")) {
      setLoading(false);
      return;
    }
    const db = getFirebaseDb();
    if (!db || !user) {
      setLoading(false);
      return;
    }
    void getDocs(query(collection(db, "promotions"), where("ownerUid", "==", user.uid)))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Promotion, "id">) }));
        list.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
        setRows(list);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [authReady, user, requireUser]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/business" className="flex items-center gap-1 text-[13px] font-medium text-mute">
        <ArrowLeft size={14} /> Business
      </Link>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Your promotions</h1>
          <p className="mt-0.5 text-sm text-mute">Drafts, reviews, live campaigns and results.</p>
        </div>
        <Link href="/business/promotions/new">
          <Button><Plus size={15} /> New</Button>
        </Link>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-mute">Loading campaigns…</p>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-3xl border-2 border-dashed border-ink/20 p-8 text-center">
          <Megaphone size={32} className="mx-auto text-mute" />
          <p className="font-display mt-2 text-lg font-bold">Be the first business to create an AirPal.Me promotion.</p>
          <p className="mt-1 text-sm text-mute">Drafts are free. Every campaign goes live after AirPal.Me review.</p>
          <Link href="/business/promotions/new">
            <Button className="mt-4">Create promotion</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((p) => (
            <Link
              key={p.id}
              href={`/business/promotions/${p.id}`}
              className="block rounded-2xl border-2 border-ink bg-card p-3"
            >
              <div className="flex items-center gap-2">
                <PromoStatusChip status={p.status} />
                <span className="text-[11px] text-mute">{p.kind} · {p.mechanicType}</span>
              </div>
              <p className="mt-1 text-sm font-bold">{p.title}</p>
              <p className="mt-0.5 text-xs text-mute">
                {(p.viewsCount || 0)} views · {(p.entriesCount || 0)} entries · {(p.clicksCount || 0)} clicks
                {p.winnerNote ? ` · ${p.winnerNote}` : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
