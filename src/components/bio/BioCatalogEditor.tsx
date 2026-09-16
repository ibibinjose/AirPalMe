import { useState, type FormEvent } from "react";
import { nanoid } from "nanoid";
import { BIO_CATALOG_KINDS, BIO_CATALOG_MAX, type BioCatalogItem, type BioCatalogKind } from "@shared/bio";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function BioCatalogEditor({
  products,
  services,
  deals,
  onChange,
}: {
  products: BioCatalogItem[];
  services: BioCatalogItem[];
  deals: BioCatalogItem[];
  onChange: (kind: BioCatalogKind, rows: BioCatalogItem[]) => void;
}) {
  const [kind, setKind] = useState<BioCatalogKind>("deal");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [price, setPrice] = useState("");
  const [badge, setBadge] = useState("");
  const [href, setHref] = useState("");
  const rows = kind === "deal" ? deals : kind === "product" ? products : services;

  function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (rows.length >= BIO_CATALOG_MAX) return;
    onChange(kind, [
      ...rows,
      {
        id: nanoid(6),
        kind,
        title: title.trim(),
        detail: detail.trim(),
        price: price.trim() || undefined,
        badge: kind === "deal" ? badge.trim() || undefined : undefined,
        href: href.trim() || undefined,
      },
    ]);
    setTitle("");
    setDetail("");
    setPrice("");
    setBadge("");
    setHref("");
  }

  return (
    <div className="mt-5 space-y-3">
      <div className="flex flex-wrap gap-2">
        {BIO_CATALOG_KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            className={cn("h-9 rounded-full px-4 text-sm", kind === k.id ? "bg-ink text-white" : "bg-white ring-1 ring-line")}
          >
            {k.label}
          </button>
        ))}
      </div>
      <form className="space-y-2" onSubmit={add}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required className="h-12 w-full rounded-2xl bg-card px-4 ring-1 ring-line outline-none" />
        <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Short line" className="h-12 w-full rounded-2xl bg-card px-4 ring-1 ring-line outline-none" />
        <div className="grid grid-cols-2 gap-2">
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" className="h-12 rounded-2xl bg-card px-4 ring-1 ring-line outline-none" />
          {kind === "deal" ? (
            <input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="Badge" className="h-12 rounded-2xl bg-card px-4 ring-1 ring-line outline-none" />
          ) : (
            <input value={href} onChange={(e) => setHref(e.target.value)} placeholder="Link" className="h-12 rounded-2xl bg-card px-4 ring-1 ring-line outline-none" />
          )}
        </div>
        {kind === "deal" && (
          <input value={href} onChange={(e) => setHref(e.target.value)} placeholder="Link" className="h-12 w-full rounded-2xl bg-card px-4 ring-1 ring-line outline-none" />
        )}
        <Button type="submit" className="w-full" disabled={rows.length >= BIO_CATALOG_MAX}>
          Add {kind}
        </Button>
      </form>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="flex items-start justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
            <span>
              {row.badge && <span className="block text-[11px] uppercase tracking-[0.14em] text-gold">{row.badge}</span>}
              <span className="font-medium">{row.title}</span>
              {row.price && <span className="ml-2 text-sm text-mute">{row.price}</span>}
              {row.detail && <span className="mt-0.5 block text-sm text-mute">{row.detail}</span>}
            </span>
            <button type="button" className="shrink-0 text-sm text-mute" onClick={() => onChange(kind, rows.filter((x) => x.id !== row.id))}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
