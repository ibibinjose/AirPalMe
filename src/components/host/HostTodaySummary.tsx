import { useMemo } from "react";
import { useLocation } from "wouter";
import { Headphones } from "lucide-react";
import type { PropertyInfo } from "@shared/airpal-data";
import { roomTokenEntries } from "@/lib/host-workspace";
import { HostActivationChecklist } from "./HostActivationChecklist";

export function HostTodaySummary({
  property,
  wifiLive,
  qrReady,
  onManageRooms,
}: {
  property: PropertyInfo;
  wifiLive: boolean;
  qrReady: boolean;
  onManageRooms: () => void;
}) {
  const [, nav] = useLocation();

  const occupancy = useMemo(() => {
    const statuses = Object.values(property.roomStatuses || {});
    if (!statuses.length) return null;
    return {
      occupied: statuses.filter((s) => s === "occupied").length,
      vacant: statuses.filter((s) => s === "vacant").length,
      total: statuses.length,
    };
  }, [property.roomStatuses]);

  return (
    <>
      <div className="mt-5">
        <HostActivationChecklist
          propertyId={property.id}
          propertyName={property.name}
          wifiSet={wifiLive}
          qrReady={qrReady && Boolean(property.lobbyMarkerId || roomTokenEntries(property.roomTokens).length)}
          wifiUpdatedAt={property.wifiUpdatedAt}
        />
      </div>

      {occupancy && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { n: occupancy.occupied, l: "Occupied" },
            { n: occupancy.vacant, l: "Vacant" },
            { n: occupancy.total, l: "Tracked rooms" },
          ].map((s) => (
            <div key={s.l} className="rounded-[22px] bg-card/90 p-3 text-center ring-1 ring-line">
              <p className="font-display text-2xl font-semibold tabular-nums">{s.n}</p>
              <p className="text-[11px] text-mute">{s.l}</p>
            </div>
          ))}
        </div>
      )}

      {property.roomTypes && property.roomTypes.length > 0 && (
        <section className="mt-4 rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Room types</p>
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center px-1 text-xs font-medium text-accent"
              onClick={onManageRooms}
            >
              Manage rooms →
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {property.roomTypes.map((rt) => (
              <li key={rt.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{rt.name}</span>
                <span className="text-mute">
                  {rt.totalRooms} · from ${rt.startingPrice}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => nav("/helpdesk")}
          className="flex items-center justify-between gap-3 rounded-[22px] bg-brand p-4 text-left text-white shadow-xs hover:bg-brand/95 transition active:scale-[0.99]"
        >
          <span>
            <span className="flex items-center gap-1.5 text-sm font-bold">
              <Headphones size={15} aria-hidden /> Open Universal Help Desk
            </span>
            <span className="block text-xs text-white/80">Unified desk for Stays, Dining & Events</span>
          </span>
          <span aria-hidden className="font-bold">
            →
          </span>
        </button>

        <button
          type="button"
          onClick={() => nav("/business/promotions")}
          className="flex items-center justify-between gap-3 rounded-[22px] bg-neutral-900 p-4 text-left text-white shadow-xs hover:bg-neutral-800 transition active:scale-[0.99]"
        >
          <span>
            <span className="block text-sm font-semibold">Fill slow nights with an offer</span>
            <span className="block text-xs text-white/70">Promotions bring the guests, you host.</span>
          </span>
          <span aria-hidden>→</span>
        </button>
      </div>
    </>
  );
}
