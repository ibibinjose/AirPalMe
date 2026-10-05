import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useLocale } from "@/contexts/LocaleContext";
import { placeDiningOrderRemote } from "@/lib/functions";
import { trackContentAction } from "@/lib/analytics";
import type { MenuItem, PropertyInfo } from "@shared/airpal-data";

export function DiningSheet({
  open,
  onClose,
  property,
  propertyId,
  menu,
  roomLabel,
}: {
  open: boolean;
  onClose: () => void;
  property: PropertyInfo;
  propertyId: string;
  menu: MenuItem[];
  roomLabel: string;
}) {
  const { t } = useLocale();
  const [orderQty, setOrderQty] = useState<Record<string, number>>({});
  const [orderRoom, setOrderRoom] = useState("");
  const [ordering, setOrdering] = useState(false);

  return (
    <Sheet open={open} onClose={onClose} title={t("dining")}>
      <p className="text-xs font-bold text-mute">{property.breakfast?.hours || "Dining hours — ask the front desk"}</p>
      <div className="mt-4 space-y-3">
        <div className="rounded-2xl bg-paper p-4 ring-1 ring-line shadow-xs">
          <p className="font-bold text-ink">{property.breakfast?.type || "Breakfast & Dining"}</p>
          <p className="mt-1 text-xs text-mute">{property.breakfast?.location || property.address || "On site"}</p>
          <p className="mt-1 text-xs font-bold text-brand">{property.breakfast?.price || "Ask front desk"}</p>
        </div>
        {menu.length > 0 &&
          menu.slice(0, 8).map((item) => {
            const qty = orderQty[item.id] || 0;
            return (
              <div key={item.id} className="rounded-2xl bg-paper p-4 ring-1 ring-line shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-mute">{item.category}</p>
                    <p className="font-bold text-ink">{item.name}</p>
                    {item.description ? (
                      <p className="mt-1 text-xs leading-relaxed text-mute">{item.description}</p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-sm font-extrabold text-brand">${item.price}</p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold text-mute">
                    {qty > 0 ? `A$${(item.price * qty).toFixed(2)}` : "Add to order"}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Remove one ${item.name}`}
                      disabled={qty === 0}
                      onClick={() =>
                        setOrderQty((prev) => {
                          const next = { ...prev };
                          if (qty <= 1) delete next[item.id];
                          else next[item.id] = qty - 1;
                          return next;
                        })
                      }
                      className="grid h-9 w-9 touch-manipulation place-items-center rounded-full text-lg font-bold ring-1 ring-line disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-extrabold" aria-live="polite">
                      {qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Add one ${item.name}`}
                      onClick={() => setOrderQty((prev) => ({ ...prev, [item.id]: Math.min(20, qty + 1) }))}
                      className="grid h-9 w-9 touch-manipulation place-items-center rounded-full bg-brand text-lg font-bold text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        {menu.length > 0 && (
          <div className="rounded-2xl bg-paper p-4 ring-1 ring-line shadow-xs">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-mute">Room (for delivery)</span>
              <input
                value={orderRoom}
                onChange={(e) => setOrderRoom(e.target.value)}
                placeholder={roomLabel || "e.g. 101"}
                inputMode="text"
                className="mt-1 h-11 w-full rounded-2xl bg-card px-4 text-[16px] sm:text-[15px] outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
              />
            </label>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-sm font-extrabold">
                Total A$
                {menu.reduce((n, item) => n + item.price * (orderQty[item.id] || 0), 0).toFixed(2)}
              </p>
              <Button
                disabled={ordering || Object.keys(orderQty).length === 0}
                loading={ordering}
                onClick={() => {
                  void (async () => {
                    const items = Object.entries(orderQty).map(([menuItemId, qty]) => ({ menuItemId, qty }));
                    setOrdering(true);
                    try {
                      const res = await placeDiningOrderRemote({
                        propertyId,
                        roomNumber: orderRoom.trim() || roomLabel || undefined,
                        items,
                      });
                      setOrderQty({});
                      trackContentAction("booking_intent", propertyId, { contentId: res.orderId });
                      if (res.checkoutUrl) {
                        window.location.assign(res.checkoutUrl);
                      } else {
                        toast.success("Order sent to the kitchen — pay at the desk");
                        onClose();
                      }
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Couldn't place the order");
                    } finally {
                      setOrdering(false);
                    }
                  })();
                }}
              >
                {ordering ? "Ordering…" : "Order & pay"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
