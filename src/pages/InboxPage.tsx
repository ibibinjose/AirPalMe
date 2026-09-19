import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Bell } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { enableWebPush, markNotificationRead, pushPrefEnabled } from "@/lib/notifications";
import { cn } from "@/lib/cn";
import type { PromotionNotification } from "@shared/promotions";
import { toast } from "sonner";

export function InboxPage() {
  const { user, authReady } = useAuth();
  const [, nav] = useLocation();
  const [notes, setNotes] = useState<PromotionNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !user) {
      setNotes([]);
      setLoading(false);
      return;
    }
    void getDocs(
      query(collection(db, "promotion_notifications"), where("uid", "==", user.uid), orderBy("at", "desc"), limit(40)),
    )
      .then((snap) =>
        setNotes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PromotionNotification, "id">) }))),
      )
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (!authReady || loading) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-mute">Loading…</div>;
  }
  if (!user) {
    return (
      <AuthGate
        next="/me/inbox"
        kicker="Notifications"
        title="Your inbox"
        lede="Announcements from Circles you follow, plans, and results — in one quiet list."
      />
    );
  }

  const unread = notes.filter((n) => !n.read).length;

  async function openNote(n: PromotionNotification) {
    if (!n.read) {
      await markNotificationRead(n.id);
      setNotes((rows) => rows.map((row) => (row.id === n.id ? { ...row, read: true } : row)));
    }
    nav(n.href || "/circle");
  }

  async function enablePush() {
    const state = await enableWebPush();
    if (state === "granted") toast.success("Notifications on");
    else if (state === "denied") toast.error("Allow notifications in your browser settings.");
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-12">
      <p className="pt-6 text-[13px] font-semibold text-mute">Notifications</p>
      <h1 className="font-display mt-1 text-[32px] font-bold tracking-tight">Inbox</h1>
      <p className="mt-1 text-[15px] text-mute">{unread ? `${unread} new` : "You're up to date."}</p>

      {!pushPrefEnabled() && (
        <button
          type="button"
          onClick={() => void enablePush()}
          className="mt-5 w-full rounded-[20px] bg-brand/10 px-4 py-3.5 text-left"
        >
          <span className="block text-[15px] font-semibold text-brand">Turn on alerts</span>
          <span className="block text-[13px] text-mute">Circle announcements and plan updates.</span>
        </button>
      )}

      {notes.length === 0 ? (
        <div className="mt-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-paper text-mute">
            <Bell size={22} />
          </span>
          <p className="font-display mt-4 text-xl font-semibold">Nothing yet</p>
          <p className="mx-auto mt-1 max-w-xs text-[15px] leading-6 text-mute">
            When someone in your Circle announces, or a plan updates, it lands here.
          </p>
          <Link href="/circle" className="mt-5 inline-block text-[15px] font-semibold text-brand">
            Open Circle
          </Link>
        </div>
      ) : (
        <ul className="mt-6 overflow-hidden rounded-[20px] bg-card ring-1 ring-line/80">
          {notes.map((n, i) => (
            <li key={n.id} className={cn(i > 0 && "border-t border-line/70")}>
              <button
                type="button"
                onClick={() => void openNote(n)}
                className="flex w-full gap-3 px-4 py-3.5 text-left"
              >
                <span
                  className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand")}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[15px] leading-5", n.read ? "text-ink" : "font-semibold text-ink")}>
                    {n.title}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[13px] leading-5 text-mute">{n.body}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
