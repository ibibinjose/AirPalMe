import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import {
  Bell,
  BellOff,
  BellRing,
  Clock,
  ExternalLink,
  Headphones,
  Siren,
  Sparkles,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TabPills } from "@/components/ui/TabPills";
import { ValidField, fieldInput } from "@/components/forms/ValidField";
import { AuthGate } from "@/components/auth/AuthGate";
import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { partnerAccountPath } from "@/lib/partner-account";
import { NAMES } from "@shared/names";
import { fetchProperty, subscribeProperty, subscribePropertyMenu, unknownProperty } from "@/lib/properties";
import { makeQrDataUrl, stayQrPayload } from "@/lib/qr";
import { buildMarkerUrl } from "@shared/airpal-urls";
import { propertyKindLabel, type HostPropertyKind } from "@shared/host-property";
import type { DiningOrder, MenuItem, PropertyInfo, StaffTicket } from "@shared/airpal-data";
import { authErrorMessage } from "@shared/auth-email";
import { DEMO_BUSINESS, DEMO_PROPERTY_ID, isDemoModeSearch } from "@shared/demo-business";
import { track } from "@/lib/analytics";
import { HostActivationChecklist } from "@/components/host/HostActivationChecklist";
import { HostPlaceForm } from "@/components/host/HostPlaceForm";
import { HostRoomsPanel } from "@/components/host/HostRoomsPanel";
import { StayBlocksPanel } from "@/components/host/StayBlocksPanel";
import { HostFacilitiesPanel } from "@/components/host/HostFacilitiesPanel";
import { HostDiningPanel } from "@/components/host/HostDiningPanel";
import { HostPrintPanel } from "@/components/host/HostPrintPanel";
import { openTicketCount, resolveStaffTicket, subscribePropertyTickets } from "@/lib/tickets-store";
import { activeOrderCount, subscribePropertyDiningOrders } from "@/lib/dining-store";
import { enableHostTicketPush, ticketPushPrefEnabled } from "@/lib/tickets-push";
import { hostWorkspacePropertyId, roomTokenEntries } from "@/lib/host-workspace";
import { getPropertyWifiRemote, liveBackendEnabled, updateDiningOrderStatusRemote } from "@/lib/functions";
import { playResolutionChime, stopTicketAlarm } from "@/lib/ticket-alert-sound";

type Tab = "today" | "facilities" | "dining" | "rooms" | "place" | "print";

const TICKET_CATEGORIES: Record<
  StaffTicket["category"],
  { label: string; icon: typeof BellRing; badgeClass: string }
> = {
  reception: { label: "Reception", icon: BellRing, badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  housekeeping: { label: "Housekeeping", icon: Sparkles, badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  maintenance: { label: "Maintenance", icon: Wrench, badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  dining: { label: "Dining", icon: UtensilsCrossed, badgeClass: "bg-brand/10 text-brand" },
  late_checkout: { label: "Late Checkout", icon: Clock, badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
};

function timeAgo(isoString?: string): string {
  if (!isoString) return "";
  try {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return "";
  }
}

export function HostPage() {
  const { user, isHost, isAdmin, authReady, createHostProperty, sendVerificationEmail } = useAuth();
  const { business } = useBio();
  const [, nav] = useLocation();
  const [tab, setTab] = useState<Tab>("today");
  const [ticketTab, setTicketTab] = useState<"active" | "resolved">("active");
  const [orderTab, setOrderTab] = useState<"active" | "history">("active");
  const workspaceId = hostWorkspacePropertyId(user?.propertyIds, isAdmin);
  const [property, setProperty] = useState<PropertyInfo>(() =>
    workspaceId ? unknownProperty(workspaceId) : unknownProperty("unknown"),
  );
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tickets, setTickets] = useState<StaffTicket[]>([]);
  const [orders, setOrders] = useState<DiningOrder[]>([]);
  const [alertsOn, setAlertsOn] = useState(() => ticketPushPrefEnabled());
  const [wifiLive, setWifiLive] = useState(false);
  const [qrReady, setQrReady] = useState(false);

  const [newPropName, setNewPropName] = useState("");
  const [newPropKind, setNewPropKind] = useState<HostPropertyKind>("hotel");
  const [newPropCity, setNewPropCity] = useState("Sydney");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!workspaceId) {
      setProperty(unknownProperty("unknown"));
      return;
    }
    const unsub = subscribeProperty(workspaceId, setProperty);
    void fetchProperty(workspaceId).then(setProperty);
    return unsub;
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) {
      setMenu([]);
      return;
    }
    return subscribePropertyMenu(workspaceId, setMenu);
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    return subscribePropertyTickets(workspaceId, setTickets);
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) {
      setOrders([]);
      return;
    }
    return subscribePropertyDiningOrders(workspaceId, setOrders);
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || workspaceId === "unknown" || !liveBackendEnabled()) {
      setWifiLive(Boolean(property.wifi?.network && property.wifiUpdatedAt));
      return;
    }
    void getPropertyWifiRemote({ propertyId: workspaceId })
      .then((res) => setWifiLive(Boolean(res.network && res.password)))
      .catch(() => setWifiLive(Boolean(property.wifi?.network && property.wifiUpdatedAt)));
  }, [workspaceId, property.wifi, property.wifiUpdatedAt]);

  useEffect(() => {
    if (!property.id || property.id === "unknown") {
      setQrReady(false);
      return;
    }
    let alive = true;
    const rooms = roomTokenEntries(property.roomTokens);
    void (async () => {
      const lobbyUrl = property.lobbyMarkerId
        ? buildMarkerUrl(property.lobbyMarkerId, window.location.origin)
        : `${window.location.origin}/g/${property.id}`;
      await makeQrDataUrl(lobbyUrl);
      if (rooms[0]) await makeQrDataUrl(stayQrPayload(property.id, { room: rooms[0][1], roomToken: rooms[0][0] }));
      if (alive) setQrReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [property.id, property.lobbyMarkerId, property.roomTokens]);

  const occupancy = useMemo(() => {
    const statuses = Object.values(property.roomStatuses || {});
    if (!statuses.length) return null;
    return {
      occupied: statuses.filter((s) => s === "occupied").length,
      vacant: statuses.filter((s) => s === "vacant").length,
      total: statuses.length,
    };
  }, [property.roomStatuses]);

  const hasOwn = Boolean(user?.propertyIds?.length);
  const demoMode = isAdmin && isDemoModeSearch(useSearch());
  const showCreate = (Boolean(user) && !hasOwn && !isHost && !isAdmin) || demoMode;

  useEffect(() => {
    if (!demoMode) return;
    setNewPropName((v) => v || DEMO_BUSINESS.name);
    setNewPropCity((v) => v || DEMO_BUSINESS.city);
  }, [demoMode]);

  async function onCreateProperty(e: FormEvent) {
    e.preventDefault();
    if (!newPropName.trim()) {
      toast.error("Enter a property name");
      return;
    }
    setCreating(true);
    try {
      await createHostProperty({
        propertyName: newPropName.trim(),
        kind: newPropKind,
        city: newPropCity.trim() || "Sydney",
        demo: demoMode || undefined,
        propertyId: demoMode ? DEMO_PROPERTY_ID : undefined,
      });
      toast.success("Place listed");
    } catch (err) {
      toast.error(authErrorMessage(err, "Failed to create property"));
    } finally {
      setCreating(false);
    }
  }

  if (!authReady) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-mute">Loading…</div>;
  }

  if (!user) {
    return (
      <AuthGate
        next="/host"
        kicker="Host"
        title="List your place"
        lede="Sign in or create an account first. Then list a hotel, venue, hostel, campus, local place, or event."
      />
    );
  }

  if (showCreate) {
    return (
      <div className="mx-auto max-w-md px-4 py-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Host</p>
        <h1 className="font-display mt-1 text-3xl font-semibold">List your place</h1>
        <p className="mt-2 text-sm text-mute">
          Create a hotel, venue, hostel, or campus workspace. Or list a local shop, or an event.
        </p>
        {user.emailVerified === false && <VerifyEmailBanner email={user.email} onSend={sendVerificationEmail} />}
        <form onSubmit={onCreateProperty} className="mt-6 space-y-3">
          <ValidField label="Place name" ok={newPropName.trim().length >= 2}>
            <input
              value={newPropName}
              onChange={(e) => setNewPropName(e.target.value)}
              placeholder="e.g. Bondi Beach House"
              className={fieldInput}
            />
          </ValidField>
          <label className="block">
            <span className="text-[12px] text-mute">Kind</span>
            <select
              value={newPropKind}
              onChange={(e) => setNewPropKind(e.target.value as HostPropertyKind)}
              className={`${fieldInput} mt-1`}
            >
              <option value="hotel">Hotel</option>
              <option value="venue">Venue</option>
              <option value="hostel">Hostel</option>
              <option value="campus">Campus</option>
            </select>
          </label>
          <ValidField label="City" ok={newPropCity.trim().length >= 2}>
            <input value={newPropCity} onChange={(e) => setNewPropCity(e.target.value)} className={fieldInput} />
          </ValidField>
          <Button type="submit" className="w-full" disabled={creating} loading={creating}>
            {creating ? "Creating…" : "Create host workspace"}
          </Button>
        </form>
        <div className="mt-6 space-y-2">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => nav(partnerAccountPath({ signedIn: true, hasPlace: Boolean(business) }))}
          >
            {business ? NAMES.yourPlace : NAMES.partnerAccount}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => nav("/event")}>
            Create an event
          </Button>
        </div>
      </div>
    );
  }

  const liveName = property.name || (workspaceId ? "Loading stay…" : "Your stay");

  return (
    <div className="relative isolate overflow-hidden">
      <div className="relative mx-auto max-w-3xl px-4 pb-28">
        {user.emailVerified === false && <VerifyEmailBanner email={user.email} onSend={sendVerificationEmail} />}

        <header className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
                {property.city || "Host"} · {propertyKindLabel(property.kind)}
              </p>
              {property.name ? (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-500/20">
                  Live
                </span>
              ) : null}
            </div>
            <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight md:text-4xl">{liveName}</h1>
            {property.tagline ? <p className="mt-1 text-sm text-mute">{property.tagline}</p> : null}
          </div>
          <Button
            variant="ghost"
            className="h-11"
            onClick={() => nav(`/g/${property.id}`)}
            disabled={!property.id || property.id === "unknown"}
          >
            Guest companion <ExternalLink size={14} className="opacity-70" />
          </Button>
        </header>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="ghost"
            className="h-11 px-4 text-xs"
            onClick={() => nav(partnerAccountPath({ signedIn: true, hasPlace: Boolean(business) }))}
          >
            {business ? NAMES.yourPlace : NAMES.partnerAccount}
          </Button>
          <Button variant="ghost" className="h-11 px-4 text-xs" onClick={() => nav("/event")}>
            Event
          </Button>
          <Button
            variant="ghost"
            className="h-11 px-4 text-xs text-brand font-semibold"
            onClick={() => nav(`/stay/${property.id}`)}
          >
            Preview Guest Stay →
          </Button>
        </div>

        <TabPills
          layout="contained"
          ariaLabel="Host sections"
          className="mt-5"
          items={["today", "facilities", "dining", "rooms", "place", "print"].map((t) => ({ id: t as Tab, label: t }))}
          active={tab}
          onChange={setTab}
        />

        {tab === "today" && (
          <>
            <div className="mt-5">
              <HostActivationChecklist
                propertyId={property.id}
                propertyName={property.name}
                wifiSet={wifiLive}
                qrReady={qrReady && Boolean(property.lobbyMarkerId || roomTokenEntries(property.roomTokens).length)}
                wifiUpdatedAt={property.wifiUpdatedAt}
              />
            </div>

            {occupancy && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { n: occupancy.occupied, l: "Occupied" },
                  { n: occupancy.vacant, l: "Vacant" },
                  { n: occupancy.total, l: "Tracked rooms" },
                ].map((s) => (
                  <div key={s.l} className="rounded-[22px] bg-card/90 p-3 text-center ring-1 ring-line">
                    <p className="font-display text-2xl font-semibold">{s.n}</p>
                    <p className="text-[11px] text-mute">{s.l}</p>
                  </div>
                ))}
              </div>
            )}

            {property.roomTypes && property.roomTypes.length > 0 && (
              <section className="mt-4 rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Room types</p>
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] items-center px-1 text-xs font-medium text-brand"
                    onClick={() => setTab("rooms")}
                  >
                    Manage rooms →
                  </button>
                </div>
                <ul className="mt-3 space-y-2">
                  {property.roomTypes.map((rt) => (
                    <li key={rt.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium">{rt.name}</span>
                      <span className="text-mute">
                        {rt.totalRooms} · from ${rt.startingPrice}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => nav("/helpdesk")}
                className="flex items-center justify-between gap-3 rounded-[22px] bg-brand p-4 text-left text-white shadow-xs hover:bg-brand/95 transition active:scale-[0.99]"
              >
                <span>
                  <span className="block text-sm font-bold flex items-center gap-1.5">
                    <Headphones size={15} /> Open Universal Help Desk
                  </span>
                  <span className="block text-xs text-white/80">Unified desk for Stays, Dining & Events</span>
                </span>
                <span aria-hidden className="font-bold">→</span>
              </button>

              <button
                type="button"
                onClick={() => nav("/business/campaigns")}
                className="flex items-center justify-between gap-3 rounded-[22px] bg-ink p-4 text-left text-white shadow-xs hover:bg-ink/90 transition active:scale-[0.99]"
              >
                <span>
                  <span className="block text-sm font-semibold">Fill slow nights with an Experience</span>
                  <span className="block text-xs text-white/70">AirPal recruits the guests, you host.</span>
                </span>
                <span aria-hidden>→</span>
              </button>
            </div>

            {/* Front Desk Guest Tickets */}
            <div className="mt-8 rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-xs md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-semibold tracking-tight">Guest Tickets</h2>
                    {openTicketCount(tickets) > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400 motion-safe:animate-pulse">
                        {openTicketCount(tickets)} open
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        All clear
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[13px] text-mute">
                    Real-time front desk requests from in-stay guests via AI Receptionist & Compendium.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {openTicketCount(tickets) > 1 && (
                    <button
                      type="button"
                      className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-brand/10 px-4 text-xs font-semibold text-brand hover:bg-brand/15 transition"
                      onClick={() => {
                        const openOnes = tickets.filter((t) => t.status !== "resolved");
                        void (async () => {
                          stopTicketAlarm();
                          playResolutionChime();
                          await Promise.all(openOnes.map((t) => resolveStaffTicket(property.id, t.id)));
                          toast.success(`Resolved all ${openOnes.length} tickets`);
                        })();
                      }}
                    >
                      Resolve All ({openTicketCount(tickets)})
                    </button>
                  )}
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full ring-1 ring-line bg-paper px-4 text-xs font-medium text-mute hover:text-ink transition"
                    onClick={() => {
                      void enableHostTicketPush().then((state) => {
                        setAlertsOn(state === "granted");
                        if (state === "granted") toast.success("Alerts active — new requests will ping this device");
                        else if (state === "denied") toast.error("Notifications blocked in the browser");
                        else toast.message("This browser can't show background alerts");
                      });
                    }}
                  >
                    {alertsOn ? (
                      <>
                        <Bell size={13} /> Alerts On
                      </>
                    ) : (
                      <>
                        <BellOff size={13} /> Enable Alerts
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Tickets Filter Tabs */}
              <div className="mt-4 flex items-center gap-2 border-b border-line pb-3">
                <button
                  type="button"
                  onClick={() => setTicketTab("active")}
                  aria-pressed={ticketTab === "active"}
                  className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-xs font-semibold transition ${
                    ticketTab === "active"
                      ? "bg-brand text-white shadow-xs"
                      : "text-mute hover:text-ink hover:bg-paper"
                  }`}
                >
                  Active ({tickets.filter((t) => t.status !== "resolved").length})
                </button>
                <button
                  type="button"
                  onClick={() => setTicketTab("resolved")}
                  aria-pressed={ticketTab === "resolved"}
                  className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-xs font-semibold transition ${
                    ticketTab === "resolved"
                      ? "bg-brand text-white shadow-xs"
                      : "text-mute hover:text-ink hover:bg-paper"
                  }`}
                >
                  Resolved History ({tickets.filter((t) => t.status === "resolved").length})
                </button>
              </div>

              <ul className="mt-4 space-y-2.5">
                {ticketTab === "active" ? (
                  tickets.filter((t) => t.status !== "resolved").length === 0 ? (
                    <li className="rounded-2xl bg-paper/60 p-6 text-center text-sm text-mute ring-1 ring-line">
                      No open guest requests. Front desk is fully caught up.
                    </li>
                  ) : (
                    tickets
                      .filter((t) => t.status !== "resolved")
                      .map((t) => {
                        const catMeta = TICKET_CATEGORIES[t.category] || TICKET_CATEGORIES.reception;
                        return (
                          <li
                            key={t.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-paper/80 p-4 ring-1 ring-line shadow-2xs hover:bg-paper transition"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${catMeta.badgeClass}`}>
                                  <catMeta.icon size={12} /> {catMeta.label}
                                </span>
                                <span className="text-xs font-semibold text-ink">
                                  Room {t.roomNumber}
                                </span>
                                {t.urgency === "urgent" && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-400">
                                    <Siren size={11} /> Urgent
                                  </span>
                                )}
                                <span className="text-[11px] text-mute">{timeAgo(t.createdAt)}</span>
                              </div>
                              <p className="mt-1.5 text-sm font-medium text-ink leading-relaxed break-words">
                                {t.details}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2 sm:self-center">
                              <button
                                type="button"
                                className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 active:scale-95 transition"
                                onClick={() => {
                                  void (async () => {
                                    stopTicketAlarm();
                                    playResolutionChime();
                                    await resolveStaffTicket(property.id, t.id);
                                    void track("support_resolved", {
                                      contextId: property.id,
                                      requestId: t.id,
                                      resolutionStatus: "resolved",
                                    });
                                    toast.success("Resolved & alert turned off");
                                  })();
                                }}
                              >
                                <span>✓</span> Resolve & Close
                              </button>
                            </div>
                          </li>
                        );
                      })
                  )
                ) : (
                  tickets.filter((t) => t.status === "resolved").length === 0 ? (
                    <li className="rounded-2xl bg-paper/60 p-6 text-center text-sm text-mute ring-1 ring-line">
                      No resolved tickets in history yet.
                    </li>
                  ) : (
                    tickets
                      .filter((t) => t.status === "resolved")
                      .slice(0, 15)
                      .map((t) => {
                        const catMeta = TICKET_CATEGORIES[t.category] || TICKET_CATEGORIES.reception;
                        return (
                          <li
                            key={t.id}
                            className="flex items-center justify-between gap-3 rounded-2xl bg-paper/40 px-4 py-3 ring-1 ring-line/60 opacity-85"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-ink/70">
                                  <catMeta.icon size={12} /> Room {t.roomNumber}
                                </span>
                                <span className="text-[11px] text-mute">
                                  Resolved {t.resolvedAt ? timeAgo(t.resolvedAt) : "recently"}
                                </span>
                              </div>
                              <p className="truncate text-xs text-mute mt-0.5 line-through">{t.details}</p>
                            </div>
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                              Resolved ✓
                            </span>
                          </li>
                        );
                      })
                  )
                )}
              </ul>
            </div>

            {/* Front Desk Dining Orders */}
            <div className="mt-8 rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-xs md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-semibold tracking-tight">Dining Orders</h2>
                    {activeOrderCount(orders) > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {activeOrderCount(orders)} active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Kitchen idle
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[13px] text-mute">
                    In-room dining orders placed by guests via QR menu.
                  </p>
                </div>
              </div>

              {/* Dining Filter Tabs */}
              <div className="mt-4 flex items-center gap-2 border-b border-line pb-3">
                <button
                  type="button"
                  onClick={() => setOrderTab("active")}
                  aria-pressed={orderTab === "active"}
                  className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-xs font-semibold transition ${
                    orderTab === "active"
                      ? "bg-brand text-white shadow-xs"
                      : "text-mute hover:text-ink hover:bg-paper"
                  }`}
                >
                  Active Orders ({orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled").length})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderTab("history")}
                  aria-pressed={orderTab === "history"}
                  className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-xs font-semibold transition ${
                    orderTab === "history"
                      ? "bg-brand text-white shadow-xs"
                      : "text-mute hover:text-ink hover:bg-paper"
                  }`}
                >
                  Past Orders ({orders.filter((o) => o.status === "delivered" || o.status === "cancelled").length})
                </button>
              </div>

              <ul className="mt-4 space-y-3">
                {orderTab === "active" ? (
                  orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled").length === 0 ? (
                    <li className="rounded-2xl bg-paper/60 p-6 text-center text-sm text-mute ring-1 ring-line">
                      🍽️ No active kitchen orders.
                    </li>
                  ) : (
                    orders
                      .filter((o) => o.status !== "delivered" && o.status !== "cancelled")
                      .map((o) => {
                        const next =
                          o.status === "ready"
                            ? "delivered"
                            : o.status === "preparing"
                              ? "ready"
                              : "preparing";
                        const nextLabel =
                          next === "delivered"
                            ? "Complete Delivery"
                            : next === "ready"
                              ? "Mark Ready"
                              : "Start Preparing";

                        return (
                          <li
                            key={o.id}
                            className="rounded-2xl bg-paper/80 p-4 ring-1 ring-line shadow-2xs hover:bg-paper transition"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-ink">Room {o.roomNumber}</span>
                                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand uppercase tracking-wider">
                                  {o.status}
                                </span>
                                {o.paymentMode === "desk" ? (
                                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                    💳 Pay at Desk
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                    ✓ Stripe Paid
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-display font-semibold text-sm text-ink">
                                  A${(o.totalCents / 100).toFixed(2)}
                                </span>
                                <span className="text-[11px] text-mute">{timeAgo(o.createdAt)}</span>
                              </div>
                            </div>

                            <div className="mt-2.5 text-xs text-ink/80 space-y-1">
                              {o.items.map((it, idx) => (
                                <div key={idx} className="flex justify-between">
                                  <span>
                                    <strong className="text-brand">{it.qty}×</strong> {it.name}
                                  </span>
                                  <span className="text-mute">
                                    A${((it.unitCents * it.qty) / 100).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="mt-3.5 flex items-center justify-end gap-2 border-t border-line/60 pt-2.5">
                              <button
                                type="button"
                                className="inline-flex min-h-[44px] items-center rounded-full px-4 text-xs text-mute hover:text-red-600 transition"
                                onClick={() => {
                                  void updateDiningOrderStatusRemote({
                                    propertyId: property.id,
                                    orderId: o.id,
                                    status: "cancelled",
                                  })
                                    .then(() => toast.success("Order cancelled"))
                                    .catch((err) =>
                                      toast.error(err instanceof Error ? err.message : "Couldn't cancel"),
                                    );
                                }}
                              >
                                Cancel Order
                              </button>
                              <button
                                type="button"
                                className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-4 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 active:scale-95 transition"
                                onClick={() => {
                                  void (async () => {
                                    if (next === "delivered") {
                                      stopTicketAlarm();
                                      playResolutionChime();
                                    }
                                    try {
                                      await updateDiningOrderStatusRemote({
                                        propertyId: property.id,
                                        orderId: o.id,
                                        status: next,
                                      });
                                      toast.success(
                                        next === "delivered" ? "Order Delivered & Closed" : `Order ${nextLabel}`,
                                      );
                                    } catch (err) {
                                      toast.error(
                                        err instanceof Error ? err.message : "Couldn't update order",
                                      );
                                    }
                                  })();
                                }}
                              >
                                {nextLabel} →
                              </button>
                            </div>
                          </li>
                        );
                      })
                  )
                ) : (
                  orders.filter((o) => o.status === "delivered" || o.status === "cancelled").length === 0 ? (
                    <li className="rounded-2xl bg-paper/60 p-6 text-center text-sm text-mute ring-1 ring-line">
                      No order history yet.
                    </li>
                  ) : (
                    orders
                      .filter((o) => o.status === "delivered" || o.status === "cancelled")
                      .slice(0, 15)
                      .map((o) => (
                        <li
                          key={o.id}
                          className="flex items-center justify-between gap-3 rounded-2xl bg-paper/40 px-4 py-3 ring-1 ring-line/60 opacity-85"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-ink/80">Room {o.roomNumber}</span>
                              <span className="text-[11px] text-mute">{timeAgo(o.updatedAt)}</span>
                            </div>
                            <p className="truncate text-xs text-mute mt-0.5">
                              {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`text-[11px] font-semibold ${
                                o.status === "delivered"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-500"
                              }`}
                            >
                              {o.status === "delivered" ? "Delivered ✓" : "Cancelled ✕"}
                            </span>
                            <p className="text-xs font-medium text-ink/70">
                              A${(o.totalCents / 100).toFixed(2)}
                            </p>
                          </div>
                        </li>
                      ))
                  )
                )}
              </ul>
            </div>
          </>
        )}

        {tab === "facilities" && <HostFacilitiesPanel property={property} onSaved={setProperty} />}
        {tab === "rooms" && (
          <>
            <HostRoomsPanel property={property} onSaved={setProperty} />
            <StayBlocksPanel propertyId={property.id} />
          </>
        )}
        {tab === "place" && <HostPlaceForm property={property} onSaved={setProperty} />}
        {tab === "dining" && <HostDiningPanel propertyId={property.id} menu={menu} />}
        {tab === "print" && <HostPrintPanel property={property} />}
      </div>
    </div>
  );
}
