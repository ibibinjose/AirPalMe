import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ArrowLeft, Calendar, CheckCircle2, Copy, ExternalLink, Laptop, RefreshCw, Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEvents } from "@/contexts/EventsContext";
import { getGoogleCalendarUrl, downloadMultipleIcs } from "@/lib/calendar-export";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

export function AccountSyncPage() {
  const { user } = useAuth();
  const { calendarEvents } = useEvents();

  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [contactsSyncEnabled, setContactsSyncEnabled] = useState(() => {
    try {
      return localStorage.getItem("airpal_contacts_sync") === "true";
    } catch {
      return false;
    }
  });

  const [lastSynced, setLastSynced] = useState<string>("Just now");

  // User's joined events and hangouts (Huddles)
  const syncableEvents = useMemo(() => {
    const list = calendarEvents.filter((e) => e.isGoing || e.isInterested);
    return list.slice(0, 5);
  }, [calendarEvents]);

  const webcalUrl = useMemo(() => {
    const uid = user?.uid || "guest";
    return `webcal://airpal.me/api/calendar/feed?uid=${uid}`;
  }, [user?.uid]);

  // Handle Google Calendar 1-tap Sync
  const handleGoogleCalendarSync = () => {
    void triggerHaptic("medium");
    setGoogleSyncing(true);

    if (syncableEvents.length === 0) {
      toast.info("No joined events to sync yet. RSVP to an event or hangout first!");
      setGoogleSyncing(false);
      return;
    }

    // Open Google Calendar compose for the primary upcoming event
    const firstEvent = syncableEvents[0];
    if (firstEvent) {
      const gcalUrl = getGoogleCalendarUrl(firstEvent);
      window.open(gcalUrl, "_blank", "noopener,noreferrer");
      setLastSynced("Today, " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      toast.success(`Opening Google Calendar for "${firstEvent.title}"!`);
    }

    setGoogleSyncing(false);
  };

  // Handle Apple / Outlook ICS Export
  const handleIcsExport = () => {
    void triggerHaptic("medium");
    if (syncableEvents.length === 0) {
      toast.info("No saved events to export. Mark an event as Going or Interested first.");
      return;
    }
    downloadMultipleIcs(syncableEvents, `airpal-schedule-${Date.now().toString().slice(-4)}.ics`);
    toast.success(`Exported ${syncableEvents.length} events to Apple Calendar (.ics)!`);
  };

  const handleCopyWebcal = () => {
    void triggerHaptic("light");
    void navigator.clipboard?.writeText(webcalUrl).then(
      () => toast.success("Live calendar subscription URL copied to clipboard!"),
      () => toast.error("Could not copy URL."),
    );
  };

  const toggleContactsSync = () => {
    void triggerHaptic("light");
    setContactsSyncEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("airpal_contacts_sync", String(next));
      } catch {
        /* ignore */
      }
      toast.success(next ? "Contacts matching enabled" : "Contacts access paused");
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-32 md:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute hover:text-ink ring-1 ring-line hover:bg-paper transition"
          >
            <ArrowLeft size={14} />
            <span>Settings</span>
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Integrations</span>
        </div>

        <Link
          href="/calendar"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition"
        >
          <Calendar size={14} className="text-accent" />
          <span>View In-App Calendar</span>
        </Link>
      </div>

      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Account &amp; Calendar Sync</h1>
        <p className="mt-1 text-sm text-mute">
          Manage integrations with external schedules and address book contacts so your plans stay in sync.
        </p>
      </div>

      {/* Sync Status Banner */}
      <div className="mt-6 flex items-center justify-between rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-500/20">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-emerald-900">External Sync Engine Active</p>
            <p className="text-[11px] text-emerald-700">Last synced: {lastSynced}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleCalendarSync}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
        >
          <RefreshCw size={12} className={googleSyncing ? "animate-spin" : ""} />
          <span>Sync Now</span>
        </button>
      </div>

      <div className="mt-8 space-y-6">
        {/* Section 1: Google Calendar Integration */}
        <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20">
                <Calendar size={24} />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-ink">Google Calendar</h2>
                <p className="text-xs text-mute">
                  Sync joined Huddles, professional mixers, and festival passes directly to Google.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleCalendarSync}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-brand px-5 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition active:scale-95 cursor-pointer shrink-0"
            >
              <ExternalLink size={14} />
              <span>Sync with Google Calendar</span>
            </button>
          </div>

          <div className="mt-4 border-t border-line/60 pt-4 text-xs text-mute">
            <p>
              When synced, AirPal creates verified calendar entries with event addresses, door opening times, and 1-tap
              passbook links.
            </p>
          </div>
        </div>

        {/* Section 2: Apple Calendar & Outlook ICS */}
        <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-paper text-ink ring-1 ring-line">
                <Laptop size={24} />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-ink">Apple Calendar &amp; Outlook (.ics)</h2>
                <p className="text-xs text-mute">
                  Export your active schedule to macOS, iOS Calendar, or Microsoft 365.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleIcsExport}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition cursor-pointer shrink-0"
            >
              <span>Download .ics File</span>
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-paper p-3 ring-1 ring-line/70">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-mute truncate">{webcalUrl}</span>
              <button
                type="button"
                onClick={handleCopyWebcal}
                className="inline-flex min-h-[32px] items-center gap-1 rounded-lg bg-card px-2.5 text-xs font-medium text-accent ring-1 ring-line hover:bg-paper transition shrink-0 cursor-pointer"
              >
                <Copy size={12} />
                <span>Copy Feed URL</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Contacts Sync */}
        <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-xs">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20">
                <Smartphone size={24} />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-ink">Device Contacts Matching</h2>
                <p className="text-xs text-mute">
                  Identify friends with registered AirPal bios to quickly invite them to hangouts.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleContactsSync}
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                contactsSyncEnabled ? "bg-brand" : "bg-line",
              )}
              role="switch"
              aria-checked={contactsSyncEnabled}
              aria-label="Toggle contacts sync"
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-1 ml-1",
                  contactsSyncEnabled ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
