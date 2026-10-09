import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useLocalNow } from "@/hooks/useLocalNow";
import { Button } from "@/components/ui/Button";
import { TabPills } from "@/components/ui/TabPills";
import { Link, useLocation } from "wouter";
import { activePlaces } from "@/lib/catalog";
import { useEvents } from "@/contexts/EventsContext";
import { listBioDirectoryRemote, liveBackendEnabled, runAnalyticsAggregationRemote } from "@/lib/functions";
import { loadAnalyticsBuffer } from "@/lib/analytics";
import { wqgaFromEvents } from "@shared/analytics";
import { tapCount } from "@/lib/bio-store";
import { bioPath } from "@shared/bio";
import { isFirebaseConfigured } from "@/lib/firebase";
import { GuestListPanel } from "@/components/club/GuestListPanel";
import { CompanionAdmin } from "@/components/admin/CompanionAdmin";
import { DemoAdmin } from "@/components/admin/DemoAdmin";
import { MateRequestsAdmin } from "@/components/admin/MateRequestsAdmin";
import { PartnerLeadsAdmin } from "@/components/admin/PartnerLeadsAdmin";
import { SafetyInboxAdmin } from "@/components/admin/SafetyInboxAdmin";
import { CampaignInboxAdmin } from "@/components/admin/CampaignInboxAdmin";
import { FestivalAdmin } from "@/components/admin/FestivalAdmin";
import { AuditTrailAdmin } from "@/components/admin/AuditTrailAdmin";
import { GuestlistSignupsAdmin } from "@/components/admin/GuestlistSignupsAdmin";
import { SearchQueriesDashboardTab } from "@/components/admin/SearchQueriesDashboardTab";
import { ADMIN_TABS, AdminOverview, type AdminTab } from "@/components/admin/AdminOverview";
import { AIRPAL_CLUB_ID } from "@/contexts/ClubContext";
import { seedDatabase } from "@/lib/seed-database";
import { toast } from "sonner";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Award,
  Bell,
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Flame,
  Globe2,
  Headphones,
  Layers,
  MapPin,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

type DirectoryRow = { handle: string; name: string; ownerUid?: string; taps: number };

export function AdminPage() {
  const { isAdmin, authReady, user } = useAuth();
  const { profiles } = useBio();
  const { time, city } = useLocalNow();
  const [, nav] = useLocation();
  const [seeding, setSeeding] = useState(false);
  const [aggregating, setAggregating] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState<string | null>(null);
  const [handleSearch, setHandleSearch] = useState("");
  const [handleSort, setHandleSort] = useState<"taps" | "alpha">("taps");

  const buffer = loadAnalyticsBuffer();
  const wqga = wqgaFromEvents(buffer);
  const clientErrors = buffer.filter((e) => e.eventName === "client_error").length;
  const locked = authReady && liveBackendEnabled() && !isAdmin;
  const [tab, setTab] = useState<AdminTab>("overview");
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const { calendarEvents, remoteNearby } = useEvents();

  const totalEvents = calendarEvents.length + remoteNearby.length;
  const totalPlaces = activePlaces().length;
  const totalHandles = rows.length || profiles.length;

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

  const filteredRows = useMemo(() => {
    const q = handleSearch.trim().toLowerCase();
    let res = rows;
    if (q) {
      res = res.filter((r) => r.handle.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
    }
    return [...res].sort((a, b) => {
      if (handleSort === "taps") return b.taps - a.taps;
      return a.handle.localeCompare(b.handle);
    });
  }, [rows, handleSearch, handleSort]);

  if (!authReady) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        <p className="mt-3 text-sm text-mute font-medium">Authenticating platform admin…</p>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-red-500/10 ring-1 ring-red-500/20">
          <ShieldCheck className="h-7 w-7 text-red-500" />
        </div>
        <p className="font-display mt-4 text-2xl font-bold">Admin Restricted</p>
        <p className="mt-2 text-sm text-mute leading-relaxed">
          Sign in with an authorized platform administrator account to access the AirPal Command Center.
        </p>
        <Button className="mt-6 w-full" onClick={() => nav("/start")}>
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

  function copyHandleLink(handle: string) {
    const url = `${window.location.origin}${bioPath(handle)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedHandle(handle);
      toast.success(`Copied @${handle} link`);
      setTimeout(() => setCopiedHandle(null), 2000);
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 pb-28">
      {/* Top Command Bar & Status Header */}
      <header className="rounded-[28px] bg-card p-5 sm:p-6 ring-1 ring-line shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent">
                <Sparkles className="h-3 w-3" />
                AirPal OS · Platform Admin
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
                {isFirebaseConfigured ? "Firebase Live" : "Local Mode"}
              </span>
              <span className="text-[11px] text-mute font-mono">
                {city} · {time}
              </span>
            </div>
            <h1 className="font-display mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Operations Cockpit
            </h1>
            <p className="text-xs text-mute mt-0.5">
              Signed in as <span className="font-mono text-ink">{user?.email || "Platform Admin"}</span>
            </p>
          </div>

          {/* Quick Hub Portals */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/helpdesk"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-card hover:ring-brand/40 shadow-2xs"
            >
              <Headphones className="h-3.5 w-3.5 text-accent" />
              Help Desk
            </Link>
            <Link
              href="/pulse"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-card hover:ring-brand/40 shadow-2xs"
            >
              <Activity className="h-3.5 w-3.5 text-indigo-500" />
              Pulse Hub
            </Link>
            <Link
              href="/host"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-card hover:ring-brand/40 shadow-2xs"
            >
              <Building2 className="h-3.5 w-3.5 text-amber-500" />
              Host Desk
            </Link>
            <Link
              href="/business"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-card hover:ring-brand/40 shadow-2xs"
            >
              <Users className="h-3.5 w-3.5 text-accent" />
              Business
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-5 border-t border-line/60 pt-4">
          <TabPills ariaLabel="Admin sections" items={ADMIN_TABS} active={tab} onChange={setTab} />
        </div>
      </header>

      {/* OVERVIEW TAB */}
      {tab === "overview" && (
        <div className="mt-6 space-y-6">
          {/* Live Telemetry KPI Grid */}
          <section>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-ink">Live Marketplace Telemetry</h2>
                <p className="text-xs text-mute">Real-time counts across requests, bookings, campaigns, and safety</p>
              </div>
              <span className="text-[11px] font-mono text-mute">Auto-syncing</span>
            </div>
            <AdminOverview onSelectTab={setTab} />
          </section>

          {/* Catalog & Infrastructure Core Metrics */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs">
              <div className="flex items-center justify-between text-mute">
                <span className="text-xs font-semibold uppercase tracking-wider">Catalog Places</span>
                <MapPin className="h-4 w-4 text-accent" />
              </div>
              <p className="font-display mt-2 text-3xl font-bold text-ink">{totalPlaces}</p>
              <p className="text-[11px] text-mute mt-0.5">Sydney curated venues</p>
            </div>

            <div className="rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs">
              <div className="flex items-center justify-between text-mute">
                <span className="text-xs font-semibold uppercase tracking-wider">Events & Live</span>
                <Flame className="h-4 w-4 text-orange-500" />
              </div>
              <p className="font-display mt-2 text-3xl font-bold text-ink">{totalEvents}</p>
              <p className="text-[11px] text-mute mt-0.5">Calendar & nearby items</p>
            </div>

            <div className="rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs">
              <div className="flex items-center justify-between text-mute">
                <span className="text-xs font-semibold uppercase tracking-wider">Public Handles</span>
                <Globe2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="font-display mt-2 text-3xl font-bold text-ink">{totalHandles}</p>
              <p className="text-[11px] text-mute mt-0.5">Active creator link-in-bios</p>
            </div>

            <div className="rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs">
              <div className="flex items-center justify-between text-mute">
                <span className="text-xs font-semibold uppercase tracking-wider">Client Errors</span>
                <ShieldCheck className={`h-4 w-4 ${clientErrors > 0 ? "text-amber-500" : "text-emerald-500"}`} />
              </div>
              <p className="font-display mt-2 text-3xl font-bold text-ink">{clientErrors}</p>
              <p className="text-[11px] text-mute mt-0.5">
                {clientErrors === 0 ? "System healthy" : "Requires triage"}
              </p>
            </div>
          </section>

          {/* Operational Quick Portals */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/admin/promotions"
              className="group flex flex-col justify-between rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs transition hover:bg-paper hover:ring-brand/40"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-accent">
                    <Award className="h-5 w-5" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-mute transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
                </div>
                <h3 className="font-display mt-3 text-sm font-bold text-ink">Giveaways & Promos</h3>
                <p className="mt-1 text-xs text-mute">Review submission queue, campaign rules, and select winners.</p>
              </div>
              <span className="mt-4 text-[11px] font-semibold text-accent">Open Promotion Manager →</span>
            </Link>

            <Link
              href="/admin/notifications"
              className="group flex flex-col justify-between rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs transition hover:bg-paper hover:ring-brand/40"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Bell className="h-5 w-5" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-mute transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
                </div>
                <h3 className="font-display mt-3 text-sm font-bold text-ink">Creator Broadcasts</h3>
                <p className="mt-1 text-xs text-mute">Approve scheduled push messages and inspect delivery audits.</p>
              </div>
              <span className="mt-4 text-[11px] font-semibold text-accent">Manage Broadcasts →</span>
            </Link>

            <Link
              href="/admin/search-analytics"
              className="group flex flex-col justify-between rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs transition hover:bg-paper hover:ring-brand/40"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <Search className="h-5 w-5" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-mute transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
                </div>
                <h3 className="font-display mt-3 text-sm font-bold text-ink">Search Analytics</h3>
                <p className="mt-1 text-xs text-mute">Top queries, result counts, and dead-end searches.</p>
              </div>
              <span className="mt-4 text-[11px] font-semibold text-accent">View Analytics →</span>
            </Link>

            <Link
              href="/helpdesk"
              className="group flex flex-col justify-between rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs transition hover:bg-paper hover:ring-brand/40"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Headphones className="h-5 w-5" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-mute transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
                </div>
                <h3 className="font-display mt-3 text-sm font-bold text-ink">Universal Help Desk</h3>
                <p className="mt-1 text-xs text-mute">
                  Multi-property guest support tickets, room service & dining alerts.
                </p>
              </div>
              <span className="mt-4 text-[11px] font-semibold text-accent">View All Open Tickets →</span>
            </Link>

            <Link
              href="/pulse"
              className="group flex flex-col justify-between rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs transition hover:bg-paper hover:ring-brand/40"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <QrCode className="h-5 w-5" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-mute transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
                </div>
                <h3 className="font-display mt-3 text-sm font-bold text-ink">Pulse & Standees</h3>
                <p className="mt-1 text-xs text-mute">
                  Guest feedback kiosk simulator, NFC tap stands, and CSAT recovery.
                </p>
              </div>
              <span className="mt-4 text-[11px] font-semibold text-accent">Open Pulse Station →</span>
            </Link>
          </section>
        </div>
      )}

      {/* SYSTEM TAB */}
      {tab === "system" && (
        <div className="mt-6 space-y-6">
          {/* Seed & Firestore Migration Engine */}
          <section className="rounded-[28px] bg-card p-5 sm:p-6 ring-1 ring-line shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-accent">Migration Tools</span>
                <h2 className="font-display text-lg font-bold text-ink mt-0.5">Database Seeding & Catalog Sync</h2>
                <p className="text-xs text-mute mt-1">
                  Synchronize bundled Sydney venues, curated stays, events, and test handles into live Cloud Firestore.
                </p>
              </div>
              <Button
                size="sm"
                variant="outlined"
                disabled={seeding}
                onClick={handleSeedDatabase}
                className="shrink-0 gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${seeding ? "animate-spin" : ""}`} />
                {seeding ? "Seeding Firestore…" : "Seed Real Database"}
              </Button>
            </div>
          </section>

          {/* WQGA diagnostic telemetry (QR-context health — not the product north star) */}
          <section className="rounded-[28px] bg-card p-5 sm:p-6 ring-1 ring-line shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">QR Telemetry</p>
                <h2 className="font-display mt-0.5 text-lg font-bold text-ink">WQGA / Active QR Context</h2>
                <p className="mt-1 text-xs text-mute">
                  Verified qualified guest actions this week, excluding demo and duplicates. Production reports use
                  server daily facts.
                </p>
              </div>
              {liveBackendEnabled() && (
                <Button
                  size="sm"
                  variant="outlined"
                  disabled={aggregating}
                  onClick={() => {
                    setAggregating(true);
                    void runAnalyticsAggregationRemote()
                      .then((res) => toast.success(`Aggregated ${res.output} daily facts from ${res.input} events`))
                      .catch((err) => toast.error(err instanceof Error ? err.message : "Aggregation failed"))
                      .finally(() => setAggregating(false));
                  }}
                  className="shrink-0 gap-1.5"
                >
                  <Layers className={`h-3.5 w-3.5 ${aggregating ? "animate-spin" : ""}`} />
                  {aggregating ? "Aggregating…" : "Rebuild Daily Facts"}
                </Button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { n: wqga.value.toFixed(2), l: "WQGA/Context", h: "Target: > 1.50" },
                { n: String(wqga.qualifiedActions), l: "Qualified Actions", h: "Verified intent" },
                { n: String(wqga.activeQrContexts), l: "Active QR Contexts", h: "Physical touchpoints" },
                {
                  n: `${Math.round(wqga.firstValueRate * 100)}%`,
                  l: "First-Value Rate",
                  h: "Conversion efficiency",
                },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl bg-paper p-3.5 text-center ring-1 ring-line/50">
                  <p className="font-display text-2xl font-bold text-ink">{s.n}</p>
                  <p className="text-xs font-semibold text-ink mt-0.5">{s.l}</p>
                  <p className="text-[10px] text-mute">{s.h}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-mute">
              Demo excluded: {wqga.localDemoExcluded} · Duplicates excluded: {wqga.duplicatesExcluded} ·
              Unique sessions: {wqga.uniqueSessions}
            </p>
          </section>

          {/* Public Handles Directory with Search & Sort */}
          <section className="rounded-[28px] bg-card p-5 sm:p-6 ring-1 ring-line shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">Public Handles Directory</h2>
                <p className="text-xs text-mute">Registered creator link-in-bio profiles with live tap telemetry</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-mute" />
                  <input
                    type="text"
                    value={handleSearch}
                    onChange={(e) => setHandleSearch(e.target.value)}
                    placeholder="Search handle or name…"
                    className="w-48 sm:w-56 rounded-xl bg-paper pl-8 pr-3 py-2.5 text-sm text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand/40"
                  />
                </div>
                <select
                  value={handleSort}
                  onChange={(e) => setHandleSort(e.target.value as "taps" | "alpha")}
                  aria-label="Sort handles"
                  className="rounded-xl bg-paper px-3 py-2.5 text-sm text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand/40"
                >
                  <option value="taps">Sort by Taps</option>
                  <option value="alpha">Sort A-Z</option>
                </select>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRows.map((row) => {
                const isCopied = copiedHandle === row.handle;
                return (
                  <div
                    key={row.handle}
                    className="group flex items-center justify-between rounded-2xl bg-paper p-3 ring-1 ring-line transition hover:bg-card hover:ring-brand/40"
                  >
                    <button
                      type="button"
                      onClick={() => nav(bioPath(row.handle))}
                      className="flex-1 text-left truncate pr-2"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-ink group-hover:text-accent transition-colors truncate">
                          @{row.handle}
                        </span>
                        <ExternalLink className="h-3 w-3 text-mute shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="block text-[11px] text-mute truncate">{row.name || "AirPal Member"}</span>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="inline-flex items-center rounded-lg bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                        {row.taps} taps
                      </span>
                      <button
                        type="button"
                        onClick={() => copyHandleLink(row.handle)}
                        title="Copy profile URL"
                        className="grid h-11 w-11 place-items-center rounded-lg text-mute hover:bg-card hover:text-ink transition"
                      >
                        {isCopied ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {filteredRows.length === 0 && (
              <p className="mt-4 text-center text-xs text-mute py-4">No matching handles found.</p>
            )}
          </section>

          {/* AirPal Club Guest List */}
          <section className="rounded-[28px] bg-card p-5 sm:p-6 ring-1 ring-line shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">VIP Access Control</p>
            <h2 className="font-display mt-0.5 text-lg font-bold text-ink">AirPal Club Members</h2>
            <div className="mt-3">
              <GuestListPanel clubId={AIRPAL_CLUB_ID} clubName="AirPal Club" />
            </div>
          </section>
        </div>
      )}

      {/* SUB-TABS WITH BREADCRUMB HEADER */}
      {tab !== "overview" && tab !== "system" && (
        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 ring-1 ring-line shadow-xs">
            <button
              type="button"
              onClick={() => setTab("overview")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Cockpit Overview
            </button>
            <span className="text-xs font-bold uppercase tracking-wider text-mute">{tab} Subsystem</span>
          </div>

          {tab === "mates" && <CompanionAdmin />}
          {tab === "marketplace" && <MateRequestsAdmin />}
          {tab === "partners" && <PartnerLeadsAdmin />}
          {tab === "safety" && <SafetyInboxAdmin />}
          {tab === "search" && <SearchQueriesDashboardTab />}
          {tab === "experiences" && (
            <div className="space-y-6">
              <CampaignInboxAdmin />
              <FestivalAdmin />
            </div>
          )}
          {tab === "audit" && <AuditTrailAdmin />}
          {tab === "audience" && <GuestlistSignupsAdmin />}
          {tab === "demo" && <DemoAdmin />}
        </div>
      )}

      {/* Footer Return Home */}
      <div className="mt-8 flex justify-center">
        <Button variant="ghost" size="sm" onClick={() => nav("/")} className="gap-1.5 text-xs text-mute hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" />
          Return to AirPal Home
        </Button>
      </div>
    </div>
  );
}
