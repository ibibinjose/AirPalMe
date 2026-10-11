import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/PageLoading";
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
import { HostPlaceForm } from "@/components/host/HostPlaceForm";
import { HostRoomsPanel } from "@/components/host/HostRoomsPanel";
import { StayBlocksPanel } from "@/components/host/StayBlocksPanel";
import { HostFacilitiesPanel } from "@/components/host/HostFacilitiesPanel";
import { HostDiningPanel } from "@/components/host/HostDiningPanel";
import { HostPrintPanel } from "@/components/host/HostPrintPanel";
import { HostTodaySummary } from "@/components/host/HostTodaySummary";
import { HostTicketBoard } from "@/components/host/HostTicketBoard";
import { HostOrderBoard } from "@/components/host/HostOrderBoard";
import { BelongingReportPanel } from "@/components/host/BelongingReportPanel";
import { subscribePropertyTickets } from "@/lib/tickets-store";
import { subscribePropertyDiningOrders } from "@/lib/dining-store";
import { hostWorkspacePropertyId, roomTokenEntries } from "@/lib/host-workspace";
import { getPropertyWifiRemote, liveBackendEnabled } from "@/lib/functions";

type Tab = "today" | "belonging" | "facilities" | "dining" | "rooms" | "place" | "print";

export function HostPage() {
  const { user, isHost, isAdmin, authReady, createHostProperty, sendVerificationEmail } = useAuth();
  const { business } = useBio();
  const [, nav] = useLocation();
  const [tab, setTab] = useState<Tab>("today");
  const workspaceId = hostWorkspacePropertyId(user?.propertyIds, isAdmin);
  const [property, setProperty] = useState<PropertyInfo>(() =>
    workspaceId ? unknownProperty(workspaceId) : unknownProperty("unknown"),
  );
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tickets, setTickets] = useState<StaffTicket[]>([]);
  const [orders, setOrders] = useState<DiningOrder[]>([]);
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
    return <PageLoading />;
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
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Host</p>
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

        <header className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
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
            onClick={() => nav("/join")}
          >
            Arrival Portal <ExternalLink size={14} className="opacity-70" />
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
            Event Host Console
          </Button>
          <Button
            variant="ghost"
            className="h-11 px-4 text-xs text-accent font-semibold"
            onClick={() => nav("/business")}
          >
            Business Hub →
          </Button>
        </div>

        <TabPills
          layout="contained"
          ariaLabel="Host sections"
          className="mt-5"
          items={["today", "belonging", "facilities", "dining", "rooms", "place", "print"].map((t) => ({ id: t as Tab, label: t === "belonging" ? "Belonging Report" : t }))}
          active={tab}
          onChange={setTab}
        />

        {tab === "belonging" && <BelongingReportPanel />}

        {tab === "today" && (
          <>
            <HostTodaySummary
              property={property}
              wifiLive={wifiLive}
              qrReady={qrReady}
              onManageRooms={() => setTab("rooms")}
            />
            <HostTicketBoard propertyId={property.id} tickets={tickets} />
            <HostOrderBoard propertyId={property.id} orders={orders} />
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
