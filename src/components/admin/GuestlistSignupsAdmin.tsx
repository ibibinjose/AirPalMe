import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { listGuestlistSignupsRemote } from "@/lib/functions";
import { GUESTLIST_INTERESTS } from "@shared/airpal-guestlist";

interface SignupRow {
  email: string;
  name: string;
  city: string;
  interests: string[];
  source: string;
  consentAt: string;
  createdAt: string;
  unsubscribedAt: string | null;
}

const PAGE = 100;

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Admin audience tab: browse, filter, and export the AirPal Guestlist. */
export function GuestlistSignupsAdmin() {
  const [rows, setRows] = useState<SignupRow[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [city, setCity] = useState("");
  const [interest, setInterest] = useState("");

  useEffect(() => {
    let alive = true;
    void listGuestlistSignupsRemote({ limit: PAGE })
      .then((res) => {
        if (!alive) return;
        setRows(res.rows);
        setTotal(res.total);
        setHasMore(res.hasMore);
      })
      .catch(() => toast.error("Couldn't load signups."))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function reload() {
    setRows([]);
    setLoading(true);
    try {
      const res = await listGuestlistSignupsRemote({
        ...(city.trim() ? { city: city.trim() } : {}),
        ...(interest ? { interest } : {}),
        limit: PAGE,
      });
      setRows(res.rows);
      setTotal(res.total);
      setHasMore(res.hasMore);
    } catch {
      toast.error("Couldn't load signups.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    const last = rows[rows.length - 1];
    if (!last || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await listGuestlistSignupsRemote({
        ...(city.trim() ? { city: city.trim() } : {}),
        ...(interest ? { interest } : {}),
        limit: PAGE,
        startAfter: last.email,
      });
      setRows((prev) => [...prev, ...res.rows]);
      setTotal(res.total);
      setHasMore(res.hasMore);
    } catch {
      toast.error("Couldn't load more signups.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function exportAll() {
    if (exporting) return;
    setExporting(true);
    try {
      const all: SignupRow[] = [];
      let cursor = "";
      for (let page = 0; page < 10; page += 1) {
        const res = await listGuestlistSignupsRemote({
          ...(city.trim() ? { city: city.trim() } : {}),
          ...(interest ? { interest } : {}),
          limit: 500,
          ...(cursor ? { startAfter: cursor } : {}),
        });
        all.push(...res.rows);
        if (!res.hasMore || res.rows.length === 0) break;
        cursor = res.rows[res.rows.length - 1]?.email || "";
        if (!cursor) break;
      }
      if (all.length === 0) {
        toast.message("Nothing to export.");
        return;
      }
      const lines = [
        "email,name,city,interests,source,consent_at,created_at",
        ...all.map((r) =>
          [
            csvCell(r.email),
            csvCell(r.name),
            csvCell(r.city),
            csvCell(r.interests.join(";")),
            csvCell(r.source),
            csvCell(r.consentAt),
            csvCell(r.createdAt),
          ].join(","),
        ),
      ];
      const blob = new Blob([lines.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `airpal-guestlist-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${all.length} signups.`);
    } catch {
      toast.error("Export failed. Try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="rounded-[28px] bg-card p-5 ring-1 ring-line shadow-xs sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Audience</p>
      <h2 className="font-display text-lg font-bold text-ink">AirPal Guestlist</h2>
      <p className="mt-1 text-sm text-mute">
        {total} subscribed{city.trim() || interest ? " (filtered)" : ""} · unsubscribed stay out automatically.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="audience-city" className="sr-only">
          Filter by city
        </label>
        <input
          id="audience-city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Filter by city"
          autoComplete="off"
          className="h-11 min-w-0 flex-1 rounded-xl bg-paper px-3 text-[16px] text-ink ring-1 ring-line"
        />
        <label htmlFor="audience-interest" className="sr-only">
          Filter by interest
        </label>
        <select
          id="audience-interest"
          value={interest}
          onChange={(e) => setInterest(e.target.value)}
          className="h-11 rounded-xl bg-paper px-3 text-sm text-ink ring-1 ring-line"
        >
          <option value="">All interests</option>
          {GUESTLIST_INTERESTS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={reload} disabled={loading} className="h-11">
          Apply
        </Button>
        <Button size="sm" variant="tonal" onClick={exportAll} disabled={exporting || total === 0} className="h-11">
          <Download size={15} className="mr-1.5" aria-hidden />
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-mute">Loading signups…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-mute">No signups yet. Bios with the form feed this list.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-line">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-paper text-[11px] uppercase tracking-wider text-mute">
                <th className="px-3 py-2 font-bold">Name</th>
                <th className="px-3 py-2 font-bold">Email</th>
                <th className="px-3 py-2 font-bold">City</th>
                <th className="px-3 py-2 font-bold">Interests</th>
                <th className="px-3 py-2 font-bold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.email}>
                  <td className="max-w-[140px] truncate px-3 py-2 font-semibold">{r.name}</td>
                  <td className="max-w-[200px] truncate px-3 py-2 tabular-nums">{r.email}</td>
                  <td className="px-3 py-2">{r.city}</td>
                  <td className="max-w-[160px] truncate px-3 py-2 text-mute">{r.interests.join(", ") || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-mute">
                    {r.createdAt ? r.createdAt.slice(0, 10) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hasMore && !loading && (
        <Button variant="ghost" onClick={loadMore} disabled={loadingMore} className="mt-3 h-11 w-full">
          {loadingMore ? "Loading…" : `Load more (${rows.length} of ${total})`}
        </Button>
      )}
    </section>
  );
}
