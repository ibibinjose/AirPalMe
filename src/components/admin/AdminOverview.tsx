import { useEffect, useState } from "react";
import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { aud } from "@shared/campaign";

export type AdminTab =
  | "overview"
  | "marketplace"
  | "mates"
  | "experiences"
  | "search"
  | "safety"
  | "studio"
  | "system"
  | "audit"
  | "audience"
  | "demo";

export const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "marketplace", label: "Marketplace" },
  { id: "mates", label: "Mates" },
  { id: "experiences", label: "Experiences" },
  { id: "search", label: "Search" },
  { id: "safety", label: "Safety" },
  { id: "studio", label: "Studio" },
  { id: "system", label: "System" },
  { id: "audit", label: "Audit" },
  { id: "audience", label: "Audience" },
  { id: "demo", label: "Demo" },
];

interface Kpi {
  label: string;
  value: string;
  hint: string;
  tab: AdminTab;
  badgeClass?: string;
  urgent?: boolean;
}

async function countIn(col: string, field: string, value: string): Promise<number> {
  const db = getFirebaseDb();
  if (!db) return 0;
  const snap = await getCountFromServer(query(collection(db, col), where(field, "==", value)));
  return snap.data().count;
}

async function countAll(col: string): Promise<number> {
  const db = getFirebaseDb();
  if (!db) return 0;
  const snap = await getCountFromServer(collection(db, col));
  return snap.data().count;
}

/** Platform overview: live marketplace KPIs. Money is pre-Stripe until payments land. */
export function AdminOverview({ onSelectTab }: { onSelectTab: (t: AdminTab) => void }) {
  const [kpis, setKpis] = useState<Kpi[] | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setKpis([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [
          open,
          matched,
          completed,
          bPending,
          bConfirmed,
          bDone,
          cPending,
          cLive,
          sNew,
          wNew,
          audits,
          searchQueries,
        ] = await Promise.all([
          countIn("mate_requests", "status", "open"),
          countIn("mate_requests", "status", "matched"),
          countIn("mate_requests", "status", "completed"),
          countIn("bookings", "status", "pending"),
          countIn("bookings", "status", "confirmed"),
          countIn("bookings", "status", "completed"),
          countIn("campaigns", "status", "pending"),
          countIn("campaigns", "status", "live"),
          countIn("safety_reports", "status", "new"),
          countIn("studio_walkthroughs", "status", "new"),
          countAll("admin_audits"),
          countAll("popular_searches"),
        ]);
        // GMV over recent bookings — indicative only, pre-Stripe.
        let gmv = 0;
        try {
          const db = getFirebaseDb();
          if (db) {
            const snap = await getDocs(query(collection(db, "bookings"), orderBy("createdAt", "desc"), limit(100)));
            for (const d of snap.docs) gmv += Number((d.data() as { priceCents?: number }).priceCents || 0);
          }
        } catch {
          // counts above still stand.
        }
        if (cancelled) return;
        setKpis([
          {
            label: "Open Requests",
            value: String(open),
            hint: "needs mate match",
            tab: "marketplace",
            badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
          },
          {
            label: "Active Matches",
            value: String(matched),
            hint: "in conversation",
            tab: "marketplace",
            badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          },
          {
            label: "Completed Plans",
            value: String(completed),
            hint: "awaiting review",
            tab: "marketplace",
            badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
          },
          {
            label: "Pending Bookings",
            value: String(bPending),
            hint: "awaiting provider",
            tab: "marketplace",
            badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          },
          {
            label: "Confirmed Bookings",
            value: String(bConfirmed),
            hint: "upcoming experiences",
            tab: "marketplace",
            badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          },
          {
            label: "Completed Bookings",
            value: String(bDone),
            hint: "ready for payout",
            tab: "marketplace",
            badgeClass: "bg-brand/10 text-brand",
          },
          {
            label: "Recent GMV",
            value: aud(gmv),
            hint: "marketplace volume",
            tab: "marketplace",
            badgeClass: "bg-emerald-500/10 text-emerald-700 font-mono",
          },
          {
            label: "Pending Campaigns",
            value: String(cPending),
            hint: "needs admin review",
            tab: "experiences",
            badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
            urgent: cPending > 0,
          },
          {
            label: "Live Experiences",
            value: String(cLive),
            hint: "bookable in Sydney",
            tab: "experiences",
            badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          },
          {
            label: "Safety Triage",
            value: String(sNew),
            hint: "unresolved incidents",
            tab: "safety",
            badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400",
            urgent: sNew > 0,
          },
          {
            label: "Studio Leads",
            value: String(wNew),
            hint: "partner inquiries",
            tab: "studio",
            badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          },
          {
            label: "Search Queries",
            value: String(searchQueries),
            hint: "top queries tracked",
            tab: "search",
            badgeClass: "bg-brand/10 text-brand",
          },
          {
            label: "Audit Logs",
            value: String(audits),
            hint: "immutable trail",
            tab: "audit",
            badgeClass: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
          },
        ]);
      } catch {
        if (!cancelled) setKpis([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (kpis === null) {
    return (
      <div className="mt-4 rounded-3xl bg-card p-8 text-center ring-1 ring-line">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        <p className="mt-2 text-xs text-mute font-medium">Loading live platform telemetry…</p>
      </div>
    );
  }
  if (kpis.length === 0) {
    return (
      <p className="mt-4 rounded-3xl bg-card p-5 text-center text-xs text-mute ring-1 ring-line">
        Connect Firebase to see live platform telemetry. Administration queues remain fully accessible.
      </p>
    );
  }
  return (
    <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {kpis.map((k) => (
        <button
          key={k.label}
          type="button"
          onClick={() => onSelectTab(k.tab)}
          className={`group relative rounded-2xl bg-card/90 p-3.5 text-left ring-1 ring-line transition-all duration-150 hover:bg-paper hover:ring-2 hover:ring-brand/40 shadow-2xs ${
            k.urgent ? "ring-red-500/30 bg-red-500/5" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-mute truncate">{k.label}</span>
            {k.badgeClass && (
              <span
                className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${k.badgeClass}`}
              >
                {k.tab}
              </span>
            )}
          </div>
          <p className="font-display mt-1 text-2xl font-bold tracking-tight text-ink group-hover:text-brand transition-colors">
            {k.value}
          </p>
          <p className="text-[11px] text-mute mt-0.5 truncate">{k.hint}</p>
        </button>
      ))}
    </div>
  );
}
