import { BedDouble, Clock, ShieldCheck, Users } from "lucide-react";
import type { RoomType } from "@shared/airpal-data";

export function YourRoomCard({
  roomNumber,
  roomType,
  checkIn,
  checkOut,
}: {
  roomNumber: string;
  roomType: RoomType | null;
  checkIn?: string;
  checkOut?: string;
}) {
  return (
    <section aria-label="Your room" className="mt-4 rounded-3xl ring-1 ring-line bg-card p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950 border border-line shadow-xs">
            <ShieldCheck size={12} />
            <span>AirPal Verified Stay</span>
          </div>
          <h2 className="font-display mt-2 text-xl font-bold text-ink">
            {roomType ? roomType.name : `Room ${roomNumber}`}
          </h2>
          {roomType && (
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-mute">
              <span className="inline-flex items-center gap-1 text-ink font-semibold">
                <BedDouble size={14} className="text-brand" /> {roomType.bedConfig}
              </span>
              <span className="inline-flex items-center gap-1 text-ink font-semibold">
                <Users size={14} className="text-brand" /> Capacity {roomType.capacity} Guests
              </span>
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-2xl bg-ink ring-1 ring-line px-3.5 py-2 font-display text-base font-extrabold text-white shadow-xs">
          Room {roomNumber}
        </span>
      </div>

      {roomType && roomType.features.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {roomType.features.slice(0, 6).map((f) => (
            <span
              key={f}
              className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink border border-line/30"
            >
              {f}
            </span>
          ))}
        </div>
      )}

      {(checkIn || checkOut) && (
        <p className="mt-3 flex items-center gap-1.5 border-t border-line/80 pt-3 text-xs font-bold text-ink">
          <Clock size={15} className="shrink-0 text-brand" />
          {checkIn ? `Check-in ${checkIn}` : ""}
          {checkIn && checkOut ? " · " : ""}
          {checkOut ? `Check-out ${checkOut}` : ""}
        </p>
      )}
    </section>
  );
}
