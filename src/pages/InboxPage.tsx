import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Bell, MessageCircle, Sparkles, Building2, Store, User, Plane } from "lucide-react";
import { SegmentedControl } from "@/components/design-system/companions";
import { PingsPanel } from "@/components/social/PingsPanel";
import { usePlans } from "@/contexts/PlanContext";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { enableWebPush, markAllNotificationsRead, markNotificationRead, pushPrefEnabled } from "@/lib/notifications";
import { cn } from "@/lib/cn";
import { isUpdateNoteKind, type PromotionNotification } from "@shared/promotions";
import { notificationPresentation } from "@shared/notifications";
import { relativeAgo, smartChatTime } from "@shared/time-ago";
import { toast } from "sonner";
import { subscribeConversations, createConversationRecord, getLocalConversations } from "@/lib/chat-store";
import type { UniversalConversation, ConversationType } from "@shared/messaging";
import { AirPalChatModal } from "@/components/messaging/AirPalChatModal";
import { triggerHaptic } from "@/lib/native";

function ConversationTypeIcon({ type }: { type: ConversationType }) {
  switch (type) {
    case "ai":
      return <Sparkles size={16} className="text-amber-500" />;
    case "stay":
      return <Building2 size={16} className="text-sky-500" />;
    case "business":
      return <Store size={16} className="text-emerald-500" />;
    case "plan":
      return <Plane size={16} className="text-indigo-500" />;
    case "direct":
    default:
      return <User size={16} className="text-brand" />;
  }
}

function NotificationRows({
  rows,
  onOpen,
}: {
  rows: PromotionNotification[];
  onOpen: (n: PromotionNotification) => void;
}) {
  return (
    <ul className="mt-4 overflow-hidden rounded-[24px] bg-card ring-1 ring-line/80 shadow-xs">
      {rows.map((n, i) => {
        const when = relativeAgo(n.at);
        const presentation = notificationPresentation(n.kind);
        return (
          <li key={n.id} className={cn(i > 0 && "border-t border-line/70")}>
            <button
              type="button"
              onClick={() => void onOpen(n)}
              className="flex min-h-[44px] w-full cursor-pointer gap-3 px-4 py-3.5 text-left transition-colors hover:bg-paper/60 active:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
            >
              <span
                className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand")}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
                  {presentation.label}
                </span>
                <span className={cn("mt-0.5 block text-[15px] leading-5", n.read ? "text-ink" : "font-bold text-ink")}>
                  {n.title}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[13px] leading-5 text-mute">{n.body}</span>
              </span>
              {when ? (
                <span className="shrink-0 pt-0.5 text-[11px] font-medium text-mute">{when}</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function InboxPage() {
  const { user, authReady } = useAuth();
  const [, nav] = useLocation();
  const search = useSearch();
  const openedChat = useRef("");
  const { myPlans } = usePlans();
  const [notes, setNotes] = useState<PromotionNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [segment, setSegment] = useState<"messages" | "updates" | "pings" | "activity">("messages");
  const [markingAll, setMarkingAll] = useState(false);

  // Universal Chat State
  const [universalChats, setUniversalChats] = useState<UniversalConversation[]>([]);
  const [activeChat, setActiveChat] = useState<UniversalConversation | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);

  const tripConversations = useMemo(
    () =>
      myPlans
        .filter((p) => p.status !== "completed")
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 10),
    [myPlans],
  );
  // All hooks stay above the early returns — anything below breaks hook order
  // between the loading render and the loaded render.
  const updateNotes = useMemo(() => notes.filter((n) => isUpdateNoteKind(n.kind)), [notes]);
  const activityNotes = useMemo(() => notes.filter((n) => !isUpdateNoteKind(n.kind)), [notes]);

  // Subscribe to real-time Universal Chat conversations
  useEffect(() => {
    if (!user) {
      setUniversalChats(getLocalConversations());
      return;
    }
    const unsub = subscribeConversations(user.uid, (convs) => {
      setUniversalChats(convs);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const chatId = new URLSearchParams(search).get("chat");
    if (!chatId || openedChat.current === chatId) return;
    const conv = universalChats.find((row) => row.id === chatId);
    if (!conv) return;
    openedChat.current = chatId;
    setActiveChat(conv);
    setShowChatModal(true);
    setSegment("messages");
  }, [search, universalChats]);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !user) {
      setNotes([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "promotion_notifications"),
      where("uid", "==", user.uid),
      orderBy("at", "desc"),
      limit(40),
    );
    return onSnapshot(
      q,
      (snap) => {
        setNotes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PromotionNotification, "id">) })));
        setLoading(false);
      },
      () => {
        setNotes([]);
        setLoading(false);
      },
    );
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

  const getUnread = (c: UniversalConversation) => (user ? c.unreadCount?.[user.uid] || 0 : 0);
  const unreadUpdates = updateNotes.filter((n) => !n.read).length;
  const unreadActivity = activityNotes.filter((n) => !n.read).length;
  const unreadChats = universalChats.reduce((sum, c) => sum + getUnread(c), 0);
  const totalUnread = unreadUpdates + unreadActivity + unreadChats;

  async function openNote(n: PromotionNotification) {
    if (!n.read) {
      await markNotificationRead(n.id);
      setNotes((rows) => rows.map((row) => (row.id === n.id ? { ...row, read: true } : row)));
    }
    nav(n.href || "/plan");
  }

  async function markSegmentRead(rows: PromotionNotification[]) {
    const unreadIds = rows.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(unreadIds);
      const done = new Set(unreadIds);
      setNotes((cur) => cur.map((row) => (done.has(row.id) ? { ...row, read: true } : row)));
    } finally {
      setMarkingAll(false);
    }
  }

  async function enablePush() {
    const state = await enableWebPush();
    if (state === "granted") toast.success("Notifications on");
    else if (state === "denied") toast.error("Allow notifications in your browser settings.");
  }

  const handleOpenChat = (conv: UniversalConversation) => {
    void triggerHaptic("light");
    setActiveChat(conv);
    setShowChatModal(true);
  };

  const handleStartAiChat = () => {
    void triggerHaptic("light");
    if (!user) return;
    const aiConv = createConversationRecord({
      type: "ai",
      targetId: "airpal-ai-concierge",
      title: "AirPal AI Assistant",
      userUid: user.uid,
      userName: user.displayName || "User",
      userPhoto: user.photoURL || undefined,
    });
    setActiveChat(aiConv);
    setShowChatModal(true);
  };

  return (
    <div className="mx-auto max-w-lg px-4 pb-[max(6rem,calc(env(safe-area-inset-bottom,0px)+5rem))]">
      <div className="flex items-center justify-between pt-6">
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-tight">Inbox</h1>
          <p className="mt-1 text-[15px] text-mute">
            {totalUnread ? `${totalUnread} unread` : "Messages & notifications"}
          </p>
        </div>

        {/* Quick New Chat Button */}
        <button
          type="button"
          onClick={handleStartAiChat}
          className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand/10 px-3.5 text-xs font-bold text-brand ring-1 ring-brand/20 transition hover:bg-brand hover:text-white active:scale-95 shadow-xs"
          title="Chat with AirPal AI"
        >
          <Sparkles size={14} className="text-amber-500" />
          <span>Ask AirPal AI</span>
        </button>
      </div>

      <div className="mt-4">
        <SegmentedControl
          label="Inbox sections"
          value={segment}
          onChange={setSegment}
          options={[
            { id: "messages", label: unreadChats ? `Messages (${unreadChats})` : "Messages" },
            { id: "updates", label: unreadUpdates ? `Updates (${unreadUpdates})` : "Updates" },
            { id: "pings", label: "Pings" },
            { id: "activity", label: unreadActivity ? `Activity (${unreadActivity})` : "Activity" },
          ]}
        />
      </div>

      {segment === "pings" ? (
        <PingsPanel />
      ) : segment === "messages" ? (
        <div className="mt-4 space-y-4">
          {/* Universal Active Conversations */}
          {universalChats.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-mute">Direct &amp; AI Chats</span>
                <span className="text-[11px] font-medium text-mute">{universalChats.length} active</span>
              </div>
              <ul className="overflow-hidden rounded-[24px] bg-card ring-1 ring-line/80 shadow-xs">
                {universalChats.map((conv, i) => {
                  const unread = getUnread(conv);
                  const hasUnread = unread > 0;
                  return (
                    <li key={conv.id} className={cn(i > 0 && "border-t border-line/70")}>
                      <button
                        type="button"
                        onClick={() => handleOpenChat(conv)}
                        className="flex min-h-[56px] w-full cursor-pointer items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-paper/60 active:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                      >
                        {/* Avatar / Icon */}
                        <div className="relative shrink-0">
                          {conv.photo ? (
                            <img
                              src={conv.photo}
                              alt={conv.title}
                              className="h-11 w-11 rounded-full object-cover ring-1 ring-line"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paper ring-1 ring-line">
                              <ConversationTypeIcon type={conv.type} />
                            </div>
                          )}
                          {conv.type === "ai" && (
                            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[8px] font-black text-slate-950 ring-1 ring-white">
                              AI
                            </span>
                          )}
                        </div>

                        {/* Text details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className={cn("truncate text-[15px]", hasUnread ? "font-bold text-ink" : "font-semibold text-ink")}>
                              {conv.title}
                            </p>
                            {conv.updatedAt && smartChatTime(conv.updatedAt) ? (
                              <span className="shrink-0 text-[11px] text-mute font-medium tabular-nums">
                                {smartChatTime(conv.updatedAt)}
                              </span>
                            ) : null}
                          </div>
                          <p className={cn("mt-0.5 line-clamp-1 text-[13px]", hasUnread ? "font-semibold text-brand" : "text-mute")}>
                            {conv.lastMessage || "Start conversation"}
                          </p>
                        </div>

                        {/* Unread badge */}
                        {hasUnread && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-black tabular-nums text-white shadow-xs">
                            {unread}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Trip Plans Collaboration Chats */}
          {tripConversations.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-mute">Trip Plans Chats</span>
                <span className="text-[11px] font-medium text-mute">{tripConversations.length} trips</span>
              </div>
              <ul className="overflow-hidden rounded-[24px] bg-card ring-1 ring-line/80 shadow-xs">
                {tripConversations.map((p, i) => (
                  <li key={p.id} className={cn(i > 0 && "border-t border-line/70")}>
                    <button
                      type="button"
                      onClick={() => nav(`/plan/${p.id}`)}
                      className="flex min-h-[56px] w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition hover:bg-paper/60 active:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/10 font-display text-[15px] font-bold text-brand ring-1 ring-brand/20">
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
            </div>
          ) : universalChats.length === 0 ? (
            <div className="text-center rounded-[24px] bg-card ring-1 ring-line/80 px-4 py-10 shadow-xs">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-paper text-mute ring-1 ring-line">
                <MessageCircle size={22} className="text-brand" />
              </span>
              <p className="font-display mt-4 text-xl font-bold text-ink">No conversations yet</p>
              <p className="mx-auto mt-1 max-w-xs text-[14px] leading-relaxed text-mute">
                Start an AirPal AI chat, message your stay front desk, or invite mates to a trip.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleStartAiChat}
                  className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-4 py-2 text-xs font-bold text-white shadow-xs active:scale-95"
                >
                  Chat with AirPal AI
                </button>
                <Link href="/plan/new" className="inline-flex min-h-[44px] items-center rounded-full bg-paper px-4 py-2 text-xs font-bold text-ink ring-1 ring-line hover:bg-card active:scale-95">
                  Plan a Trip
                </Link>
              </div>
            </div>
          ) : null}

          {/* Have an invite code form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const code = new FormData(e.currentTarget).get("code");
              const norm = typeof code === "string" ? code.trim() : "";
              if (norm) nav(`/invite/${encodeURIComponent(norm)}`);
            }}
            className="flex items-center gap-2 rounded-[20px] bg-card px-4 py-3 ring-1 ring-line/80 shadow-2xs"
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
              className="min-w-0 flex-1 bg-transparent text-[16px] font-medium placeholder:text-mute focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white active:scale-95"
            >
              Join
            </button>
          </form>

          <button
            type="button"
            onClick={() => setSegment("activity")}
            className="flex min-h-[44px] w-full items-center justify-center text-center text-[14px] font-semibold text-brand hover:underline"
          >
            See activity &amp; notifications →
          </button>
        </div>
      ) : segment === "activity" ? (
        <>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-mute">Activity</p>
            {activityNotes.length > 0 && (
              <button
                type="button"
                disabled={markingAll || unreadActivity === 0}
                onClick={() => void markSegmentRead(activityNotes)}
                className="-my-3 inline-flex min-h-[44px] items-center text-[13px] font-bold text-brand disabled:opacity-40"
              >
                {markingAll ? "Marking…" : "Mark all read"}
              </button>
            )}
          </div>

          {!pushPrefEnabled() && (
            <button
              type="button"
              onClick={() => void enablePush()}
              className="mt-3 w-full rounded-[20px] bg-brand/10 px-4 py-3.5 text-left ring-1 ring-brand/20 transition hover:bg-brand/15 active:scale-95"
            >
              <span className="block text-[15px] font-semibold text-brand">Turn on alerts</span>
              <span className="block text-[13px] text-mute">Giveaways, rewards, messages, and plan updates.</span>
            </button>
          )}

          {activityNotes.length === 0 ? (
            <div className="mt-10 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-paper text-mute ring-1 ring-line">
                <Bell size={22} className="text-brand" />
              </span>
              <p className="font-display mt-4 text-xl font-bold text-ink">Nothing yet</p>
              <p className="mx-auto mt-1 max-w-xs text-[14px] leading-relaxed text-mute">
                Catch-ups, meetings, waves, and deals land here as they happen.
              </p>
              <Link
                href="/deals"
                className="mt-5 inline-flex min-h-[44px] items-center text-[14px] font-bold text-brand hover:underline"
              >
                Browse deals
              </Link>
            </div>
          ) : (
            <NotificationRows rows={activityNotes} onOpen={openNote} />
          )}
        </>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-mute">Updates from AirPal</p>
            {updateNotes.length > 0 && (
              <button
                type="button"
                disabled={markingAll || unreadUpdates === 0}
                onClick={() => void markSegmentRead(updateNotes)}
                className="-my-3 inline-flex min-h-[44px] items-center text-[13px] font-bold text-brand disabled:opacity-40"
              >
                {markingAll ? "Marking…" : "Mark all read"}
              </button>
            )}
          </div>

          {updateNotes.length === 0 ? (
            <div className="mt-10 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-paper text-mute ring-1 ring-line">
                <Sparkles size={22} className="text-brand" />
              </span>
              <p className="font-display mt-4 text-xl font-bold text-ink">No updates yet</p>
              <p className="mx-auto mt-1 max-w-xs text-[14px] leading-relaxed text-mute">
                News from AirPal — features, safety notices, city launches — lands here.
              </p>
            </div>
          ) : (
            <NotificationRows rows={updateNotes} onOpen={openNote} />
          )}
        </>
      )}

      {/* Universal AirPal Chat Modal */}
      <AirPalChatModal
        open={showChatModal}
        onClose={() => {
          setShowChatModal(false);
          setActiveChat(null);
        }}
        conversation={activeChat}
      />
    </div>
  );
}

