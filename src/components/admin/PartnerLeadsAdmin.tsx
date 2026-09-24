import { useEffect, useState } from "react";
import { collection, doc, getDocs, limit, orderBy, query, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { logAdminAction } from "@/lib/admin-audit";
import type { PartnerLead, PartnerLeadStatus } from "@shared/partner";

/** Partnership inquiries from /partner: triage new leads, mark contacted. */
export function PartnerLeadsAdmin() {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<PartnerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void getDocs(query(collection(db, "partner_leads"), orderBy("createdAt", "desc"), limit(100)))
      .then((snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PartnerLead, "id">) }))))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  async function act(row: PartnerLead, status: PartnerLeadStatus) {
    const db = getFirebaseDb();
    if (!db) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "partner_leads", row.id), { status, updatedAt: now });
      void logAdminAction(user?.uid ?? "", "partner_lead.status", "partner_leads", row.id, row.status, status);
      setRows((list) => list.map((r) => (r.id === row.id ? { ...r, status, updatedAt: now } : r)));
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) return null;
  const fresh = rows.filter((r) => r.status === "new");

  return (
    <section className="mt-8 rounded-[28px] bg-card p-4 ring-1 ring-line">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Business development</p>
      <h2 className="font-display mt-1 text-lg font-semibold">Partnership inquiries · {fresh.length} new</h2>
      {loading ? (
        <p className="mt-3 text-sm text-mute">Loading leads…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-mute">No inquiries yet. They arrive from /partner.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl bg-paper px-3 py-2 text-[13px] ring-1 ring-line/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="font-semibold text-ink">{row.company}</span>
                  <span className="text-mute">
                    {" "}
                    · {row.segment} · {row.name} · {row.email}
                    {row.phone ? ` · ${row.phone}` : ""} · {row.status}
                  </span>
                </span>
                {row.status === "new" && (
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(row, "contacted")}>
                    Mark contacted
                  </Button>
                )}
              </div>
              <p className="mt-1 text-mute">{row.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
