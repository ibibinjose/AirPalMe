import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ValidField, fieldInput } from "@/components/forms/ValidField";
import { AuthGate } from "@/components/auth/AuthGate";
import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import { useAuth } from "@/contexts/AuthContext";
import { fetchProperty, subscribeProperty, subscribePropertyMenu, unknownProperty } from "@/lib/properties";
import { makeQrDataUrl, stayQrPayload } from "@/lib/qr";
import { buildMarkerUrl } from "@shared/airpal-urls";
import { propertyKindLabel, type HostPropertyKind } from "@shared/host-property";
import type { MenuItem, PropertyInfo, StaffTicket } from "@shared/airpal-data";
import { authErrorMessage } from "@shared/auth-email";
import { track } from "@/lib/analytics";
import { HostActivationChecklist } from "@/components/host/HostActivationChecklist";
import { HostOrdersPanel } from "@/components/host/HostOrdersPanel";
import { HostPlaceForm } from "@/components/host/HostPlaceForm";
import { HostRoomsPanel } from "@/components/host/HostRoomsPanel";
import { HostDiningPanel } from "@/components/host/HostDiningPanel";
import { HostPrintPanel } from "@/components/host/HostPrintPanel";
import { openTicketCount, resolveStaffTicket, subscribePropertyTickets } from "@/lib/tickets-store";
import { enableHostTicketPush, ticketPushPrefEnabled } from "@/lib/tickets-push";
import { hostWorkspacePropertyId, roomTokenEntries } from "@/lib/host-workspace";
import { getPropertyWifiRemote, liveBackendEnabled } from "@/lib/functions";
import { cn } from "@/lib/cn";

type Tab = "today" | "orders" | "rooms" | "place" | "dining" | "print";

export function HostPage() {
  const { user, isHost, isAdmin, authReady, createHostProperty, sendVerificationEmail } = useAuth();
  const [, nav] = useLocation();
  const [tab, setTab] = useState<Tab>("today");
  const workspaceId = hostWorkspacePropertyId(user?.propertyIds, isAdmin);
  const [property, setProperty] = useState<PropertyInfo>(() =>
    workspaceId ? unknownProperty(workspaceId) : unknownProperty("unknown"),
  );
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tickets, setTickets] = useState<StaffTicket[]>([]);
  const [alertsOn, setAlertsOn] = useState(() => ticketPushPrefEnabled());
  const [wifiLive, setWifiLive] = useState(false);
  const [qrReady, setQrReady] = useState(false);
  const [openOrders, setOpenOrders] = useState(0);

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
  const showCreate = Boolean(user) && !hasOwn && !isHost && !isAdmin;

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
          <Button variant="ghost" className="w-full" onClick={() => nav("/bio/setup?kind=business")}>
            List a local place
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
      <div aria-hidden className="pointer-events-none absolute -left-24 top-[-6rem] h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-16 top-32 h-56 w-56 rounded-full bg-gold/15 blur-3xl" />

      <div className="relative mx-auto max-w-3xl px-4 pb-16">
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
            className="h-10"
            onClick={() => nav(`/g/${property.id}`)}
            disabled={!property.id || property.id === "unknown"}
          >
            Guest companion <ExternalLink size={14} className="opacity-70" />
          </Button>
        </header>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="ghost" className="h-8 px-3 text-xs" onClick={() => nav("/bio/setup?kind=business")}>
            Local listing
          </Button>
          <Button variant="ghost" className="h-8 px-3 text-xs" onClick={() => nav("/event")}>
            Event
          </Button>
          <Button variant="ghost" className="h-8 px-3 text-xs" onClick={() => nav("/business")}>
            Place page
          </Button>
        </div>

        <div className="no-scrollbar mt-5 flex gap-1 overflow-x-auto rounded-full bg-card/80 p-1 ring-1 ring-line shadow-sm backdrop-blur">
          {(["today", "orders", "rooms", "place", "dining", "print"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm capitalize transition",
                tab === t ? "bg-ink text-white shadow-sm" : "text-mute hover:text-ink",
              )}
            >
              {t}
              {t === "orders" && openOrders > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
                  {openOrders > 9 ? "9+" : openOrders}
                </span>
              )}
            </button>
          ))}
        </div>

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
                  <button type="button" className="text-xs font-medium text-brand" onClick={() => setTab("rooms")}>
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

            <button
              type="button"
              onClick={() => nav("/business/campaigns")}
              className="mt-4 flex w-full items-center justify-between gap-3 rounded-[22px] bg-ink p-4 text-left text-white"
            >
              <span>
                <span className="block text-sm font-semibold">Fill slow nights with an Experience</span>
                <span className="block text-xs text-white/70">AirPal recruits the guests, you host.</span>
              </span>
              <span aria-hidden>→</span>
            </button>

            <div className="mt-6 mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-mute">
                Guest tickets{openTicketCount(tickets) ? ` · ${openTicketCount(tickets)} open` : ""}
              </h2>
              <button
                type="button"
                className="text-xs font-medium text-brand"
                onClick={() => {
                  void enableHostTicketPush().then((state) => {
                    setAlertsOn(state === "granted");
                    if (state === "granted") toast.success("Alerts on — new requests will ping this device");
                    else if (state === "denied") toast.error("Notifications blocked in the browser");
                    else toast.message("This browser can’t show background alerts");
                  });
                }}
              >
                {alertsOn ? "Alerts on" : "Enable alerts"}
              </button>
            </div>
            <ul className="space-y-2">
              {openTicketCount(tickets) === 0 ? (
                <li className="rounded-[22px] bg-card p-6 text-center text-sm text-mute ring-1 ring-line">
                  No open guest tickets.
                </li>
              ) : (
                tickets
                  .filter((t) => t.status !== "resolved")
                  .slice(0, 8)
                  .map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-3 rounded-[22px] bg-card px-4 py-3 ring-1 ring-line"
                    >
                      <div className="min-w-0">
                        <p className="text-[12px] text-mute">
                          Room {t.roomNumber} · {t.category}
                          {t.urgency === "urgent" ? " · urgent" : ""}
                        </p>
                        <p className="truncate font-medium">{t.details}</p>
                      </div>
                      <button
                        className="text-sm text-brand"
                        onClick={() => {
                          void (async () => {
                            await resolveStaffTicket(property.id, t.id);
                            void track("support_resolved", {
                              contextId: property.id,
                              requestId: t.id,
                              resolutionStatus: "resolved",
                            });
                            toast.success("Done");
                          })();
                        }}
                      >
                        Close
                      </button>
                    </li>
                  ))
              )}
            </ul>
          </>
        )}

        {tab === "orders" && <HostOrdersPanel propertyId={property.id} onOpenCount={setOpenOrders} />}
        {tab === "rooms" && <HostRoomsPanel property={property} onSaved={setProperty} />}
        {tab === "place" && <HostPlaceForm property={property} onSaved={setProperty} />}
        {tab === "dining" && <HostDiningPanel propertyId={property.id} menu={menu} />}
        {tab === "print" && <HostPrintPanel property={property} />}
      </div>
    </div>
  );
}
