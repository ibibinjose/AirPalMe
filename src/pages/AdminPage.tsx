import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { Button } from "@/components/ui/Button";
import { useLocation } from "wouter";
import { activePlaces } from "@/lib/catalog";
import { useEvents } from "@/contexts/EventsContext";
import { listBioDirectoryRemote, liveBackendEnabled, runAnalyticsAggregationRemote } from "@/lib/functions";
import { loadAnalyticsBuffer } from "@/lib/analytics";
import { northStarFromEvents } from "@shared/analytics";
import { tapCount } from "@/lib/bio-store";
import { bioPath } from "@shared/bio";
import { GuestListPanel } from "@/components/club/GuestListPanel";
import { CompanionAdmin } from "@/components/admin/CompanionAdmin";
import { MateRequestsAdmin } from "@/components/admin/MateRequestsAdmin";
import { StudioInboxAdmin } from "@/components/admin/StudioInboxAdmin";
import { SafetyInboxAdmin } from "@/components/admin/SafetyInboxAdmin";
import { CampaignInboxAdmin } from "@/components/admin/CampaignInboxAdmin";
import { AuditTrailAdmin } from "@/components/admin/AuditTrailAdmin";
import { ADMIN_TABS, AdminOverview, type AdminTab } from "@/components/admin/AdminOverview";
import { cn } from "@/lib/cn";
import { AIRPAL_CLUB_ID } from "@/contexts/ClubContext";
import { seedDatabase } from "@/lib/seed-database";
import { toast } from "sonner";

type DirectoryRow = { handle: string; name: string; ownerUid?: string; taps: number };

export function AdminPage() {
  const { isAdmin, authReady } = useAuth();
  const { profiles } = useBio();
  const [, nav] = useLocation();
  const [seeding, setSeeding] = useState(false);
  const [aggregating, setAggregating] = useState(false);
  const buffer = loadAnalyticsBuffer();
  const northStar = northStarFromEvents(buffer);
  const clientErrors = buffer.filter((e) => e.eventName === "client_error").length;
  const locked = authReady && liveBackendEnabled() && !isAdmin;
  const [tab, setTab] = useState<AdminTab>("overview");
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const { calendarEvents, remoteNearby } = useEvents();
  const stats = [
    { n: activePlaces().length, l: "Places" },
    { n: calendarEvents.length + remoteNearby.length, l: "Events" },
    { n: rows.length || profiles.length, l: "Handles" },
    { n: clientErrors, l: "Client errors" },
  ];

  useEffect(() => {
    if (locked) return;
    const local: DirectoryRow[] = profiles.map((p) => ({
      handle: p.handle,
      name: p.name,
      ownerUid: p.ownerUid,
      taps: tapCount(p.handle),
    }));
    setRows(local);
    if (!liveBackendEnabled()) return;
    void listBioDirectoryRemote()
      .then((res) => setRows(res.rows))
      .catch(() => undefined);
  }, [locked, profiles]);

  if (!authReady) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-mute">Loading…</div>;
  }

  if (locked) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-display text-xl font-semibold">Admin</p>
        <p className="mt-2 text-sm text-mute">Sign in as an administrator to view the directory.</p>
        <Button className="mt-6" onClick={() => nav("/start")}>
          Sign in
        </Button>
      </div>
    );
  }

  async function handleSeedDatabase() {
    setSeeding(true);
    try {
      const res = await seedDatabase();
      if (res.ok) {
        toast.success(
          `Seeded real database: ${res.propertiesCount} stays, ${res.placesCount} places, ${res.eventsCount} events, ${res.biosCount} bios`,
        );
      } else {
        toast.error(`Seeding error: ${res.error}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to seed database");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">AirPal OS · platform admin</p>
        <h1 className="font-display mt-1 text-3xl font-semibold">Operations</h1>
      </header>
      <nav aria-label="Admin sections" className="no-scrollbar -mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {ADMIN_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition",
              tab === t.id ? "bg-ink text-white" : "bg-card text-mute ring-1 ring-line",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tab === "overview" && (
        <>
          <AdminOverview onSelectTab={setTab} />
          <div className="mt-4 grid grid-cols-4 gap-2">
            {stats.map((s) => (
              <div key={s.l} className="rounded-2xl bg-card p-3 text-center ring-1 ring-line">
                <p className="font-display text-2xl font-semibold">{s.n}</p>
                <p className="text-[11px] text-mute">{s.l}</p>
              </div>
            ))}
          </div>
        </>
      )}
      {tab === "system" && (
        <>
          <section className="mt-4 rounded-[28px] bg-card p-4 ring-1 ring-line">
            <h2 className="font-display text-lg font-semibold">Seed & directory</h2>
            <p className="mt-1 text-sm text-mute">One-time migration of bundled Sydney data into live Firestore.</p>
            <Button size="sm" variant="ghost" disabled={seeding} onClick={handleSeedDatabase} className="mt-3">
              {seeding ? "Seeding…" : "Seed Real DB"}
            </Button>
          </section>
          <section className="mt-8 rounded-[28px] bg-card p-4 ring-1 ring-line">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">North-star (this device queue)</p>
        <h2 className="font-display mt-1 text-lg font-semibold">WQGA / active QR context</h2>
        <p className="mt-1 text-sm text-mute">
          Verified qualified guest actions this week, excluding demo and duplicates. Production reports use server daily
          facts.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            { n: northStar.value.toFixed(2), l: "WQGA/Context" },
            { n: northStar.qualifiedActions, l: "Qualified actions" },
            { n: northStar.activeQrContexts, l: "Active QR contexts" },
            { n: `${Math.round(northStar.firstValueRate * 100)}%`, l: "First-value rate" },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl bg-paper p-3 text-center">
              <p className="font-display text-2xl font-semibold">{s.n}</p>
              <p className="text-[11px] text-mute">{s.l}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-mute">
          Demo excluded {northStar.localDemoExcluded} · duplicates {northStar.duplicatesExcluded} · sessions{" "}
          {northStar.uniqueSessions}
        </p>
        {liveBackendEnabled() && (
          <Button
            className="mt-4"
            size="sm"
            variant="ghost"
            disabled={aggregating}
            onClick={() => {
              setAggregating(true);
              void runAnalyticsAggregationRemote()
                .then((res) => toast.success(`Aggregated ${res.output} daily facts from ${res.input} events`))
                .catch((err) => toast.error(err instanceof Error ? err.message : "Aggregation failed"))
                .finally(() => setAggregating(false));
            }}
          >
            {aggregating ? "Aggregating…" : "Rebuild daily facts"}
          </Button>
        )}
      </section>

      <h2 className="font-display mt-8 mb-3 text-lg font-semibold">Public handles</h2>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.handle}>
            <button
              type="button"
              onClick={() => nav(bioPath(row.handle))}
              className="flex w-full items-center justify-between rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-line"
            >
              <span>
                <span className="block font-medium">@{row.handle}</span>
                <span className="text-sm text-mute">{row.name}</span>
              </span>
              <span className="text-sm text-mute">{row.taps} taps</span>
            </button>
          </li>
        ))}
        {rows.length === 0 && <p className="text-sm text-mute">None yet.</p>}
      </ul>
      <div className="mt-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">AirPal Club</p>
        <GuestListPanel clubId={AIRPAL_CLUB_ID} clubName="AirPal Club" />
      </div>
        </>
      )}
      {tab === "mates" && <CompanionAdmin />}
      {tab === "marketplace" && <MateRequestsAdmin />}
      {tab === "studio" && <StudioInboxAdmin />}
      {tab === "safety" && <SafetyInboxAdmin />}
      {tab === "experiences" && <CampaignInboxAdmin />}
      {tab === "audit" && <AuditTrailAdmin />}
      <Button className="mt-6" variant="ghost" onClick={() => nav("/")}>
        Home
      </Button>
    </div>
  );
}
