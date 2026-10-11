import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Building2,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  ConciergeBell,
  Headphones,
  Layers,
  Plus,
  Search,
  ShieldAlert,
  Ticket,
  Utensils,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useListings } from "@/contexts/ListingsContext";
import { useEvents } from "@/contexts/EventsContext";
import { hostWatchPropertyIds } from "@/lib/host-workspace";
import {
  resolveStaffTicket,
  submitStaffTicket,
  subscribePropertyTickets,
  type StaffTicket,
} from "@/lib/tickets-store";
import {
  subscribePropertyDiningOrders,
} from "@/lib/dining-store";
import type { DiningOrder, DiningOrderStatus } from "@shared/airpal-data";
import { updateDiningOrderStatusRemote } from "@/lib/functions";
import {
  playResolutionChime,
  playTicketAlarm,
  setTicketSoundEnabled,
  stopTicketAlarm,
  ticketSoundEnabled,
} from "@/lib/ticket-alert-sound";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";

type DomainFilter = "all" | "stay" | "dining" | "events" | "venue";
type StatusFilter = "active" | "urgent" | "resolved";

const TICKET_CATEGORIES: Record<StaffTicket["category"], { label: string; icon: string; badgeClass: string }> = {
  reception: { label: "Reception / Front Desk", icon: "🛎️", badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  housekeeping: { label: "Housekeeping", icon: "✨", badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  maintenance: { label: "Maintenance & Tech", icon: "🔧", badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  dining: { label: "In-Room Dining", icon: "🍽️", badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  late_checkout: { label: "Late Checkout", icon: "⏰", badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
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

export function HelpDeskPage() {
  const { user, isAdmin } = useAuth();
  const { business } = useBio();
  const { mine: businessListing } = useListings();
  const { myEvent } = useEvents();

  const allEvents = useMemo(() => {
    const list = myEvent ? [myEvent] : [];
    return list;
  }, [myEvent]);

  const propertyIds = useMemo(() => hostWatchPropertyIds(user?.propertyIds, isAdmin), [user?.propertyIds, isAdmin]);
  const [ticketsByProperty, setTicketsByProperty] = useState<Record<string, StaffTicket[]>>({});
  const [ordersByProperty, setOrdersByProperty] = useState<Record<string, DiningOrder[]>>({});
  const [soundOn, setSoundOn] = useState(() => ticketSoundEnabled());
  const [domainFilter, setDomainFilter] = useState<DomainFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New ticket form state
  const [newPropertyId, setNewPropertyId] = useState(propertyIds[0] || "harbour-hotel");
  const [newRoom, setNewRoom] = useState("");
  const [newCategory, setNewCategory] = useState<StaffTicket["category"]>("reception");
  const [newUrgency, setNewUrgency] = useState<StaffTicket["urgency"]>("normal");
  const [newDetails, setNewDetails] = useState("");
  const [creating, setCreating] = useState(false);

  // Subscribe to live tickets & dining orders across properties
  useEffect(() => {
    if (!propertyIds.length) return;
    const ticketUnsubs = propertyIds.map((id) =>
      subscribePropertyTickets(id, (rows) => {
        setTicketsByProperty((prev) => ({ ...prev, [id]: rows }));
      }),
    );
    const orderUnsubs = propertyIds.map((id) =>
      subscribePropertyDiningOrders(id, (rows) => {
        setOrdersByProperty((prev) => ({ ...prev, [id]: rows }));
      }),
    );
    return () => {
      [...ticketUnsubs, ...orderUnsubs].forEach((fn) => fn());
    };
  }, [propertyIds]);

  const allTickets = useMemo(() => {
    const list: StaffTicket[] = [];
    Object.values(ticketsByProperty).forEach((rows) => list.push(...rows));
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [ticketsByProperty]);

  const allOrders = useMemo(() => {
    const list: DiningOrder[] = [];
    Object.values(ordersByProperty).forEach((rows) => list.push(...rows));
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [ordersByProperty]);

  const activeTicketCount = useMemo(
    () => allTickets.filter((t) => t.status !== "resolved").length,
    [allTickets],
  );
  const urgentTicketCount = useMemo(
    () => allTickets.filter((t) => t.status !== "resolved" && t.urgency === "urgent").length,
    [allTickets],
  );
  const activeOrdersCount = useMemo(
    () => allOrders.filter((o) => o.status !== "delivered" && o.status !== "cancelled").length,
    [allOrders],
  );

  // Stop alarm if all active tickets and orders are resolved
  useEffect(() => {
    if (activeTicketCount === 0 && activeOrdersCount === 0) {
      stopTicketAlarm();
    }
  }, [activeTicketCount, activeOrdersCount]);

  // Filtered lists
  const filteredTickets = useMemo(() => {
    return allTickets.filter((t) => {
      // Domain filter
      if (domainFilter === "dining" && t.category !== "dining") return false;
      if (domainFilter === "stay" && t.category === "dining") return false;

      // Status filter
      if (statusFilter === "active" && t.status === "resolved") return false;
      if (statusFilter === "urgent" && (t.status === "resolved" || t.urgency !== "urgent")) return false;
      if (statusFilter === "resolved" && t.status !== "resolved") return false;

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchRoom = t.roomNumber.toLowerCase().includes(q);
        const matchDetails = t.details.toLowerCase().includes(q);
        const matchCategory = t.category.toLowerCase().includes(q);
        if (!matchRoom && !matchDetails && !matchCategory) return false;
      }
      return true;
    });
  }, [allTickets, domainFilter, statusFilter, searchQuery]);

  const filteredOrders = useMemo(() => {
    if (domainFilter === "stay" || domainFilter === "events" || domainFilter === "venue") return [];
    return allOrders.filter((o) => {
      if (statusFilter === "active" && (o.status === "delivered" || o.status === "cancelled")) return false;
      if (statusFilter === "urgent" && o.status === "delivered") return false;
      if (statusFilter === "resolved" && o.status !== "delivered" && o.status !== "cancelled") return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchRoom = o.roomNumber.toLowerCase().includes(q);
        const matchItems = o.items.some((it) => it.name.toLowerCase().includes(q));
        if (!matchRoom && !matchItems) return false;
      }
      return true;
    });
  }, [allOrders, domainFilter, statusFilter, searchQuery]);

  async function handleResolveTicket(propId: string, ticketId: string) {
    try {
      stopTicketAlarm();
      playResolutionChime();
      await resolveStaffTicket(propId, ticketId);
      void track("support_resolved", { contextId: propId, requestId: ticketId, resolutionStatus: "resolved" });
      toast.success("Ticket resolved & closed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't resolve ticket");
    }
  }

  async function handleResolveAll() {
    const pending = filteredTickets.filter((t) => t.status !== "resolved");
    if (!pending.length) return;
    try {
      stopTicketAlarm();
      playResolutionChime();
      await Promise.all(
        pending.map((t) => resolveStaffTicket(t.propertyId || propertyIds[0] || "unknown", t.id)),
      );
      toast.success(`Resolved ${pending.length} tickets`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't resolve tickets");
    }
  }

  async function handleAdvanceOrder(propId: string, orderId: string, nextStatus: DiningOrderStatus, label: string) {
    try {
      if (nextStatus === "delivered") {
        stopTicketAlarm();
        playResolutionChime();
      }
      await updateDiningOrderStatusRemote({ propertyId: propId, orderId, status: nextStatus });
      toast.success(`Order status: ${label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update order");
    }
  }

  async function handleCreateTicket(e: FormEvent) {
    e.preventDefault();
    if (!newDetails.trim()) {
      toast.error("Please enter ticket details");
      return;
    }
    setCreating(true);
    try {
      await submitStaffTicket({
        propertyId: newPropertyId,
        roomNumber: newRoom.trim() || "Front Desk",
        category: newCategory,
        urgency: newUrgency,
        details: newDetails.trim(),
      });
      toast.success("Help desk ticket logged");
      setShowCreateModal(false);
      setNewDetails("");
      setNewRoom("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-8 md:px-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand/10 text-accent ring-1 ring-brand/20 shadow-xs">
              <Headphones size={20} />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">AirPal Operations</span>
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
                Universal Help Desk
              </h1>
            </div>
          </div>
          <p className="mt-1.5 text-sm text-mute">
            Live command console for Hotel Stays, In-Room Dining, Event Hosts, and Local Venues.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              setTicketSoundEnabled(next);
              if (next) playTicketAlarm();
              toast.message(next ? "Alarm audio enabled" : "Alarm audio muted");
            }}
            className="flex items-center gap-1.5 rounded-full bg-paper px-3.5 py-2 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition"
            title={soundOn ? "Mute alarm sound" : "Unmute alarm sound"}
          >
            {soundOn ? <Volume2 size={15} className="text-accent" /> : <VolumeX size={15} className="text-mute" />}
            <span>{soundOn ? "Alarm On" : "Muted"}</span>
          </button>

          {/* Quick Log New Ticket */}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 active:scale-95 transition cursor-pointer"
          >
            <Plus size={15} /> Log Service Request
          </button>
        </div>
      </div>

      {/* Real-time KPI Stats Bar */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-card p-4 ring-1 ring-line shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-mute">Open Tickets</span>
            <ConciergeBell size={16} className="text-accent" />
          </div>
          <p className="font-display mt-2 text-2xl font-bold text-ink">{activeTicketCount}</p>
          <p className="mt-0.5 text-[11px] text-mute">Guest requests awaiting action</p>
        </div>

        <div className="rounded-2xl bg-card p-4 ring-1 ring-line shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-mute">Urgent Priority</span>
            <ShieldAlert size={16} className="text-red-500" />
          </div>
          <p className={`font-display mt-2 text-2xl font-bold ${urgentTicketCount > 0 ? "text-red-600 animate-pulse" : "text-ink"}`}>
            {urgentTicketCount}
          </p>
          <p className="mt-0.5 text-[11px] text-mute">High-urgency guest alerts</p>
        </div>

        <div className="rounded-2xl bg-card p-4 ring-1 ring-line shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-mute">Kitchen Orders</span>
            <Utensils size={16} className="text-amber-500" />
          </div>
          <p className="font-display mt-2 text-2xl font-bold text-ink">{activeOrdersCount}</p>
          <p className="mt-0.5 text-[11px] text-mute">In-stay dining orders firing</p>
        </div>

        <div className="rounded-2xl bg-card p-4 ring-1 ring-line shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-mute">Connected Entities</span>
            <Building2 size={16} className="text-emerald-500" />
          </div>
          <p className="font-display mt-2 text-2xl font-bold text-ink">
            {Math.max(1, propertyIds.length + (business ? 1 : 0) + (allEvents.length ? 1 : 0))}
          </p>
          <p className="mt-0.5 text-[11px] text-mute">Active operational workspaces</p>
        </div>
      </div>

      {/* Control Filters & Domain Tabs */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-card p-3 ring-1 ring-line shadow-2xs">
        {/* Domain Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "All Verticals", icon: Layers },
            { id: "stay", label: "Hotel / Stay", icon: Building2 },
            { id: "dining", label: "Dining & Bar", icon: Utensils },
            { id: "events", label: "Events & Festivals", icon: CalendarDays },
            { id: "venue", label: "Venue Inquiries", icon: Ticket },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = domainFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDomainFilter(tab.id as DomainFilter)}
                className={cn(
                  "flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer active:scale-95",
                  active
                    ? "bg-brand text-white shadow-xs"
                    : "text-mute hover:text-ink hover:bg-paper",
                )}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search room, request, item…"
            className="min-h-[44px] w-full rounded-xl bg-paper pl-8 pr-3 text-xs text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand/40"
          />
        </div>
      </div>

      {/* Status Filter & Batch Actions */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              statusFilter === "active" ? "bg-ink text-paper" : "bg-card text-mute hover:text-ink ring-1 ring-line"
            }`}
          >
            Active Queue ({activeTicketCount + activeOrdersCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("urgent")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              statusFilter === "urgent" ? "bg-red-600 text-white" : "bg-card text-mute hover:text-ink ring-1 ring-line"
            }`}
          >
            🚨 Urgent Only ({urgentTicketCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("resolved")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              statusFilter === "resolved" ? "bg-ink text-paper" : "bg-card text-mute hover:text-ink ring-1 ring-line"
            }`}
          >
            Resolved Archive
          </button>
        </div>

        {statusFilter === "active" && filteredTickets.filter((t) => t.status !== "resolved").length > 1 && (
          <button
            type="button"
            onClick={handleResolveAll}
            className="flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-accent hover:bg-brand/15 transition"
          >
            <CheckCheck size={14} /> Resolve All Visible ({filteredTickets.filter((t) => t.status !== "resolved").length})
          </button>
        )}
      </div>

      {/* Unified Feed Section */}
      <div className="mt-6 space-y-6">
        {/* Guest Tickets Feed */}
        {domainFilter !== "events" && domainFilter !== "venue" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                <ConciergeBell size={16} className="text-accent" />
                <span>Guest Service Requests ({filteredTickets.length})</span>
              </h2>
            </div>

            {filteredTickets.length === 0 ? (
              <div className="rounded-2xl bg-card p-8 text-center ring-1 ring-line">
                <p className="text-sm text-mute">No tickets matching the selected filters.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredTickets.map((ticket) => {
                  const cat = TICKET_CATEGORIES[ticket.category] || TICKET_CATEGORIES.reception;
                  const isResolved = ticket.status === "resolved";
                  const propId = ticket.propertyId || propertyIds[0] || "unknown";

                  return (
                    <div
                      key={ticket.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl p-4 ring-1 ring-line shadow-xs transition ${
                        isResolved
                          ? "bg-paper/40 opacity-80"
                          : ticket.urgency === "urgent"
                            ? "bg-red-500/5 ring-red-500/30"
                            : "bg-card hover:bg-paper/70"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${cat.badgeClass}`}>
                            <span>{cat.icon}</span> {cat.label}
                          </span>
                          <span className="text-xs font-bold text-ink">
                            Room {ticket.roomNumber}
                          </span>
                          {ticket.urgency === "urgent" && !isResolved && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-400 animate-pulse">
                              🚨 Urgent Priority
                            </span>
                          )}
                          <span className="text-[11px] text-mute flex items-center gap-1">
                            <Clock size={11} /> {timeAgo(ticket.createdAt)}
                          </span>
                        </div>

                        <p className={`mt-2 text-sm font-medium text-ink leading-relaxed break-words ${isResolved ? "line-through text-mute" : ""}`}>
                          {ticket.details}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 sm:self-center">
                        {isResolved ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={14} /> Resolved {ticket.resolvedAt ? timeAgo(ticket.resolvedAt) : ""}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleResolveTicket(propId, ticket.id)}
                            className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 active:scale-95 transition"
                          >
                            <Check size={14} /> Resolve & Close
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Dining Orders Feed */}
        {(domainFilter === "all" || domainFilter === "dining") && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                <Utensils size={16} className="text-amber-500" />
                <span>In-Room & Venue Dining Orders ({filteredOrders.length})</span>
              </h2>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="rounded-2xl bg-card p-8 text-center ring-1 ring-line">
                <p className="text-sm text-mute">No dining orders in the current queue.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => {
                  const propId = order.propertyId || propertyIds[0] || "unknown";
                  const nextStatus =
                    order.status === "ready"
                      ? "delivered"
                      : order.status === "preparing"
                        ? "ready"
                        : "preparing";
                  const nextLabel =
                    nextStatus === "delivered"
                      ? "Complete Delivery"
                      : nextStatus === "ready"
                        ? "Mark Ready"
                        : "Start Preparing";

                  return (
                    <div key={order.id} className="rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-ink">Room {order.roomNumber}</span>
                          <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent uppercase tracking-wider">
                            {order.status}
                          </span>
                          {order.paymentMode === "desk" ? (
                            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                              💳 Pay at Desk
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                              ✓ Stripe Paid
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-semibold text-sm text-ink">
                            A${(order.totalCents / 100).toFixed(2)}
                          </span>
                          <span className="text-[11px] text-mute">{timeAgo(order.createdAt)}</span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="mt-2.5 text-xs text-ink/90 space-y-1">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>
                              <strong className="text-accent">{it.qty}×</strong> {it.name}
                            </span>
                            <span className="text-mute">
                              A${((it.unitCents * it.qty) / 100).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      {order.status !== "delivered" && order.status !== "cancelled" && (
                        <div className="mt-3.5 flex items-center justify-end gap-2 border-t border-line/60 pt-2.5">
                          <button
                            type="button"
                            className="rounded-full px-3 py-1.5 text-xs text-mute hover:text-red-600 transition"
                            onClick={() => {
                              void updateDiningOrderStatusRemote({ propertyId: propId, orderId: order.id, status: "cancelled" })
                                .then(() => toast.success("Order cancelled"))
                                .catch((err) => toast.error(err instanceof Error ? err.message : "Couldn't cancel"));
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 active:scale-95 transition"
                            onClick={() => handleAdvanceOrder(propId, order.id, nextStatus, nextLabel)}
                          >
                            {nextLabel} →
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Events & Festival Desk Section */}
        {(domainFilter === "all" || domainFilter === "events") && allEvents.length > 0 && (
          <div className="mt-8 rounded-2xl bg-card p-5 ring-1 ring-line shadow-xs">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-indigo-500" />
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
                  Event & Festival Operations ({allEvents.length})
                </h2>
              </div>
              <Link href="/events" className="text-xs font-semibold text-accent hover:underline">
                View All Events →
              </Link>
            </div>

            <div className="mt-3 divide-y divide-line">
              {allEvents.map((evt) => (
                <div key={evt.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-sm text-ink">{evt.name || "Event"}</h3>
                    <p className="text-xs text-mute">{evt.venue || evt.city || "Sydney"}</p>
                  </div>
                  <Link
                    href={`/events/${evt.id}/manage`}
                    className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition"
                  >
                    Event Desk
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Local Business & Venue Info */}
        {(domainFilter === "all" || domainFilter === "venue") && businessListing && (
          <div className="mt-8 rounded-2xl bg-card p-5 ring-1 ring-line shadow-xs">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-accent" />
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
                  Venue & Store Inquiries ({businessListing.name})
                </h2>
              </div>
              <Link href="/business" className="text-xs font-semibold text-accent hover:underline">
                Manage Venue →
              </Link>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-mute">Category: {businessListing.category} · Phone: {businessListing.phone || "Not set"}</p>
                <p className="text-xs font-medium text-ink mt-0.5">{businessListing.address || "Address verified"}</p>
              </div>
              <Link
                href="/business"
                className="rounded-full bg-brand/10 px-3.5 py-1.5 text-xs font-semibold text-accent hover:bg-brand/15 transition"
              >
                Door List & Inquiries
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Log Service Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-[28px] bg-card p-6 ring-1 ring-line shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <ConciergeBell size={18} className="text-accent" />
                <h3 className="font-display font-semibold text-lg text-ink">Log Service Request</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-1 text-mute hover:bg-paper hover:text-ink transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="mt-4 space-y-4">
              {propertyIds.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-ink/80 mb-1">Property</label>
                  <select
                    value={newPropertyId}
                    onChange={(e) => setNewPropertyId(e.target.value)}
                    className="h-11 w-full rounded-2xl bg-paper px-3 text-sm text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand/40"
                  >
                    {propertyIds.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink/80 mb-1">Room / Location</label>
                  <input
                    type="text"
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    placeholder="e.g. Room 304, Lobby"
                    className="h-11 w-full rounded-2xl bg-paper px-3 text-sm text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink/80 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as StaffTicket["category"])}
                    className="h-11 w-full rounded-2xl bg-paper px-3 text-sm text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand/40"
                  >
                    <option value="reception">Reception</option>
                    <option value="housekeeping">Housekeeping</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="dining">Dining</option>
                    <option value="late_checkout">Late Checkout</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/80 mb-1">Priority</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewUrgency("normal")}
                    className={`rounded-xl py-2 text-xs font-semibold transition ${
                      newUrgency === "normal"
                        ? "bg-brand text-white shadow-xs"
                        : "bg-paper text-mute ring-1 ring-line hover:bg-card"
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUrgency("urgent")}
                    className={`rounded-xl py-2 text-xs font-semibold transition ${
                      newUrgency === "urgent"
                        ? "bg-red-600 text-white shadow-xs"
                        : "bg-paper text-mute ring-1 ring-line hover:bg-card"
                    }`}
                  >
                    🚨 Urgent
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/80 mb-1">Request Details</label>
                <textarea
                  value={newDetails}
                  onChange={(e) => setNewDetails(e.target.value)}
                  placeholder="Describe the guest inquiry, maintenance item, or service request…"
                  rows={3}
                  className="w-full rounded-2xl bg-paper p-3 text-sm text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-full px-4 py-2 text-xs font-semibold text-mute hover:bg-paper transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-full bg-brand px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 active:scale-95 transition disabled:opacity-60"
                >
                  {creating ? "Logging…" : "Log Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
