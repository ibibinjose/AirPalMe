import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { enableWebPush, listenForegroundPush, pushPrefEnabled } from "@/lib/notifications";
import { openTicketCount, subscribePropertyTickets, type StaffTicket } from "@/lib/tickets-store";
import { enableHostTicketPush, notifyHostForeground, ticketPushPrefEnabled } from "@/lib/tickets-push";
import { hostWatchPropertyIds } from "@/lib/host-workspace";
import { isNativeApp } from "@/lib/native";
import { cn } from "@/lib/cn";
import type { PromotionNotification } from "@shared/promotions";

/**
 * The one header bell: inbox notifications for everyone, plus the
 * front-desk (guest requests) section for hosts and admins.
 */
export function NotificationBell() {
  const { user, isHost, isAdmin } = useAuth();
  const [, nav] = useLocation();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<PromotionNotification[]>([]);
  const [enabling, setEnabling] = useState(false);

  // Front desk (hosts/admins only)
  const propertyIds = hostWatchPropertyIds(user?.propertyIds, isAdmin);
  const [byProperty, setByProperty] = useState<Record<string, StaffTicket[]>>({});
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  const canWatch = Boolean(user && (isHost || isAdmin) && propertyIds.length);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !user) {
      setNotes([]);
      return;
    }
    void getDocs(
      query(
        collection(db, "promotion_notifications"),
        where("uid", "==", user.uid),
        orderBy("at", "desc"),
        limit(10),
      ),
    )
      .then((snap) => setNotes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PromotionNotification, "id">) }))))
      .catch(() => setNotes([]));
  }, [user]);

  useEffect(
    () =>
      listenForegroundPush((title, body) => {
        toast.message(title, { description: body });
      }),
    [],
  );

  useEffect(() => {
    if (!canWatch) return;
    if (ticketPushPrefEnabled()) void enableHostTicketPush();
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
          toast.message("New guest request", { description: `Room ${ticket.roomNumber} · ${ticket.details}` });
          void notifyHostForeground(`Room ${ticket.roomNumber} needs help`, ticket.details);
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

  if (!user) return null;
  const unread = notes.filter((n) => !n.read).length;
  const openTickets = openTicketCount(tickets);
  const total = unread + openTickets;

  async function enable() {
    setEnabling(true);
    try {
      const state = await enableWebPush();
      if (state === "granted") toast.success("Notifications on — results and winners will find you.");
      else if (state === "denied") toast.error("Notifications blocked — allow them in your browser settings.");
      else toast.message(isNativeApp() ? "Native push configures on first install." : "Push isn't supported here — your inbox still works.");
    } finally {
      setEnabling(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 touch-manipulation place-items-center rounded-full text-mute hover:bg-card hover:text-ink ring-1 ring-line transition"
        aria-label={total ? `${total} unread notifications` : "Notifications"}
        title="Notifications"
      >
        {total > 0 ? <BellRing size={16} className="text-brand" /> : <Bell size={16} />}
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl bg-paper shadow-lg ring-1 ring-line">
          {canWatch && (
            <>
              <div className="flex items-center justify-between px-3 py-2">
                <p className="text-xs font-semibold">Front desk {openTickets > 0 && `(${openTickets})`}</p>
                <button type="button" className="text-[11px] text-brand" onClick={() => { setOpen(false); nav("/host"); }}>
                  Open host tools
                </button>
              </div>
              {tickets.length === 0 ? (
                <p className="px-3 pb-2 text-xs text-mute">No open guest requests.</p>
              ) : (
                tickets.slice(0, 4).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setOpen(false); nav("/host"); }}
                    className="block w-full border-t border-line/60 px-3 py-2 text-left hover:bg-card"
                  >
                    <p className="text-[11px] text-mute">
                      Room {t.roomNumber} · {t.category}
                      {t.urgency === "urgent" ? " · urgent" : ""}
                    </p>
                    <p className="truncate text-xs font-medium">{t.details}</p>
                  </button>
                ))
              )}
            </>
          )}
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-xs font-semibold">Notifications</p>
            <Link href="/me/giveaways" onClick={() => setOpen(false)} className="text-[11px] font-bold text-brand hover:underline">
              Open inbox
            </Link>
          </div>
          {notes.length === 0 && (
            <p className="px-3 pb-3 text-xs text-mute">Nothing yet. Giveaway results and campaign news land here.</p>
          )}
          {notes.map((n) => (
            <Link key={n.id} href={n.href || "/me/giveaways"} onClick={() => setOpen(false)} className="block border-t border-line/60 px-3 py-2 hover:bg-card">
              <p className={cn("text-xs", n.read ? "font-medium text-mute" : "font-bold")}>{n.title}</p>
              <p className="line-clamp-2 text-[11px] text-mute">{n.body}</p>
            </Link>
          ))}
          {!pushPrefEnabled() && (
            <div className="border-t border-line/60 p-3">
              <button
                type="button"
                onClick={enable}
                disabled={enabling}
                className="w-full rounded-xl bg-ink px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {enabling ? "Enabling…" : "Turn on push notifications"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
