import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChefHat,
  Coffee,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  Wine,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { MenuItem, VenueKind, VenueProfile } from "@shared/airpal-data";
import {
  FOOD_ORDER_MODE_LABELS,
  FOOD_ORDER_MODES,
  orderTotalLabel,
  type FoodOrder,
  type FoodOrderMode,
} from "@shared/food";
import { confirmFoodOrderRemote, placeFoodOrderRemote } from "@/lib/functions";
import { lastOrderId, rememberOrderId, subscribeFoodOrder } from "@/lib/food-orders";
import { cn } from "@/lib/cn";

const VENUE_ICONS: Record<VenueKind, typeof Sparkles> = {
  restaurant: UtensilsCrossed,
  bar: Wine,
  cafe: Coffee,
  kitchen: ChefHat,
  amenity: Sparkles,
};

const PROGRESS: Array<{ status: string; label: string }> = [
  { status: "placed", label: "Received" },
  { status: "preparing", label: "Preparing" },
  { status: "ready", label: "Ready" },
  { status: "served", label: "Served" },
];

function progressIndex(status: string): number {
  if (status === "completed") return PROGRESS.length;
  const i = PROGRESS.findIndex((s) => s.status === status);
  return i < 0 ? 0 : i;
}

export function FoodOrderPanel({
  propertyId,
  menu,
  venues,
  roomDefault,
}: {
  propertyId: string;
  menu: MenuItem[];
  venues: VenueProfile[];
  roomDefault: string;
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<FoodOrderMode>(
    roomDefault && roomDefault !== "Guest" ? "room" : "pickup",
  );
  const [roomOrTable, setRoomOrTable] = useState(roomDefault && roomDefault !== "Guest" ? roomDefault : "");
  const [guestName, setGuestName] = useState("");
  const [placing, setPlacing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<FoodOrder | null>(null);

  // Returning from Stripe, or resuming the last order on this stay.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returning = params.get("order");
    if (returning) {
      setActiveOrderId(returning);
      rememberOrderId(propertyId, returning);
      window.history.replaceState(null, "", window.location.pathname);
      if (params.get("cancelled") === "1") {
        toast.message("Payment cancelled — the order stays on hold until it's paid.");
        return;
      }
      setConfirming(true);
      void confirmFoodOrderRemote({ propertyId, orderId: returning })
        .then(() => toast.success("Payment confirmed — the kitchen has your order."))
        .catch((err) => toast.error(err instanceof Error ? err.message : "Couldn't confirm payment yet."))
        .finally(() => setConfirming(false));
      return;
    }
    const last = lastOrderId(propertyId);
    if (last) setActiveOrderId(last);
  }, [propertyId]);

  useEffect(() => {
    if (!activeOrderId) {
      setActiveOrder(null);
      return;
    }
    return subscribeFoodOrder(propertyId, activeOrderId, setActiveOrder);
  }, [propertyId, activeOrderId]);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of menu) {
      const key = item.category || "Mains";
      map.set(key, [...(map.get(key) || []), item]);
    }
    return Array.from(map.entries());
  }, [menu]);

  const lines = useMemo(() => {
    const byId = new Map(menu.map((m) => [m.id, m]));
    return Object.entries(cart)
      .map(([id, qty]) => ({ item: byId.get(id), qty }))
      .filter((l): l is { item: MenuItem; qty: number } => Boolean(l.item) && l.qty > 0);
  }, [cart, menu]);

  const subtotal = useMemo(
    () => Math.round(lines.reduce((s, l) => s + l.item.price * l.qty, 0) * 100) / 100,
    [lines],
  );

  function setQty(id: string, qty: number) {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = Math.min(20, qty);
      return next;
    });
  }

  async function placeOrder() {
    if (placing || !lines.length) return;
    if ((mode === "room" || mode === "table") && !roomOrTable.trim()) {
      toast.error(mode === "room" ? "Add your room number." : "Add your table number.");
      return;
    }
    setPlacing(true);
    try {
      const res = await placeFoodOrderRemote({
        propertyId,
        items: lines.map((l) => ({ menuItemId: l.item.id, qty: l.qty })),
        mode,
        roomOrTable: roomOrTable.trim(),
        guestName: guestName.trim() || undefined,
      });
      rememberOrderId(propertyId, res.orderId);
      setCart({});
      if (res.mode === "live_stripe" && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      setActiveOrderId(res.orderId);
      toast.success("Order sent to the kitchen.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't place the order.");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      {venues.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">On site</p>
          <ul className="mt-2 space-y-2">
            {venues.map((v) => {
              const Icon = VENUE_ICONS[v.kind] || Sparkles;
              return (
                <li key={v.id} className="flex items-center gap-3 rounded-2xl bg-paper p-3.5 ring-1 ring-line">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">
                      {v.name}
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-gold">{v.kind}</span>
                    </p>
                    <p className="truncate text-xs text-mute">
                      {[v.hours, v.floor, v.details].filter(Boolean).join(" · ") || "Ask the desk for hours"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {activeOrder && (
        <div className="rounded-2xl border-2 border-ink bg-card p-4 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-ink">
              {activeOrder.status === "cancelled"
                ? "Order cancelled"
                : activeOrder.status === "completed" || activeOrder.status === "served"
                  ? "Enjoy your meal"
                  : activeOrder.status === "pending_payment"
                    ? "Awaiting payment"
                    : "Your order"}
            </p>
            <p className="text-sm font-bold text-brand">{orderTotalLabel(activeOrder.subtotal, activeOrder.currency)}</p>
          </div>
          <p className="mt-0.5 truncate text-xs text-mute">
            {activeOrder.items.map((l) => `${l.qty}× ${l.name}`).join(", ")}
          </p>
          {activeOrder.status !== "cancelled" && activeOrder.status !== "pending_payment" && (
            <ol className="mt-3 flex items-center gap-1" aria-label="Order progress">
              {PROGRESS.map((step, i) => {
                const done = i <= progressIndex(activeOrder.status);
                const current = i === progressIndex(activeOrder.status) && activeOrder.status !== "completed";
                return (
                  <li key={step.status} className="flex flex-1 items-center gap-1 last:flex-none">
                    <span className="flex flex-1 flex-col items-center gap-1">
                      <span
                        className={cn(
                          "h-2 w-full rounded-full",
                          done ? "bg-brand" : "bg-ink/10",
                          current && "animate-pulse",
                        )}
                      />
                      <span className={cn("text-[10px] font-semibold", done ? "text-ink" : "text-mute")}>
                        {step.label}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          {activeOrder.status === "pending_payment" && (
            <p className="mt-2 text-xs text-mute">
              {confirming ? "Confirming payment…" : "Complete card payment to fire the kitchen. If the charge went through, it appears here shortly."}
            </p>
          )}
          {(activeOrder.status === "completed" ||
            activeOrder.status === "cancelled" ||
            activeOrder.status === "served") && (
            <button
              type="button"
              onClick={() => {
                setActiveOrderId(null);
                setActiveOrder(null);
              }}
              className="mt-2 text-xs font-semibold text-brand"
            >
              Order more →
            </button>
          )}
        </div>
      )}

      {grouped.length === 0 ? (
        <p className="rounded-2xl bg-paper px-4 py-5 text-center text-sm text-mute ring-1 ring-line">
          No menu yet — ask the desk what's cooking.
        </p>
      ) : (
        grouped.map(([cat, items]) => (
          <div key={cat}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">{cat}</p>
            <ul className="mt-2 space-y-2">
              {items.map((item) => {
                const qty = cart[item.id] || 0;
                const paused = item.available === false;
                return (
                  <li key={item.id} className="rounded-2xl bg-paper p-4 ring-1 ring-line">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">
                          {item.name}
                          {item.popular && (
                            <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">
                              Popular
                            </span>
                          )}
                        </p>
                        {item.description ? (
                          <p className="mt-1 text-xs leading-relaxed text-mute">{item.description}</p>
                        ) : null}
                        {item.dietary && item.dietary.length > 0 && (
                          <p className="mt-1 text-[11px] font-medium text-emerald-700">{item.dietary.join(" · ")}</p>
                        )}
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-brand">${item.price.toFixed(2)}</p>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-mute">
                        {paused ? "Paused right now" : FOOD_ORDER_MODE_LABELS[mode] === "Room service" ? "To your room" : FOOD_ORDER_MODE_LABELS[mode]}
                      </span>
                      {paused ? (
                        <span className="text-xs font-semibold text-mute">Unavailable</span>
                      ) : qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => setQty(item.id, 1)}
                          className="inline-flex h-8 items-center gap-1 rounded-full bg-ink px-3.5 text-xs font-bold text-white transition active:scale-95"
                        >
                          <Plus size={13} />
                          Add
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full bg-ink px-1.5 py-1 text-white">
                          <button
                            type="button"
                            aria-label={`Remove one ${item.name}`}
                            onClick={() => setQty(item.id, qty - 1)}
                            className="grid h-6 w-6 place-items-center rounded-full bg-white/15 transition active:scale-90"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="min-w-5 text-center text-xs font-bold">{qty}</span>
                          <button
                            type="button"
                            aria-label={`Add one ${item.name}`}
                            onClick={() => setQty(item.id, qty + 1)}
                            className="grid h-6 w-6 place-items-center rounded-full bg-white/15 transition active:scale-90"
                          >
                            <Plus size={13} />
                          </button>
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}

      {lines.length > 0 && (
        <div className="rounded-2xl border-2 border-ink bg-card p-4 shadow-card">
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
            <ShoppingBag size={15} className="text-brand" />
            Your order · {orderTotalLabel(subtotal)}
          </p>
          <div className="mt-3 flex gap-1.5" role="radiogroup" aria-label="How should the kitchen send it?">
            {FOOD_ORDER_MODES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "h-9 flex-1 rounded-full px-2 text-xs font-bold transition",
                  mode === m ? "bg-ink text-white" : "bg-ink/[0.05] text-mute hover:text-ink",
                )}
              >
                {FOOD_ORDER_MODE_LABELS[m]}
              </button>
            ))}
          </div>
          {(mode === "room" || mode === "table") && (
            <input
              value={roomOrTable}
              onChange={(e) => setRoomOrTable(e.target.value)}
              placeholder={mode === "room" ? "Room number" : "Table number"}
              inputMode="numeric"
              aria-label={mode === "room" ? "Room number" : "Table number"}
              className="mt-2.5 h-11 w-full rounded-2xl border border-transparent bg-ink/[0.05] px-4 text-sm text-ink outline-none placeholder:text-mute focus:border-brand focus:bg-card"
            />
          )}
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Name for the order (optional)"
            autoComplete="name"
            aria-label="Name for the order"
            className="mt-2 h-11 w-full rounded-2xl border border-transparent bg-ink/[0.05] px-4 text-sm text-ink outline-none placeholder:text-mute focus:border-brand focus:bg-card"
          />
          <Button onClick={placeOrder} disabled={placing} loading={placing} className="mt-3 h-12 w-full rounded-full">
            {placing ? "Sending…" : `Pay ${orderTotalLabel(subtotal)} & order`}
          </Button>
          <p className="mt-2 text-center text-[11px] text-mute">Card payment via Stripe. The kitchen fires once it's paid.</p>
        </div>
      )}
    </div>
  );
}
