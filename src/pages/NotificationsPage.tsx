import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ArrowLeft, Calendar, CheckCheck, Ticket, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBookings } from "@/hooks/useMyBookings";
import { useEvents } from "@/contexts/EventsContext";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

type NotificationCategory = "all" | "events" | "passes" | "profile";

interface SystemNotificationItem {
  id: string;
  category: "events" | "passes" | "profile";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  actionUrl: string;
  actionLabel: string;
}

export function NotificationsPage() {
  const { user } = useAuth();
  const { upcomingBookings } = useMyBookings();
  const { calendarEvents } = useEvents();

  const [activeFilter, setActiveFilter] = useState<NotificationCategory>("all");
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("airpal_read_notif_ids");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Synthesize notifications from real user passes, calendar events, and profile activity
  const items = useMemo<SystemNotificationItem[]>(() => {
    const list: SystemNotificationItem[] = [];

    // 1. Pass status changes & Apple Wallet alerts
    if (upcomingBookings.length > 0) {
      upcomingBookings.slice(0, 3).forEach((b) => {
        list.push({
          id: `pass-${b.id}`,
          category: "passes",
          title: "Pass Confirmed & Ready",
          description: `Your ticket pass for ${b.title} is confirmed. Dynamic QR is ready for gate check-in.`,
          timestamp: "Just now",
          read: readIds.has(`pass-${b.id}`),
          actionUrl: `/ticket/${b.id}`,
          actionLabel: "View Ticket Pass",
        });
      });
    }

    // 2. Upcoming event reminders
    const upcomingEvents = calendarEvents.filter((e) => e.isGoing || e.isInterested).slice(0, 3);
    upcomingEvents.forEach((ev) => {
      list.push({
        id: `event-${ev.id}`,
        category: "events",
        title: `Upcoming: ${ev.title}`,
        description: `Starts on ${ev.date} at ${ev.venue || ev.city || "Venue"}. Check directions and dress code.`,
        timestamp: "Tomorrow",
        read: readIds.has(`event-${ev.id}`),
        actionUrl: `/e/${ev.id}`,
        actionLabel: "Event Details",
      });
    });

    // 3. Profile & Circle activity
    if (user) {
      list.push({
        id: "profile-circle-welcome",
        category: "profile",
        title: "Circle Activity & Presence",
        description: "Your digital bio is active. Friends in your Circle can see when you check in at partner venues.",
        timestamp: "Yesterday",
        read: readIds.has("profile-circle-welcome"),
        actionUrl: "/circle",
        actionLabel: "View Circle",
      });

      list.push({
        id: "profile-calendar-sync",
        category: "profile",
        title: "Calendar Sync Available",
        description: "Sync your joined events and hangouts directly with Google Calendar & Apple Calendar (.ics).",
        timestamp: "2 days ago",
        read: readIds.has("profile-calendar-sync"),
        actionUrl: "/account-sync",
        actionLabel: "Manage Sync",
      });
    }

    // Fallback welcoming notification
    if (list.length === 0) {
      list.push({
        id: "notif-welcome",
        category: "events",
        title: "Welcome to AirPal!",
        description: "Discover live concerts, cultural festivals, and member dining perks near you.",
        timestamp: "Now",
        read: readIds.has("notif-welcome"),
        actionUrl: "/events",
        actionLabel: "Explore Events",
      });
    }

    return list;
  }, [upcomingBookings, calendarEvents, user, readIds]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    return items.filter((it) => it.category === activeFilter);
  }, [items, activeFilter]);

  const unreadCount = useMemo(() => {
    return items.filter((it) => !it.read).length;
  }, [items]);

  const markAllAsRead = () => {
    void triggerHaptic("medium");
    const all = new Set(items.map((i) => i.id));
    setReadIds(all);
    try {
      localStorage.setItem("airpal_read_notif_ids", JSON.stringify(Array.from(all)));
    } catch {
      /* ignore */
    }
    toast.success("All notifications marked as read.");
  };

  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem("airpal_read_notif_ids", JSON.stringify(Array.from(next)));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-32 md:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Link
            href="/me"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute hover:text-ink ring-1 ring-line hover:bg-paper transition"
          >
            <ArrowLeft size={14} />
            <span>Profile</span>
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Activity</span>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-3.5 text-xs font-semibold text-accent ring-1 ring-line hover:bg-card transition cursor-pointer"
          >
            <CheckCheck size={14} />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-white shadow-xs">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-mute">Event reminders, passbook updates, and activity on your profile.</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {[
          { id: "all" as const, label: "All" },
          { id: "events" as const, label: "Event Reminders" },
          { id: "passes" as const, label: "Pass Status" },
          { id: "profile" as const, label: "Profile & Circle" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              void triggerHaptic("selection");
              setActiveFilter(tab.id);
            }}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-semibold ring-1 transition cursor-pointer",
              activeFilter === tab.id
                ? "bg-brand text-white ring-brand shadow-xs"
                : "bg-card text-mute ring-line hover:text-ink hover:bg-paper",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="mt-6 space-y-3">
        {filteredItems.map((item) => {
          return (
            <div
              key={item.id}
              className={cn(
                "relative flex flex-col justify-between rounded-3xl p-4.5 ring-1 transition shadow-xs",
                item.read
                  ? "bg-card ring-line/80 opacity-90"
                  : "bg-card ring-brand/40 border-l-4 border-l-brand bg-brand/[0.02]",
              )}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1",
                    item.category === "passes"
                      ? "bg-sky-500/10 text-sky-600 ring-sky-500/20"
                      : item.category === "events"
                        ? "bg-accent/10 text-accent ring-accent/20"
                        : "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
                  )}
                >
                  {item.category === "passes" ? (
                    <Ticket size={18} />
                  ) : item.category === "events" ? (
                    <Calendar size={18} />
                  ) : (
                    <Users size={18} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display truncate text-sm font-bold text-ink">{item.title}</span>
                    <span className="text-[11px] text-mute shrink-0">{item.timestamp}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink/75">{item.description}</p>
                </div>
              </div>

              <div className="mt-3.5 flex items-center justify-between border-t border-line/60 pt-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
                  {item.category === "passes" ? "Passbook" : item.category === "events" ? "Event Alert" : "Circle"}
                </span>

                <div className="flex items-center gap-2">
                  <Link
                    href={item.actionUrl}
                    onClick={() => markAsRead(item.id)}
                    className="inline-flex min-h-[36px] items-center rounded-full bg-paper px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card hover:text-brand transition"
                  >
                    <span>{item.actionLabel}</span>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
