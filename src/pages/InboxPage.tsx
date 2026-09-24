import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Bell, MessageCircle } from "lucide-react";
import { SegmentedControl } from "@/components/design-system/companions";
import { PingsPanel } from "@/components/social/PingsPanel";
import { usePlans } from "@/contexts/PlanContext";
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
  const { myPlans } = usePlans();
  const [notes, setNotes] = useState<PromotionNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [segment, setSegment] = useState<"messages" | "pings" | "activity">("messages");

  const conversations = useMemo(
    () =>
      myPlans
        .filter((p) => p.status !== "completed")
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 10),
    [myPlans],
  );

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
      <h1 className="font-display pt-6 text-[28px] font-bold tracking-tight">Inbox</h1>
      <p className="mt-1 text-[15px] text-mute">
        Messages, invitations and trip collaboration — {unread ? `${unread} new` : "you're up to date."}
      </p>
      <div className="mt-4">
        <SegmentedControl
          label="Inbox sections"
          value={segment}
          onChange={setSegment}
          options={[
            { id: "messages", label: "Messages" },
            { id: "pings", label: "Pings" },
            { id: "activity", label: "Activity" },
          ]}
        />
      </div>

      {segment === "pings" ? (
        <PingsPanel />
      ) : segment === "messages" ? (
        <div className="mt-4">
          {conversations.length === 0 ? (
            <div className="mt-2 text-center rounded-[20px] bg-card ring-1 ring-line/80 px-4 py-10">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-paper text-mute">
                <MessageCircle size={22} />
              </span>
              <p className="font-display mt-4 text-xl font-semibold">No conversations yet</p>
              <p className="mx-auto mt-1 max-w-xs text-[15px] leading-6 text-mute">
                Messages live inside trip plans and Circle threads — plan something together to start.
              </p>
              <div className="mt-5 flex justify-center gap-4">
                <Link href="/plan/new" className="text-[15px] font-semibold text-brand">
                  Plan a Trip
                </Link>
                <Link href="/circle" className="text-[15px] font-semibold text-brand">
                  Open Circle
                </Link>
              </div>
            </div>
          ) : (
            <ul className="mt-2 overflow-hidden rounded-[20px] bg-card ring-1 ring-line/80">
              {conversations.map((p, i) => (
                <li key={p.id} className={cn(i > 0 && "border-t border-line/70")}>
                  <button
                    type="button"
                    onClick={() => nav(`/plan/${p.id}`)}
                    className="flex w-full gap-3 px-4 py-3.5 text-left"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 font-display text-[15px] font-bold text-brand">
                      {p.title.trim()[0]?.toUpperCase() || "•"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink">{p.title}</span>
                      <span className="mt-0.5 block truncate text-[13px] text-mute">
                        {p.destination || p.city || "Trip chat"}
                        {p.attendees?.length ? ` · ${p.attendees.length} going` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const code = new FormData(e.currentTarget).get("code");
              const norm = typeof code === "string" ? code.trim() : "";
              if (norm) nav(`/invite/${encodeURIComponent(norm)}`);
            }}
            className="mt-3 flex items-center gap-2 rounded-[20px] bg-card px-4 py-3 ring-1 ring-line/80"
          >
            <label htmlFor="invite-code" className="shrink-0 text-[13px] font-semibold text-mute">
              Have an invite?
            </label>
            <input
              id="invite-code"
              name="code"
              type="text"
              autoComplete="off"
              placeholder="Enter code"
              aria-label="Enter trip invite code"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-medium placeholder:text-mute focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 cursor-pointer rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white active:scale-95"
            >
              Join
            </button>
          </form>
          <button
            type="button"
            onClick={() => setSegment("activity")}
            className="mt-4 w-full text-center text-[14px] font-semibold text-brand"
          >
            See activity →
          </button>
        </div>
      ) : (
      <>
      <p className="mt-4 text-[13px] font-semibold text-mute">Activity</p>

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
      </>
      )}
    </div>
  );
}
