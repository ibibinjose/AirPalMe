import { useState } from "react";
import { toast } from "sonner";
import { Check, CreditCard, UtensilsCrossed, X } from "lucide-react";
import type { DiningOrder } from "@shared/airpal-data";
import { activeOrderCount } from "@/lib/dining-store";
import { updateDiningOrderStatusRemote } from "@/lib/functions";
import { playResolutionChime, stopTicketAlarm } from "@/lib/ticket-alert-sound";
import { activeDiningOrders, formatTimeAgo, nextOrderStatus, pastDiningOrders } from "@/lib/host-boards";
import { BoardFilterTabs } from "./BoardFilterTabs";

function aud(cents: number): string {
  return `A$${(cents / 100).toFixed(2)}`;
}

export function HostOrderBoard({ propertyId, orders }: { propertyId: string; orders: DiningOrder[] }) {
  const [orderTab, setOrderTab] = useState<"active" | "history">("active");
  const active = activeDiningOrders(orders);
  const past = pastDiningOrders(orders);

  return (
    <div className="mt-8 rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-xs md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold tracking-tight">Dining Orders</h2>
            {activeOrderCount(orders) > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                {activeOrderCount(orders)} active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Kitchen idle
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-mute">In-room dining orders placed by guests via QR menu.</p>
        </div>
      </div>

      <BoardFilterTabs
        ariaLabel="Order history filter"
        value={orderTab}
        onChange={setOrderTab}
        options={[
          { id: "active", label: "Active Orders", count: active.length },
          { id: "history", label: "Past Orders", count: past.length },
        ]}
      />

      <ul className="mt-4 space-y-3">
        {orderTab === "active" ? (
          active.length === 0 ? (
            <li className="flex items-center justify-center gap-2 rounded-2xl bg-paper/60 p-6 text-center text-sm text-mute ring-1 ring-line">
              <UtensilsCrossed size={16} aria-hidden /> No active kitchen orders.
            </li>
          ) : (
            active.map((o) => {
              const { next, label: nextLabel } = nextOrderStatus(o.status);
              return (
                <li
                  key={o.id}
                  className="rounded-2xl bg-paper/80 p-4 ring-1 ring-line shadow-2xs hover:bg-paper transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-ink">Room {o.roomNumber}</span>
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand uppercase tracking-wider">
                        {o.status}
                      </span>
                      {o.paymentMode === "desk" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                          <CreditCard size={12} aria-hidden /> Pay at Desk
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                          <Check size={12} aria-hidden /> Stripe Paid
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-sm text-ink">{aud(o.totalCents)}</span>
                      <span className="text-[11px] text-mute">{formatTimeAgo(o.createdAt)}</span>
                    </div>
                  </div>

                  <div className="mt-2.5 text-xs text-ink/80 space-y-1">
                    {o.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          <strong className="text-brand">{it.qty}×</strong> {it.name}
                        </span>
                        <span className="text-mute">{aud(it.unitCents * it.qty)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3.5 flex items-center justify-end gap-2 border-t border-line/60 pt-2.5">
                    <button
                      type="button"
                      className="inline-flex min-h-[44px] items-center rounded-full px-4 text-xs text-mute hover:text-red-600 transition"
                      onClick={() => {
                        void updateDiningOrderStatusRemote({
                          propertyId,
                          orderId: o.id,
                          status: "cancelled",
                        })
                          .then(() => toast.success("Order cancelled"))
                          .catch((err) => toast.error(err instanceof Error ? err.message : "Couldn't cancel"));
                      }}
                    >
                      Cancel Order
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-4 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 active:scale-95 transition"
                      onClick={() => {
                        void (async () => {
                          if (next === "delivered") {
                            stopTicketAlarm();
                            playResolutionChime();
                          }
                          try {
                            await updateDiningOrderStatusRemote({
                              propertyId,
                              orderId: o.id,
                              status: next,
                            });
                            toast.success(next === "delivered" ? "Order Delivered & Closed" : `Order ${nextLabel}`);
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Couldn't update order");
                          }
                        })();
                      }}
                    >
                      {nextLabel} →
                    </button>
                  </div>
                </li>
              );
            })
          )
        ) : past.length === 0 ? (
          <li className="rounded-2xl bg-paper/60 p-6 text-center text-sm text-mute ring-1 ring-line">
            No order history yet.
          </li>
        ) : (
          past.slice(0, 15).map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-paper/40 px-4 py-3 ring-1 ring-line/60 opacity-85"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-ink/80">Room {o.roomNumber}</span>
                  <span className="text-[11px] text-mute">{formatTimeAgo(o.updatedAt)}</span>
                </div>
                <p className="truncate text-xs text-mute mt-0.5">
                  {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                    o.status === "delivered" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                  }`}
                >
                  {o.status === "delivered" ? (
                    <>
                      <Check size={12} aria-hidden /> Delivered
                    </>
                  ) : (
                    <>
                      <X size={12} aria-hidden /> Cancelled
                    </>
                  )}
                </span>
                <p className="text-xs font-medium text-ink/70">{aud(o.totalCents)}</p>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
