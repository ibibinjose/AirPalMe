import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BellRing, Check, CookingPot, ReceiptText, X } from "lucide-react";
import {
  FOOD_ORDER_MODE_LABELS,
  FOOD_ORDER_STATUS_LABELS,
  orderTotalLabel,
  type FoodOrder,
  type FoodOrderStatus,
} from "@shared/food";
import { subscribePropertyOrders } from "@/lib/food-orders";
import { updateFoodOrderStatusRemote } from "@/lib/functions";
import { cn } from "@/lib/cn";

const NEXT_ACTION: Partial<Record<FoodOrderStatus, { to: FoodOrderStatus; label: string }>> = {
  placed: { to: "preparing", label: "Start preparing" },
  preparing: { to: "ready", label: "Mark ready" },
  ready: { to: "served", label: "Mark served" },
  served: { to: "completed", label: "Complete" },
};

const OPEN: FoodOrderStatus[] = ["placed", "preparing", "ready"];

function timeOf(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function HostOrdersPanel({
  propertyId,
  onOpenCount,
}: {
  propertyId: string;
  onOpenCount?: (n: number) => void;
}) {
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => subscribePropertyOrders(propertyId, setOrders), [propertyId]);

  const open = useMemo(() => orders.filter((o) => OPEN.includes(o.status)), [orders]);
  const pendingPayment = useMemo(() => orders.filter((o) => o.status === "pending_payment"), [orders]);
  const done = useMemo(
    () => orders.filter((o) => o.status === "served" || o.status === "completed" || o.status === "cancelled").slice(0, 10),
    [orders],
  );

  useEffect(() => {
    onOpenCount?.(open.length + pendingPayment.length);
  }, [open.length, pendingPayment.length, onOpenCount]);

  async function advance(order: FoodOrder, to: FoodOrderStatus) {
    setBusy(`${order.id}:${to}`);
    try {
      await updateFoodOrderStatusRemote({ propertyId, orderId: order.id, status: to });
      toast.success(to === "cancelled" ? "Order cancelled" : `Order ${FOOD_ORDER_STATUS_LABELS[to].toLowerCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update the order");
    } finally {
      setBusy(null);
    }
  }

  function orderCard(order: FoodOrder) {
    const next = NEXT_ACTION[order.status];
    const where =
      order.mode === "room"
        ? `Room ${order.roomOrTable || "?"}`
        : order.mode === "table"
          ? `Table ${order.roomOrTable || "?"}`
          : "Pickup";
    return (
      <li key={order.id} className="rounded-2xl bg-paper/70 p-4 ring-1 ring-line">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
              {order.guestName}
              <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-semibold text-mute">{where}</span>
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                {FOOD_ORDER_MODE_LABELS[order.mode]}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-mute">
              {timeOf(order.createdAt)}
              {order.paymentStatus === "paid" ? " · Paid by card" : order.paymentStatus === "sandbox" ? " · Sandbox order" : " · Unpaid"}
            </p>
          </div>
          <p className="shrink-0 text-sm font-bold text-ink">{orderTotalLabel(order.subtotal, order.currency)}</p>
        </div>
        <ul className="mt-2 space-y-1 border-t border-line/60 pt-2">
          {order.items.map((l) => (
            <li key={l.menuItemId} className="flex items-baseline justify-between gap-3 text-sm">
              <span>
                <span className="font-bold text-brand">{l.qty}×</span> {l.name}
              </span>
              <span className="text-mute">${(l.unitPrice * l.qty).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        {(next || order.status === "placed" || order.status === "preparing") && (
          <div className="mt-3 flex flex-wrap gap-2">
            {next && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => advance(order, next.to)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50"
              >
                <CookingPot size={14} />
                {busy?.startsWith(order.id) ? "Saving…" : next.label}
              </button>
            )}
            {(order.status === "placed" || order.status === "preparing") && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => advance(order, "cancelled")}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink/[0.05] px-4 text-xs font-bold text-mute transition hover:text-ink active:scale-95 disabled:opacity-50"
              >
                <X size={14} />
                Cancel
              </button>
            )}
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="mt-5 space-y-5">
      <section className="rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Kitchen</p>
            <h2 className="font-display text-xl font-semibold tracking-tight">Open orders</h2>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
              open.length ? "bg-brand text-white" : "bg-ink/[0.05] text-mute",
            )}
          >
            <BellRing size={13} />
            {open.length} live
          </span>
        </div>
        {pendingPayment.length > 0 && (
          <p className="mt-2 text-xs text-mute">{pendingPayment.length} awaiting card payment — they'll fire here once paid.</p>
        )}
        {open.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-paper px-4 py-5 text-center text-sm text-mute ring-1 ring-line">
            No open orders. New paid orders ping this device and land here.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">{open.map(orderCard)}</ul>
        )}
      </section>

      {done.length > 0 && (
        <section className="rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm md:p-6">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">
            <ReceiptText size={13} />
            Recently finished
          </p>
          <ul className="mt-3 space-y-2">
            {done.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-mute">
                  {o.guestName} · {o.items.map((l) => `${l.qty}× ${l.name}`).join(", ")}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold">{orderTotalLabel(o.subtotal, o.currency)}</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      o.status === "cancelled" ? "bg-ink/[0.06] text-mute" : "bg-emerald-500/10 text-emerald-700",
                    )}
                  >
                    {o.status === "cancelled" ? <X size={10} /> : <Check size={10} />}
                    {FOOD_ORDER_STATUS_LABELS[o.status]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
