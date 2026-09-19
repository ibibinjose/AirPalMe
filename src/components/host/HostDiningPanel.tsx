import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import type { MenuItem } from "@shared/airpal-data";
import { deletePropertyMenuItem, savePropertyMenuItem } from "@/lib/properties";

const CATEGORIES: MenuItem["category"][] = ["Starters", "Mains", "Desserts", "Drinks", "Breakfast", "Late Night"];
const field =
  "mt-1 h-12 w-full rounded-2xl ring-1 ring-line bg-paper/70 px-4 text-[16px] md:text-[15px] outline-none transition focus:border-brand focus:bg-card focus:ring-2 focus:ring-brand/45";

export function HostDiningPanel({ propertyId, menu }: { propertyId: string; menu: MenuItem[] }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<MenuItem["category"]>("Mains");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of menu) {
      const key = item.category || "Mains";
      map.set(key, [...(map.get(key) || []), item]);
    }
    const rows: Array<[string, MenuItem[]]> = [];
    map.forEach((items, cat) => rows.push([cat, items]));
    return rows;
  }, [menu]);

  async function addItem(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const p = Number(price);
    if (!n || !Number.isFinite(p) || p < 0) {
      toast.error("Add a dish name and price");
      return;
    }
    setBusy(true);
    try {
      await savePropertyMenuItem(propertyId, {
        id: `m-${crypto.randomUUID().slice(0, 8)}`,
        propertyId,
        name: n,
        price: p,
        category,
        description: description.trim(),
        available: true,
      });
      setName("");
      setPrice("");
      setDescription("");
      toast.success("Menu item saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t save menu item");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 space-y-5">
      <section className="rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm md:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">In-room dining</p>
        <h2 className="font-display text-xl font-semibold tracking-tight">Live menu</h2>
        <p className="mt-1 text-[13px] text-mute">Guests see this on Stay → Dining. Empty means ask the desk.</p>
        {grouped.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-paper px-4 py-5 text-center text-sm text-mute ring-1 ring-line">
            No dishes yet. Add the first item below.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {grouped.map(([cat, items]) => (
              <div key={cat}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">{cat}</p>
                <ul className="mt-2 space-y-2">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-2xl bg-paper/70 px-4 py-3 ring-1 ring-line"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{item.name}</p>
                        {item.description ? <p className="mt-0.5 text-xs text-mute">{item.description}</p> : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <p className="text-sm font-semibold text-brand">${item.price}</p>
                        <button
                          type="button"
                          className="text-xs text-mute hover:text-ink"
                          onClick={() => {
                            void deletePropertyMenuItem(propertyId, item.id)
                              .then(() => toast.success("Removed"))
                              .catch((err) => toast.error(err instanceof Error ? err.message : "Couldn’t remove"));
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <form onSubmit={addItem} className="space-y-3 rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm md:p-6">
        <h3 className="font-display text-lg font-semibold">Add a dish</h3>
        <label className="block">
          <span className="text-[12px] font-semibold text-ink/70">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[12px] font-semibold text-ink/70">Price</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              placeholder="26"
              className={field}
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-ink/70">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MenuItem["category"])}
              className={field}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-[12px] font-semibold text-ink/70">Description</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={field} />
        </label>
        <Button type="submit" className="w-full" disabled={busy} loading={busy}>
          {busy ? "Saving…" : "Add to menu"}
        </Button>
      </form>
    </div>
  );
}
