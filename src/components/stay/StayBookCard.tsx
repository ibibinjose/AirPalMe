import { useMemo, useRef, useState } from "react";
import { BedDouble } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { createStayCheckoutSessionRemote } from "@/lib/functions";
import { createSubmitGuard } from "@/lib/submit-guard";
import { quoteStayNights } from "@shared/stay-booking";
import type { PropertyInfo, RoomType } from "@shared/airpal-data";
import { useLocalNow } from "@/hooks/useLocalNow";

function pricedTypes(property: PropertyInfo): RoomType[] {
  return (property.roomTypes || []).filter((t) => Number(t.startingPrice) > 0);
}

/**
 * D3 — book reservable room-nights on the one engine. The client quote is
 * display-only; the server recomputes from the property doc, block ledger,
 * and live fee config before any Checkout session exists.
 */
export function StayBookCard({ property }: { property: PropertyInfo }) {
  const { user, requireUser } = useAuth();
  const { today } = useLocalNow();
  const rooms = useMemo(() => pricedTypes(property), [property]);
  const [roomId, setRoomId] = useState(() => rooms[0]?.id || "");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guardRef = useRef(createSubmitGuard());

  const room = rooms.find((r) => r.id === (roomId || rooms[0]?.id)) || rooms[0];
  const quote =
    room && checkIn && checkOut
      ? quoteStayNights({
          checkIn,
          checkOut,
          nightlyDollars: Number(room.startingPrice || 0),
          guests,
          capacity: Number(room.capacity || 1),
        })
      : null;

  if (rooms.length === 0 || !room) return null;

  async function book() {
    if (!requireUser("Sign in to book this stay.")) return;
    if (!user || typeof quote === "string" || !quote) {
      setError(typeof quote === "string" ? quote : "Pick dates to see the total.");
      return;
    }
    if (!guardRef.current.tryAcquire()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await createStayCheckoutSessionRemote({
        propertyId: property.id,
        roomTypeId: room.id,
        checkIn,
        checkOut,
        guests: quote.guests,
      });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      setError("Checkout didn't open. Try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed. Try again.");
      toast.error(err instanceof Error ? err.message : "Booking failed.");
    } finally {
      guardRef.current.release();
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl bg-card p-4 ring-1 ring-line shadow-xs" aria-label="Book this stay">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold">
        <BedDouble size={15} className="text-accent" /> Book this stay
      </p>
      <p className="mt-0.5 text-[12px] text-mute">Live room-nights with the host — paid through AirPal.</p>
      <div className="mt-3 grid gap-2">
        <label className="block">
          <span className="text-[12px] text-mute">Room</span>
          <select
            value={room.id}
            onChange={(e) => setRoomId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brand"
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · from ${Number(r.startingPrice)} / night
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[12px] text-mute">Check-in</span>
            <input
              type="date"
              value={checkIn}
              min={today}
              onChange={(e) => setCheckIn(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="text-[12px] text-mute">Check-out</span>
            <input
              type="date"
              value={checkOut}
              min={checkIn || today}
              onChange={(e) => setCheckOut(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-[12px] text-mute">Guests (sleeps {room.capacity})</span>
          <input
            type="number"
            min={1}
            max={room.capacity}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold" aria-live="polite">
          {typeof quote === "string" ? quote : quote ? `$${(quote.totalCents / 100).toFixed(0)} · ${quote.nights}n` : "Pick dates"}
        </p>
        <Button disabled={busy || typeof quote === "string" || !quote} loading={busy} onClick={() => void book()}>
          Book now
        </Button>
      </div>
      {error && typeof quote !== "string" && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
    </section>
  );
}
