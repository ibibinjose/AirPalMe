import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, limit, orderBy, query, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { logAdminAction } from "@/lib/admin-audit";
import { cn } from "@/lib/cn";
import { aud, type Campaign, type CampaignStatus } from "@shared/campaign";

const FILTERS = ["all", "pending", "live", "completed", "cancelled"] as const;

/** B2B pipeline: review briefs, take campaigns live, track the pipeline. */
export function CampaignInboxAdmin() {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void getDocs(query(collection(db, "campaigns"), orderBy("createdAt", "desc"), limit(100)))
      .then((snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Campaign, "id">) }))))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const visible = useMemo(() => (filter === "all" ? rows : rows.filter((r) => r.status === filter)), [rows, filter]);

  async function act(row: Campaign, status: CampaignStatus) {
    const db = getFirebaseDb();
    if (!db) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "campaigns", row.id), { status, adminNote: note.trim(), updatedAt: now });
      void logAdminAction(user?.uid ?? "", "campaign.status", "campaigns", row.id, row.status, status, note.trim());
      setRows((list) =>
        list.map((r) => (r.id === row.id ? { ...r, status, adminNote: note.trim(), updatedAt: now } : r)),
      );
      setNote("");
      setOpenId(null);
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) return null;

  return (
    <section className="mt-8 rounded-[28px] bg-card p-4 ring-1 ring-line">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">B2B · revenue engine</p>
      <h2 className="font-display mt-1 text-lg font-semibold">Experience campaigns</h2>
      <p className="mt-1 text-sm text-mute">
        Businesses fund experiences; the team takes them live and recruits guests.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium ring-1",
              filter === f ? "bg-brand text-white ring-ink" : "bg-paper text-mute ring-line",
            )}
          >
            {f === "all" ? `All (${rows.length})` : `${f} (${rows.filter((r) => r.status === f).length})`}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="mt-4 text-sm text-mute">Loading campaigns…</p>
      ) : visible.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-paper p-4 text-sm text-mute">
          No {filter === "all" ? "" : `${filter} `}campaigns.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {visible.map((r) => (
            <li key={r.id} className="rounded-2xl bg-paper p-3 ring-1 ring-line">
              <button
                onClick={() => setOpenId(openId === r.id ? null : r.id)}
                className="flex w-full items-center gap-2 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{r.title}</span>
                  <span className="block truncate text-xs text-mute">
                    {r.businessName} · {r.suburb} · {r.date} · budget {aud(r.budgetCents)} · ticket {aud(r.priceCents)}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand ring-1 ring-brand/30">
                  {r.status}
                </span>
              </button>
              {openId === r.id && (
                <div className="mt-2 border-t border-line pt-2 text-[13px]">
                  <p>{r.brief}</p>
                  <p className="mt-1 text-mute">
                    Recruit {r.recruitTarget}/{r.capacity} · {r.category}
                    {r.time ? ` · ${r.time}` : ""}
                  </p>
                  {r.adminNote && <p className="mt-1 text-mute">Team note: {r.adminNote}</p>}
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Team note (terms agreed, launch plan…)"
                    className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none placeholder:text-mute focus:border-brand"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(["live", "completed", "cancelled"] as CampaignStatus[])
                      .filter((s) => s !== r.status)
                      .map((s) => (
                        <Button key={s} size="sm" variant="ghost" disabled={busy} onClick={() => void act(r, s)}>
                          {s === "live" ? "Take live" : `Mark ${s}`}
                        </Button>
                      ))}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
