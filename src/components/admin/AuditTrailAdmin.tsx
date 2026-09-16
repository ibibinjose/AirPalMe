import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import type { AuditEntry } from "@/lib/admin-audit";

interface AuditRow extends AuditEntry {
  id: string;
}

/** §20: the operating system shows its work — every admin action, newest first. */
export function AuditTrailAdmin() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void getDocs(query(collection(db, "admin_audits"), orderBy("createdAt", "desc"), limit(50)))
      .then((snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditRow, "id">) }))))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <section className="mt-8 rounded-[28px] bg-card p-4 ring-1 ring-line">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Operating system</p>
      <h2 className="font-display mt-1 text-lg font-semibold">Audit trail</h2>
      {loading ? (
        <p className="mt-3 text-sm text-mute">Loading trail…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-paper p-4 text-sm text-mute">
          No audited actions yet. Status changes in the queues above write here automatically.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl bg-paper px-3 py-2 text-[13px] ring-1 ring-line">
              <span className="font-semibold">{r.action}</span>{" "}
              <span className="text-mute">
                {r.collection}/{r.docId.slice(0, 8)}…{r.from || r.to ? ` · ${r.from || "?"} → ${r.to || "?"}` : ""}
              </span>
              <span className="block text-xs text-mute">
                {r.createdAt.slice(0, 16).replace("T", " ")}
                {r.note ? ` · ${r.note}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
