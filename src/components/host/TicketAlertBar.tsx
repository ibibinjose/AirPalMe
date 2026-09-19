import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Siren, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { hostWatchPropertyIds } from "@/lib/host-workspace";
import { subscribePropertyTickets, type StaffTicket } from "@/lib/tickets-store";
import { summarizeOpenTickets } from "@/lib/ticket-alert";
import { playTicketAlarm, setTicketSoundEnabled, ticketSoundEnabled } from "@/lib/ticket-alert-sound";

/**
 * Red blinking top alert while this host's own properties have open guest
 * tickets. Scoped per business: it only subscribes to the signed-in host's
 * propertyIds, so a ticket at one hotel never alerts another hotel's desk.
 * The banner clears itself when every ticket is resolved. The alarm sounds
 * once per new ticket, never on re-render.
 */
export function TicketAlertBar() {
  const { user, isHost, isAdmin } = useAuth();
  const [, nav] = useLocation();
  const propertyIds = hostWatchPropertyIds(user?.propertyIds, isAdmin);
  const canWatch = Boolean(user && (isHost || isAdmin) && propertyIds.length);
  const [byProperty, setByProperty] = useState<Record<string, StaffTicket[]>>({});
  const [soundOn, setSoundOn] = useState(() => ticketSoundEnabled());
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  const key = propertyIds.join("|");

  useEffect(() => {
    if (!canWatch) return;
    primed.current = false;
    seen.current = new Set();
    const unsubs = propertyIds.map((id) =>
      subscribePropertyTickets(id, (rows) => {
        setByProperty((prev) => ({ ...prev, [id]: rows }));
        const open = rows.filter((t) => t.status !== "resolved");
        if (!primed.current) {
          open.forEach((t) => seen.current.add(t.id));
          primed.current = true;
          return;
        }
        for (const ticket of open) {
          if (seen.current.has(ticket.id)) continue;
          seen.current.add(ticket.id);
          if (ticketSoundEnabled()) playTicketAlarm();
        }
      }),
    );
    return () => unsubs.forEach((fn) => fn());
  }, [canWatch, key]);

  const summary = useMemo(() => summarizeOpenTickets(byProperty), [byProperty]);

  if (!canWatch || summary.openCount === 0) return null;

  const latest = summary.latest;
  const scope =
    summary.propertyCount > 1
      ? `across ${summary.propertyCount} places`
      : latest?.propertyId
        ? `· Room ${latest.roomNumber}`
        : "";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="ticket-alert-blink flex items-center justify-between gap-2 bg-red-600 px-3 py-2 text-white sm:px-4"
    >
      <button
        type="button"
        onClick={() => nav("/host")}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        title="Open front desk"
      >
        <Siren size={18} className="shrink-0" aria-hidden />
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight">
            {summary.openCount} open guest request{summary.openCount === 1 ? "" : "s"} {scope}
            {summary.urgentCount > 0 ? " · URGENT" : ""}
          </span>
          {latest ? <span className="block truncate text-[12px] text-white/90">{latest.details}</span> : null}
        </span>
      </button>
      <span className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            const next = !soundOn;
            setSoundOn(next);
            setTicketSoundEnabled(next);
            if (next) playTicketAlarm();
          }}
          className="grid h-8 w-8 place-items-center rounded-full text-white hover:bg-white/15"
          aria-label={soundOn ? "Mute ticket alarm" : "Unmute ticket alarm"}
          title={soundOn ? "Mute alarm (banner stays until resolved)" : "Unmute alarm"}
        >
          {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        <button
          type="button"
          onClick={() => nav("/host")}
          className="h-8 rounded-full bg-white px-3 text-[12px] font-bold text-red-700"
        >
          View
        </button>
      </span>
    </div>
  );
}
