import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft, ShieldCheck, Sun, SunMedium, Ticket } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBookings } from "@/hooks/useMyBookings";
import { AirPalTicketPass } from "@/components/tickets/AirPalTicketPass";
import { TicketGatePanel } from "@/components/booking/TicketGatePanel";
import { PageLoading } from "@/components/ui/PageLoading";
import { getFirebaseDb } from "@/lib/firebase";
import { triggerHaptic } from "@/lib/native";
import { isTicketId, type Booking } from "@shared/booking";
import { NotFoundPage } from "./NotFoundPage";
import { cn } from "@/lib/cn";

/**
 * /ticket/:id — Secure passbook ticket with dynamic QR code, maximum screen
 * brightness boost, and Apple/Google Wallet integration.
 * Scanned by ScanPage; cataloged in MyTicketsPage.
 */
export function TicketPage() {
  const [, params] = useRoute("/ticket/:id");
  const { user, authReady, isAdmin } = useAuth();
  const id = params?.id || "";

  const { bookings } = useMyBookings();
  const [booking, setBooking] = useState<(Booking & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [brightnessBoost, setBrightnessBoost] = useState(false);
  const [mode, setMode] = useState<"pass" | "gate">("pass");

  // Load booking from cached wallet or Firestore
  useEffect(() => {
    if (!id || !isTicketId(id)) {
      setLoading(false);
      return;
    }

    // First check local/cached bookings
    const cached = bookings.find((b) => b.id === id);
    if (cached) {
      setBooking(cached);
      setLoading(false);
      return;
    }

    // Fallback to Firestore read
    const db = getFirebaseDb();
    if (!db) {
      setLoading(false);
      return;
    }

    let alive = true;
    void getDoc(doc(db, "bookings", id))
      .then((snap) => {
        if (!alive) return;
        if (snap.exists()) {
          setBooking({ id: snap.id, ...(snap.data() as Omit<Booking, "id">) });
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [id, bookings]);

  // Screen brightness boost & wake-lock effect for dark gate/entrance scanning
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    const navWithWakeLock =
      typeof navigator !== "undefined"
        ? (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> } })
        : null;
    if (brightnessBoost && navWithWakeLock?.wakeLock) {
      try {
        navWithWakeLock.wakeLock
          .request("screen")
          .then((lock) => {
            wakeLock = lock;
          })
          .catch(() => undefined);
      } catch {
        /* ignore */
      }
    }
    return () => {
      if (wakeLock) {
        try {
          wakeLock.release();
        } catch {
          /* ignore */
        }
      }
    };
  }, [brightnessBoost]);

  if (!isTicketId(id)) return <NotFoundPage />;
  if (!authReady || loading) return <PageLoading />;

  // Whether the viewer is the ticket holder
  const isHolder = Boolean(user && booking && booking.customerUid === user.uid);
  // Whether the viewer can also act as gate staff/organiser
  const isStaff = Boolean(
    isAdmin || (user && booking && (booking.providerUid === user.uid || booking.customerUid !== user.uid)),
  );

  const toggleBrightness = () => {
    const next = !brightnessBoost;
    setBrightnessBoost(next);
    void triggerHaptic("medium");
    if (next) {
      toast.success("Screen brightness boost active · Ready for gate scan");
    } else {
      toast.info("Screen brightness boost turned off");
    }
  };

  return (
    <div
      className={cn(
        "min-h-screen transition-all duration-300 pb-28",
        brightnessBoost ? "bg-white text-black brightness-110 contrast-105" : "",
      )}
    >
      <div className="mx-auto max-w-lg px-4 pt-4 md:pt-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <Link
            href="/me/tickets"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute hover:text-ink ring-1 ring-line hover:bg-paper transition"
          >
            <ArrowLeft size={14} />
            <span>Passbook Wallet</span>
          </Link>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 ring-1 ring-amber-400/30">
            <Ticket size={13} />
            <span>AirPal Pass</span>
          </div>

          <Link
            href="/pass"
            className="inline-flex min-h-[44px] items-center text-xs font-semibold text-accent hover:underline"
          >
            AirPal Pass →
          </Link>
        </div>

        {/* Max Brightness Boost Control */}
        <div className="mb-4">
          <button
            type="button"
            onClick={toggleBrightness}
            aria-pressed={brightnessBoost}
            className={cn(
              "w-full flex items-center justify-between gap-3 rounded-2xl p-3.5 transition active:scale-[0.99] cursor-pointer ring-1 shadow-xs",
              brightnessBoost
                ? "bg-amber-400 text-neutral-950 ring-amber-500 font-bold shadow-md animate-pulse"
                : "bg-card text-ink ring-line hover:bg-paper",
            )}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-xl",
                  brightnessBoost ? "bg-black/15 text-neutral-950" : "bg-amber-500/15 text-amber-600",
                )}
              >
                {brightnessBoost ? <Sun size={18} /> : <SunMedium size={18} />}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold leading-tight">
                  {brightnessBoost ? "Screen Brightness Boosted" : "Boost Brightness for Door Scanner"}
                </p>
                <p className={cn("text-[11px] mt-0.5", brightnessBoost ? "text-neutral-900" : "text-mute")}>
                  {brightnessBoost
                    ? "Display maximized for instant gate scan"
                    : "Tap to maximize contrast at door entrance"}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-extrabold",
                brightnessBoost ? "bg-neutral-950 text-white" : "bg-paper text-accent ring-1 ring-line",
              )}
            >
              {brightnessBoost ? "ON" : "BOOST"}
            </span>
          </button>
        </div>

        {/* Staff / Holder View Switcher (If Entitled) */}
        {booking && isStaff && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-paper p-1 ring-1 ring-line">
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                setMode("pass");
              }}
              className={cn(
                "flex-1 min-h-[38px] rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer",
                mode === "pass" ? "bg-card text-ink shadow-xs ring-1 ring-line" : "text-mute hover:text-ink",
              )}
            >
              Digital Passbook
            </button>
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                setMode("gate");
              }}
              className={cn(
                "flex-1 min-h-[38px] rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer",
                mode === "gate" ? "bg-card text-ink shadow-xs ring-1 ring-line" : "text-mute hover:text-ink",
              )}
            >
              Gate Staff Check-in
            </button>
          </div>
        )}

        {/* Main Content Area */}
        {mode === "gate" || (!booking && !isHolder) ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent mb-1">
              <ShieldCheck size={14} /> Gate Staff Door Validation
            </div>
            <TicketGatePanel
              ticketId={id}
              deniedMessage="Only this event's organiser or ticket holder can access this pass."
            />
          </div>
        ) : booking ? (
          <div className="space-y-4">
            <AirPalTicketPass
              booking={booking}
              guestName={user?.displayName || undefined}
              hostName={booking.providerName}
              showActions={true}
            />
          </div>
        ) : (
          <div className="rounded-3xl bg-card p-8 text-center ring-1 ring-line shadow-xs">
            <Ticket size={32} className="mx-auto text-mute" />
            <p className="font-display text-lg font-bold text-ink mt-3">Pass Loaded for Gate Staff</p>
            <p className="text-xs text-mute mt-1">Ticket ID: {id}</p>
            <div className="mt-4">
              <TicketGatePanel ticketId={id} deniedMessage="Only this event's organiser can verify tickets." />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
