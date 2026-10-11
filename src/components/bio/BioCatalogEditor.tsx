import { useState, type FormEvent } from "react";
import { nanoid } from "nanoid";
import { Tag, Package, Briefcase, Plus, Trash2, ExternalLink, Sparkles } from "lucide-react";
import { BIO_CATALOG_KINDS, BIO_CATALOG_MAX, type BioCatalogItem, type BioCatalogKind } from "@shared/bio";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { fieldInput } from "@/components/forms/ValidField";

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

  const kindIcon = (id: BioCatalogKind) => {
    switch (id) {
      case "deal":
        return <Sparkles size={14} className="text-accent" />;
      case "product":
        return <Package size={14} className="text-sky-500" />;
      case "service":
        return <Briefcase size={14} className="text-emerald-500" />;
    }
  };

  return (
    <div className="mt-5 space-y-4">
      {/* Category selector pills */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Shop & Catalog Category</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {BIO_CATALOG_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold transition active:scale-95",
                kind === k.id
                  ? "bg-brand text-white shadow-sm ring-1 ring-brand"
                  : "bg-card text-ink ring-1 ring-line hover:bg-paper",
              )}
            >
              {kindIcon(k.id)}
              <span>{k.label}</span>
              <span
                className={cn(
                  "ml-1 rounded-full px-2 py-0.5 text-[10px]",
                  kind === k.id ? "bg-white/20 text-white" : "bg-paper text-mute",
                )}
              >
                {(k.id === "deal" ? deals : k.id === "product" ? products : services).length}/{BIO_CATALOG_MAX}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Item creation form */}
      <form className="space-y-3 rounded-2xl border border-line bg-card p-4 shadow-sm" onSubmit={add}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-mute flex items-center gap-1.5">
            {kindIcon(kind)}
            <span>Add New {kind === "deal" ? "Deal / Offer" : kind === "product" ? "Product" : "Service"}</span>
          </span>
          <span className="text-[11px] text-mute">
            {rows.length} of {BIO_CATALOG_MAX} items
          </span>
        </div>

        <div className="space-y-2">
          <div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                kind === "deal"
                  ? "e.g. 10% Off First Coffee or Welcome Drink"
                  : kind === "product"
                    ? "e.g. Artisanal Single Origin Roast 250g"
                    : "e.g. Private Catering or 1-on-1 Consultation"
              }
              required
              className={fieldInput}
            />
          </div>

          <div>
            <input
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Short description / details (e.g. Valid Mon–Fri before 11am)"
              className={fieldInput}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price (e.g. $18 or Free)"
              className={`h-11 ${fieldInput}`}
            />
            {kind === "deal" ? (
              <input
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="Badge (e.g. Today Only)"
                className={`h-11 ${fieldInput}`}
              />
            ) : (
              <input
                value={href}
                onChange={(e) => setHref(e.target.value)}
                placeholder="Link URL (Optional)"
                className={`h-11 ${fieldInput}`}
              />
            )}
          </div>

          {kind === "deal" && (
            <input
              value={href}
              onChange={(e) => setHref(e.target.value)}
              placeholder="Link / Claim URL (e.g. https://yourstore.com/deal)"
              className={fieldInput}
            />
          )}
        </div>

        <Button
          type="submit"
          className="w-full gap-2 font-semibold shadow-sm h-11"
          disabled={rows.length >= BIO_CATALOG_MAX}
        >
          <Plus size={16} />
          Add {kind === "deal" ? "Deal" : kind === "product" ? "Product" : "Service"}
        </Button>
      </form>

      {/* Item List */}
      <div className="space-y-2 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-mute">
          Current {kind === "deal" ? "Deals & Offers" : kind === "product" ? "Products" : "Services"} ({rows.length})
        </p>

        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-5 text-center text-xs text-mute">
            No {kind}s added yet. Fill in the fields above to add your first {kind}.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-start justify-between gap-3 rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs transition hover:ring-ink/20"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {row.badge && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                        <Tag size={10} />
                        {row.badge}
                      </span>
                    )}
                    <span className="font-semibold text-sm text-ink">{row.title}</span>
                    {row.price && (
                      <span className="rounded-md bg-paper px-2 py-0.5 text-xs font-bold text-accent">{row.price}</span>
                    )}
                  </div>
                  {row.detail && <p className="text-xs text-mute leading-relaxed">{row.detail}</p>}
                  {row.href && (
                    <a
                      href={row.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                    >
                      <ExternalLink size={11} />
                      <span className="truncate">{row.href}</span>
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  className="rounded-full p-2 text-mute transition hover:bg-rose-50 hover:text-rose-600 shrink-0"
                  title={`Remove ${row.title}`}
                  onClick={() =>
                    onChange(
                      kind,
                      rows.filter((x) => x.id !== row.id),
                    )
                  }
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
