import { useState } from "react";
import { Link } from "wouter";
import { Calendar, RefreshCw, Ticket, UserRound, WifiOff } from "lucide-react";
import { PageLoading } from "@/components/ui/PageLoading";
import { AirPalTicketPass } from "@/components/tickets/AirPalTicketPass";
import { EcosystemSwitcher } from "@/components/brand/EcosystemSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBookings } from "@/hooks/useMyBookings";
import { triggerHapticSelection } from "@/lib/native";
import { cn } from "@/lib/cn";

type FilterTab = "upcoming" | "past" | "all";

/**
 * AirPal Wallet — every ticket the guest holds, in one place.
 * Powered by unified AirPal account, offline resilient, with 1-tap day planning.
 */
export function MyTicketsPage() {
  const { user } = useAuth();
  const { bookings, upcomingBookings, pastBookings, loading, failed, isOfflineCached, refresh } = useMyBookings();
  const [tab, setTab] = useState<FilterTab>("upcoming");

  if (loading) return <PageLoading />;

  const displayList =
    tab === "upcoming" ? upcomingBookings : tab === "past" ? pastBookings : bookings;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-4 md:px-6 md:pt-6">
      {/* Ecosystem Lens Switcher */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <EcosystemSwitcher currentPath="/me/tickets" variant="header" />
        <div className="flex items-center gap-2">
          <Link
            href="/me"
            className="no-print inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-semibold text-mute ring-1 ring-line hover:bg-paper hover:text-ink transition"
          >
            <UserRound size={14} className="text-accent" />
            <span>Me Cockpit</span>
          </Link>
          <Link
            href="/calendar"
            className="no-print inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-semibold text-mute ring-1 ring-line hover:bg-paper hover:text-ink transition"
          >
            <Calendar size={14} className="text-accent" />
            <span>Calendar</span>
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">AirPal Pass · Wallet</p>
          <h1 className="mt-0.5 font-display text-3xl font-bold text-ink">My event passes &amp; tickets</h1>
        </div>
        {user && (
          <button
            type="button"
            onClick={() => {
              void triggerHapticSelection();
              refresh();
            }}
            aria-label="Refresh tickets"
            title="Refresh tickets"
            className="no-print grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card ring-1 ring-line text-mute hover:text-ink hover:bg-paper transition active:scale-95"
          >
            <RefreshCw size={15} />
          </button>
        )}
      </div>

      {isOfflineCached && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-amber-900 ring-1 ring-amber-500/20">
          <WifiOff size={14} className="shrink-0 text-amber-600" />
          <span>Offline mode · Showing tickets cached on your device. Ready to scan at the gate!</span>
        </div>
      )}

      {!user ? (
        <div className="mt-6 rounded-3xl bg-card p-8 text-center ring-1 ring-line shadow-xs">
          <Ticket size={28} className="mx-auto text-mute" />
          <p className="mt-2 font-display text-lg font-bold text-ink">Sign in to see your passes</p>
          <p className="mx-auto mt-1 max-w-sm text-[14px] text-mute">
            Tickets and passes live under your AirPal account — one account, tickets everywhere.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link href="/start?tab=signin" className="no-print inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-sm font-semibold text-white">
              Sign in
            </Link>
            <Link href="/pass" className="no-print inline-flex min-h-[44px] items-center rounded-full bg-paper px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card">
              Browse events
            </Link>
          </div>
        </div>
      ) : failed && bookings.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-card p-8 text-center ring-1 ring-line shadow-xs">
          <Ticket size={28} className="mx-auto text-mute" />
          <p className="mt-2 font-display text-lg font-bold text-ink">Couldn&apos;t load your tickets</p>
          <p className="mx-auto mt-1 max-w-sm text-[14px] text-mute">
            Check your connection and try again — your passes are safe in your AirPal account.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="no-print inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-brand px-5 text-sm font-semibold text-white"
            >
              Try again
            </button>
            <Link href="/pass" className="no-print inline-flex min-h-[44px] items-center rounded-full bg-paper px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card">
              Browse events
            </Link>
          </div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-card p-8 text-center ring-1 ring-line shadow-xs">
          <Ticket size={28} className="mx-auto text-mute" />
          <p className="mt-2 font-display text-lg font-bold text-ink">No tickets or passes yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[14px] text-mute">
            Passes and tickets you get on AirPal Pass live here — ready to scan at the door, save to Apple Wallet / Google Wallet, and coordinate in day plans.
          </p>
          <Link href="/pass" className="no-print mt-4 inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-sm font-semibold text-white">
            Explore AirPal Pass
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {/* Filter Segmented Tabs */}
          <div className="flex items-center gap-2 rounded-2xl bg-paper p-1 ring-1 ring-line">
            <button
              type="button"
              onClick={() => {
                void triggerHapticSelection();
                setTab("upcoming");
              }}
              className={cn(
                "inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition active:scale-95",
                tab === "upcoming" ? "bg-card text-ink shadow-xs ring-1 ring-line" : "text-mute hover:text-ink",
              )}
            >
              <span>Upcoming</span>
              <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[11px] font-bold text-accent">
                {upcomingBookings.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                void triggerHapticSelection();
                setTab("past");
              }}
              className={cn(
                "inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition active:scale-95",
                tab === "past" ? "bg-card text-ink shadow-xs ring-1 ring-line" : "text-mute hover:text-ink",
              )}
            >
              <span>Past</span>
              <span className="rounded-full bg-paper px-1.5 py-0.5 text-[11px] font-bold text-mute ring-1 ring-line">
                {pastBookings.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                void triggerHapticSelection();
                setTab("all");
              }}
              className={cn(
                "inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition active:scale-95",
                tab === "all" ? "bg-card text-ink shadow-xs ring-1 ring-line" : "text-mute hover:text-ink",
              )}
            >
              <span>All</span>
              <span className="rounded-full bg-paper px-1.5 py-0.5 text-[11px] font-bold text-mute ring-1 ring-line">
                {bookings.length}
              </span>
            </button>
          </div>

          {displayList.length === 0 ? (
            <div className="rounded-3xl bg-card p-6 text-center ring-1 ring-line shadow-xs">
              <p className="font-display text-base font-bold text-ink">
                {tab === "upcoming" ? "No upcoming passes" : "No past passes found"}
              </p>
              <p className="mt-1 text-xs text-mute">
                {tab === "upcoming"
                  ? "Grab a pass to a festival, concert, or gig on AirPal Pass."
                  : "Passes you have previously scanned or attended will be kept here."}
              </p>
              {tab === "upcoming" && (
                <Link
                  href="/pass"
                  className="no-print mt-3 inline-flex min-h-[40px] items-center rounded-full bg-brand px-4 text-xs font-semibold text-white"
                >
                  Browse AirPal Pass
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {displayList.map((t) => (
                <AirPalTicketPass key={t.id} booking={t} guestName={user?.displayName || undefined} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
