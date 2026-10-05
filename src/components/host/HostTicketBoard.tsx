import { useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, BellRing, Check, Clock, Siren, Sparkles, UtensilsCrossed, Wrench } from "lucide-react";
import type { StaffTicket } from "@shared/airpal-data";
import { openTicketCount, resolveStaffTicket } from "@/lib/tickets-store";
import { enableHostTicketPush, ticketPushPrefEnabled } from "@/lib/tickets-push";
import { playResolutionChime, stopTicketAlarm } from "@/lib/ticket-alert-sound";
import { track } from "@/lib/analytics";
import { activeTickets, formatTimeAgo, resolvedTickets } from "@/lib/host-boards";
import { BoardFilterTabs } from "./BoardFilterTabs";

const TICKET_CATEGORIES: Record<StaffTicket["category"], { label: string; icon: typeof BellRing; badgeClass: string }> =
  {
    reception: { label: "Reception", icon: BellRing, badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    housekeeping: {
      label: "Housekeeping",
      icon: Sparkles,
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    maintenance: {
      label: "Maintenance",
      icon: Wrench,
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    dining: { label: "Dining", icon: UtensilsCrossed, badgeClass: "bg-brand/10 text-brand" },
    late_checkout: {
      label: "Late Checkout",
      icon: Clock,
      badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    },
  };

async function resolveOne(propertyId: string, ticketId: string) {
  stopTicketAlarm();
  playResolutionChime();
  await resolveStaffTicket(propertyId, ticketId);
  void track("support_resolved", {
    contextId: propertyId,
    requestId: ticketId,
    resolutionStatus: "resolved",
  });
}

export function HostTicketBoard({ propertyId, tickets }: { propertyId: string; tickets: StaffTicket[] }) {
  const [ticketTab, setTicketTab] = useState<"active" | "resolved">("active");
  const [alertsOn, setAlertsOn] = useState(() => ticketPushPrefEnabled());
  const open = activeTickets(tickets);
  const resolved = resolvedTickets(tickets);

  return (
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
            Real-time front desk requests from in-stay guests via AI Receptionist & Stay & Guide.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {openTicketCount(tickets) > 1 && (
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-brand/10 px-4 text-xs font-semibold text-brand hover:bg-brand/15 transition"
              onClick={() => {
                void (async () => {
                  stopTicketAlarm();
                  playResolutionChime();
                  await Promise.all(open.map((t) => resolveStaffTicket(propertyId, t.id)));
                  toast.success(`Resolved all ${open.length} tickets`);
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

      <BoardFilterTabs
        ariaLabel="Ticket history filter"
        value={ticketTab}
        onChange={setTicketTab}
        options={[
          { id: "active", label: "Active", count: open.length },
          { id: "resolved", label: "Resolved History", count: resolved.length },
        ]}
      />

      <ul className="mt-4 space-y-2.5">
        {ticketTab === "active" ? (
          open.length === 0 ? (
            <li className="rounded-2xl bg-paper/60 p-6 text-center text-sm text-mute ring-1 ring-line">
              No open guest requests. Front desk is fully caught up.
            </li>
          ) : (
            open.map((t) => {
              const catMeta = TICKET_CATEGORIES[t.category] || TICKET_CATEGORIES.reception;
              return (
                <li
                  key={t.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-paper/80 p-4 ring-1 ring-line shadow-2xs hover:bg-paper transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${catMeta.badgeClass}`}
                      >
                        <catMeta.icon size={12} /> {catMeta.label}
                      </span>
                      <span className="text-xs font-semibold text-ink">Room {t.roomNumber}</span>
                      {t.urgency === "urgent" && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-400">
                          <Siren size={11} /> Urgent
                        </span>
                      )}
                      <span className="text-[11px] text-mute">{formatTimeAgo(t.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-ink leading-relaxed break-words">{t.details}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:self-center">
                    <button
                      type="button"
                      className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 active:scale-95 transition"
                      onClick={() => {
                        void resolveOne(propertyId, t.id).then(() => toast.success("Resolved & alert turned off"));
                      }}
                    >
                      <Check size={14} aria-hidden /> Resolve & Close
                    </button>
                  </div>
                </li>
              );
            })
          )
        ) : resolved.length === 0 ? (
          <li className="rounded-2xl bg-paper/60 p-6 text-center text-sm text-mute ring-1 ring-line">
            No resolved tickets in history yet.
          </li>
        ) : (
          resolved.slice(0, 15).map((t) => {
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
                      Resolved {t.resolvedAt ? formatTimeAgo(t.resolvedAt) : "recently"}
                    </span>
                  </div>
                  <p className="truncate text-xs text-mute mt-0.5 line-through">{t.details}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check size={12} aria-hidden /> Resolved
                </span>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
