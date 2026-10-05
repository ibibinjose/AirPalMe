import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

interface WalkthroughRow {
  id: string;
  name: string;
  business: string;
  email: string;
  phone: string;
  kind: string;
  preferredDay: string;
  notes: string;
  status: string;
  createdAt: string;
}

/** Team inbox for Studio walkthrough bookings. */
export function StudioInboxAdmin() {
  const { isAdmin } = useAuth();
  const [, nav] = useLocation();
  const [rows, setRows] = useState<WalkthroughRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void getDocs(query(collection(db, "studio_walkthroughs"), orderBy("createdAt", "desc"), limit(50)))
      .then((snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WalkthroughRow, "id">) }))))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <section className="mt-8 rounded-[28px] bg-card p-4 ring-1 ring-line">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Studio · team inbox</p>
      <h2 className="font-display mt-1 text-lg font-semibold">Walkthrough bookings</h2>
      {loading ? (
        <p className="mt-3 text-sm text-mute">Loading bookings…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-paper p-4 text-sm text-mute">
          No bookings yet. Share <span className="font-semibold">/studio</span> with venues.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl bg-paper p-3 text-[13px] ring-1 ring-line">
              <p className="font-semibold">
                {r.business} <span className="font-normal text-mute">· {r.kind}</span>
              </p>
              <p className="mt-0.5 text-mute">
                {r.name} · {r.email} · {r.phone}
                {r.preferredDay ? ` · prefers ${r.preferredDay}` : ""}
              </p>
              {r.notes && <p className="mt-1">{r.notes}</p>}
            </li>
          ))}
        </ul>
      )}
      <Button className="mt-3" size="sm" variant="ghost" onClick={() => nav("/business")}>
        Open Business hub
      </Button>
    </section>
  );
}
