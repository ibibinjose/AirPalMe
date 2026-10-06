import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { collection, doc, getDocs, limit, orderBy, query, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { logAdminAction } from "@/lib/admin-audit";
import { cn } from "@/lib/cn";
import type { Festival, FestivalStatus } from "@shared/festival";

const FILTERS = ["all", "draft", "live", "ended"] as const;

/** Festival programs: review drafts, take weeks live, intervene on sessions. */
export function FestivalAdmin() {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<(Festival & { sessionCount?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void getDocs(query(collection(db, "festivals"), orderBy("createdAt", "desc"), limit(100)))
      .then((snap) => setRows(snap.docs.map((d) => ({ slug: d.id, ...(d.data() as Omit<Festival, "slug">) }))))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const visible = useMemo(() => (filter === "all" ? rows : rows.filter((r) => r.status === filter)), [rows, filter]);

  async function act(row: Festival, status: FestivalStatus) {
    const db = getFirebaseDb();
    if (!db) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "festivals", row.slug), { status, updatedAt: now });
      void logAdminAction(user?.uid ?? "", "festival.status", "festivals", row.slug, row.status, status);
      setRows((list) => list.map((r) => (r.slug === row.slug ? { ...r, status, updatedAt: now } : r)));
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) return null;

  return (
    <section className="mt-8 rounded-[28px] bg-card p-4 ring-1 ring-line">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Discovery · transaction layer</p>
      <h2 className="font-display mt-1 text-lg font-semibold">Festival programs</h2>
      <p className="mt-1 text-sm text-mute">
        Week-long programs. Sessions reuse the events engine — attending, calendar, and reviews included.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium ring-1",
              filter === f ? "bg-brand text-white ring-brand" : "bg-paper text-mute ring-line",
            )}
          >
            {f}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="mt-3 text-sm text-mute">Loading festivals…</p>
      ) : visible.length === 0 ? (
        <p className="mt-3 text-sm text-mute">No festivals here. Organizers create them at /f/new.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {visible.map((row) => (
            <li key={row.slug} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper px-3 py-2 ring-1 ring-line/60">
              <span className="min-w-0 text-[13px]">
                <Link href={`/f/${row.slug}`} className="font-semibold text-ink">
                  {row.name}
                </Link>
                <span className="text-mute">
                  {" "}
                  · {row.city} · {row.startDate} → {row.endDate} · {row.status}
                </span>
              </span>
              <span className="flex gap-1.5">
                {row.status !== "live" && (
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(row, "live")}>
                    Go live
                  </Button>
                )}
                {row.status === "live" && (
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(row, "ended")}>
                    End
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
