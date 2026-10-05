import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, limit, orderBy, query, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { logAdminAction } from "@/lib/admin-audit";
import { cn } from "@/lib/cn";
import {
  REPORT_REASON_LABELS,
  slaAgeLabel,
  slaState,
  sortSafetyCasesEmergenciesFirst,
  type SafetyReportStatus,
} from "@shared/safety";

interface CaseRow {
  id: string;
  reporterUid: string;
  target: string;
  targetUid: string;
  planId: string;
  reason: string;
  details: string;
  status: SafetyReportStatus;
  adminNote: string;
  createdAt: string;
}

const FILTERS = ["all", "new", "reviewed", "actioned"] as const;

/** Every complaint creates a case a person reviews. */
export function SafetyInboxAdmin() {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("new");
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
    void getDocs(query(collection(db, "safety_reports"), orderBy("createdAt", "desc"), limit(100)))
      .then((snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CaseRow, "id">) }))))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const visible = useMemo(() => {
    const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);
    return sortSafetyCasesEmergenciesFirst(filtered);
  }, [rows, filter]);
  const emergencyCount = useMemo(() => rows.filter((r) => r.reason === "emergency" && r.status === "new").length, [rows]);
  const overdueCount = useMemo(
    () => rows.filter((r) => r.status === "new" && slaState(r, Date.now()) === "overdue").length,
    [rows],
  );

  async function act(row: CaseRow, status: SafetyReportStatus) {
    const db = getFirebaseDb();
    if (!db) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "safety_reports", row.id), { status, adminNote: note.trim(), updatedAt: now });
      void logAdminAction(
        user?.uid ?? "",
        "safety_report.status",
        "safety_reports",
        row.id,
        row.status,
        status,
        note.trim(),
      );
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
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Trust & safety</p>
      <h2 className="font-display mt-1 text-lg font-semibold">Safety cases</h2>
      <p className="mt-1 text-sm text-mute">
        Every report opens a case. Emergencies first, always — new emergency cases target review within 4 hours.
        In danger now? Call local emergency services first; AirPal never guarantees personal safety.
        {emergencyCount > 0 && (
          <span className="mt-1 block font-semibold text-red-600">
            {emergencyCount} new {emergencyCount === 1 ? "emergency" : "emergencies"} waiting.
          </span>
        )}
        {overdueCount > 0 && (
          <span className="mt-1 block font-semibold text-red-600">
            {overdueCount} past SLA — review now.
          </span>
        )}
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
        <p className="mt-4 text-sm text-mute">Loading cases…</p>
      ) : visible.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-paper p-4 text-sm text-mute">
          No {filter === "all" ? "" : `${filter} `}cases. Quiet is good.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {visible.map((r) => (
            <li
              key={r.id}
              className={cn(
                "rounded-2xl bg-paper p-3 ring-1",
                r.reason === "emergency" ? "ring-red-500/50" : "ring-line",
              )}
            >
              <button
                onClick={() => setOpenId(openId === r.id ? null : r.id)}
                className="flex w-full items-center gap-2 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {(REPORT_REASON_LABELS as Record<string, string>)[r.reason] ?? r.reason} · {r.target}
                  </span>
                  <span className="block truncate text-xs text-mute">
                    {slaAgeLabel(r.createdAt)} old · {r.createdAt.slice(0, 10)} · plan {r.planId.slice(0, 8)}…
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {r.status === "new" && slaState(r, Date.now()) === "overdue" && (
                    <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-bold text-red-700 ring-1 ring-red-500/40">
                      Past SLA
                    </span>
                  )}
                  <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand ring-1 ring-brand/30">
                    {r.status}
                  </span>
                </span>
              </button>
              {openId === r.id && (
                <div className="mt-2 border-t border-line pt-2 text-[13px]">
                  <p>{r.details}</p>
                  {r.adminNote && <p className="mt-1 text-mute">Team note: {r.adminNote}</p>}
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Case note (action taken, who was contacted…)"
                    className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none placeholder:text-mute focus:border-brand"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(["reviewed", "actioned"] as SafetyReportStatus[])
                      .filter((s) => s !== r.status)
                      .map((s) => (
                        <Button key={s} size="sm" variant="ghost" disabled={busy} onClick={() => void act(r, s)}>
                          Mark {s}
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
