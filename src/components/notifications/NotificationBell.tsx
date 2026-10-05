import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { enableWebPush, listenForegroundPush, markNotificationRead, pushPrefEnabled } from "@/lib/notifications";
import { openTicketCount, subscribePropertyTickets, type StaffTicket } from "@/lib/tickets-store";
import { enableHostTicketPush, notifyHostForeground, ticketPushPrefEnabled } from "@/lib/tickets-push";
import { hostWatchPropertyIds } from "@/lib/host-workspace";
import { isNativeApp, triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";
import type { PromotionNotification } from "@shared/promotions";
import { relativeAgo } from "@shared/time-ago";

/**
 * The one header bell: inbox notifications for everyone, plus the
 * front-desk (guest requests) section for hosts and admins.
 */
export function NotificationBell() {
  const { user, isHost, isAdmin } = useAuth();
  const [path, nav] = useLocation();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<PromotionNotification[]>([]);
  const [enabling, setEnabling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [path]);

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
      query(collection(db, "promotion_notifications"), where("uid", "==", user.uid), orderBy("at", "desc"), limit(10)),
    )
      .then((snap) =>
        setNotes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PromotionNotification, "id">) }))),
      )
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
    return rows.filter((t) => t.status !== "resolved").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
      else
        toast.message(
          isNativeApp()
            ? "Native push configures on first install."
            : "Push isn't supported here — your inbox still works.",
        );
    } finally {
      setEnabling(false);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          void triggerHaptic("light");
          setOpen((v) => !v);
        }}
        className="relative grid h-9 w-9 touch-manipulation place-items-center rounded-full text-brand hover:bg-card ring-1 ring-line transition-transform active:scale-95 after:absolute after:-inset-1.5 after:content-['']"
        aria-label={total ? `${total} unread notifications` : "Notifications"}
        title="Notifications"
      >
        {total > 0 ? <BellRing size={16} className="text-brand" /> : <Bell size={16} className="text-brand" />}
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-96 w-[22rem] max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-3xl bg-card/95 shadow-2xl ring-1 ring-line/80 backdrop-blur-2xl">
          {canWatch && (
            <>
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-[13px] font-semibold">Front desk {openTickets > 0 && `(${openTickets})`}</p>
                <button
                  type="button"
                  className="text-[13px] font-semibold text-brand"
                  onClick={() => {
                    setOpen(false);
                    nav("/host");
                  }}
                >
                  Host
                </button>
              </div>
              {tickets.length === 0 ? (
                <p className="px-4 pb-3 text-[13px] text-mute">No open guest requests.</p>
              ) : (
                tickets.slice(0, 4).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      nav("/host");
                    }}
                    className="block w-full border-t border-line/60 px-4 py-2.5 text-left"
                  >
                    <p className="text-[12px] text-mute">
                      Room {t.roomNumber} · {t.category}
                      {t.urgency === "urgent" ? " · urgent" : ""}
                    </p>
                    <p className="truncate text-[14px] font-medium">{t.details}</p>
                  </button>
                ))
              )}
            </>
          )}
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[13px] font-semibold">Notifications</p>
            <Link href="/me/inbox" onClick={() => setOpen(false)} className="text-[13px] font-semibold text-brand">
              Inbox
            </Link>
          </div>
          {notes.length === 0 && (
            <p className="px-4 pb-4 text-[13px] text-mute">Circle announcements and plan updates land here.</p>
          )}
          {notes.map((n) => (
            <Link
              key={n.id}
              href={n.href || "/me/inbox"}
              onClick={() => {
                if (!n.read) void markNotificationRead(n.id);
                setOpen(false);
              }}
              className="block border-t border-line/60 px-4 py-2.5"
            >
              <span className="flex items-baseline justify-between gap-2">
                <p className={cn("min-w-0 flex-1 truncate text-[14px] leading-5", n.read ? "text-ink" : "font-semibold")}>
                  {n.title}
                </p>
                {relativeAgo(n.at) ? (
                  <span className="shrink-0 text-[11px] text-mute">{relativeAgo(n.at)}</span>
                ) : null}
              </span>
              <p className="mt-0.5 line-clamp-2 text-[12px] text-mute">{n.body}</p>
            </Link>
          ))}
          {!pushPrefEnabled() && (
            <div className="border-t border-line/60 p-3">
              <button
                type="button"
                onClick={enable}
                disabled={enabling}
                className="w-full rounded-full bg-brand px-3 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {enabling ? "Enabling…" : "Turn on alerts"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
