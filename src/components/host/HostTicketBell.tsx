import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { openTicketCount, subscribePropertyTickets, type StaffTicket } from "@/lib/tickets-store";
import { enableHostTicketPush, notifyHostForeground, registerHostFcmToken, ticketPushPrefEnabled } from "@/lib/tickets-push";
import { hostWatchPropertyIds } from "@/lib/host-workspace";

export function HostTicketBell() {
  const { user, isHost, isAdmin } = useAuth();
  const [, nav] = useLocation();
  const propertyIds = hostWatchPropertyIds(user?.propertyIds, isAdmin);
  const [open, setOpen] = useState(false);
  const [byProperty, setByProperty] = useState<Record<string, StaffTicket[]>>({});
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  const canWatch = Boolean((isHost || isAdmin) && propertyIds.length);

  useEffect(() => {
    if (!canWatch) return;
    if (ticketPushPrefEnabled()) void registerHostFcmToken();
  }, [canWatch]);

  useEffect(() => {
    if (!canWatch) return;
    primed.current = false;
    seen.current = new Set();
    const unsubs = propertyIds.map((id) =>
      subscribePropertyTickets(id, (rows) => {
        setByProperty((prev) => ({ ...prev, [id]: rows }));
        const openRows = rows.filter((t) => t.status !== "resolved");
        if (!primed.current) {
          openRows.forEach((t) => seen.current.add(t.id));
          primed.current = true;
          return;
        }
        for (const ticket of openRows) {
          if (seen.current.has(ticket.id)) continue;
          seen.current.add(ticket.id);
          const title = `Room ${ticket.roomNumber}`;
          toast.message("New guest request", { description: `${title} · ${ticket.details}` });
          void notifyHostForeground(`${title} needs help`, ticket.details);
        }
      }),
    );
    return () => unsubs.forEach((fn) => fn());
  }, [canWatch, propertyIds.join("|")]);

  const tickets = useMemo(() => {
    const rows = Object.values(byProperty).flat();
    return rows
      .filter((t) => t.status !== "resolved")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [byProperty]);
  const count = openTicketCount(tickets);

  if (!canWatch) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 touch-manipulation place-items-center rounded-full text-mute hover:bg-card hover:text-ink ring-1 ring-line transition"
        aria-label={count ? `${count} open guest requests` : "Guest requests"}
        title="Guest requests"
      >
        <Bell size={16} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-2xl bg-paper shadow-lg ring-1 ring-line">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-xs font-semibold">Front desk</p>
            <button type="button" className="text-[11px] text-brand" onClick={() => void enableHostTicketPush()}>
              Enable alerts
            </button>
          </div>
          {tickets.length === 0 ? (
            <p className="px-3 pb-3 text-sm text-mute">No open requests.</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {tickets.slice(0, 8).map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      nav("/host");
                    }}
                    className="block w-full px-3 py-2 text-left hover:bg-card"
                  >
                    <p className="text-[11px] text-mute">
                      Room {t.roomNumber} · {t.category}
                      {t.urgency === "urgent" ? " · urgent" : ""}
                    </p>
                    <p className="truncate text-sm font-medium">{t.details}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
