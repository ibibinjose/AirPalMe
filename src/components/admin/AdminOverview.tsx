import { useEffect, useState } from "react";
import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { aud } from "@shared/campaign";

export type AdminTab = "overview" | "marketplace" | "mates" | "experiences" | "safety" | "studio" | "system" | "audit";

export const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "marketplace", label: "Marketplace" },
  { id: "mates", label: "Mates" },
  { id: "experiences", label: "Experiences" },
  { id: "safety", label: "Safety" },
  { id: "studio", label: "Studio" },
  { id: "system", label: "System" },
  { id: "audit", label: "Audit" },
];

interface Kpi {
  label: string;
  value: string;
  hint: string;
  tab: AdminTab;
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
        const [open, matched, completed, bPending, bConfirmed, bDone, cPending, cLive, sNew, wNew, audits] =
          await Promise.all([
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
          { label: "Open requests", value: String(open), hint: "need matching", tab: "marketplace" },
          { label: "Matched", value: String(matched), hint: "in conversation", tab: "marketplace" },
          { label: "Completed", value: String(completed), hint: "awaiting review", tab: "marketplace" },
          { label: "Bookings pending", value: String(bPending), hint: "awaiting mate", tab: "marketplace" },
          { label: "Bookings confirmed", value: String(bConfirmed), hint: "upcoming", tab: "marketplace" },
          { label: "Bookings done", value: String(bDone), hint: "completed", tab: "marketplace" },
          { label: "GMV (recent)", value: aud(gmv), hint: "pre-Stripe", tab: "marketplace" },
          { label: "Campaigns pending", value: String(cPending), hint: "need review", tab: "experiences" },
          { label: "Experiences live", value: String(cLive), hint: "bookable", tab: "experiences" },
          { label: "Safety new", value: String(sNew), hint: "triage first", tab: "safety" },
          { label: "Walkthroughs new", value: String(wNew), hint: "team inbox", tab: "studio" },
          { label: "Audited actions", value: String(audits), hint: "trail", tab: "audit" },
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
    return <p className="mt-4 text-sm text-mute">Loading platform numbers…</p>;
  }
  if (kpis.length === 0) {
    return (
      <p className="mt-4 rounded-2xl bg-card p-4 text-sm text-mute ring-1 ring-line">
        Connect Firebase to see live numbers. Queues below still work once signed in as admin.
      </p>
    );
  }
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
      {kpis.map((k) => (
        <button
          key={k.label}
          onClick={() => onSelectTab(k.tab)}
          className="rounded-2xl bg-card p-3 text-center ring-1 ring-line transition hover:ring-mute"
        >
          <p className="font-display text-2xl font-semibold">{k.value}</p>
          <p className="text-[11px] font-medium">{k.label}</p>
          <p className="text-[11px] text-mute">{k.hint}</p>
        </button>
      ))}
    </div>
  );
}
