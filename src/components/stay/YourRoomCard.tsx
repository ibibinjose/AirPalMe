import { BedDouble, Clock, Users } from "lucide-react";
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
    <section aria-label="Your room" className="mt-4 rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
            Your room{roomType ? ` · ${roomType.category}` : ""}
          </p>
          <h2 className="font-display mt-1 text-xl font-semibold">
            {roomType ? roomType.name : `Room ${roomNumber}`}
          </h2>
          {roomType && (
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-mute">
              <span className="inline-flex items-center gap-1">
                <BedDouble size={14} className="text-brand" /> {roomType.bedConfig}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users size={14} className="text-brand" /> Sleeps {roomType.capacity}
              </span>
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-ink px-3 py-1.5 font-display text-sm font-semibold text-white">
          {roomNumber}
        </span>
      </div>

      {roomType && roomType.features.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {roomType.features.slice(0, 6).map((f) => (
            <span key={f} className="rounded-full bg-paper px-2.5 py-1 text-xs ring-1 ring-line">
              {f}
            </span>
          ))}
        </div>
      )}

      {(checkIn || checkOut) && (
        <p className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-sm text-mute">
          <Clock size={14} className="shrink-0 text-brand" />
          {checkIn ? `Check-in ${checkIn}` : ""}
          {checkIn && checkOut ? " · " : ""}
          {checkOut ? `Check-out ${checkOut}` : ""}
        </p>
      )}
    </section>
  );
}
