import { ExternalLink, Sparkles, Tag } from "lucide-react";
import { isSafeBioHref, type BioCatalogItem } from "@shared/bio";
import { cn } from "@/lib/cn";

function ItemCard({
  item,
  featured,
  onTap,
  onClaim,
}: {
  item: BioCatalogItem;
  featured?: boolean;
  onTap: (kind: string) => void;
  onClaim?: (item: BioCatalogItem) => void;
}) {
  const inner = (
    <div className="flex flex-col h-full justify-between gap-2.5">
      <div>
        <div className="flex items-center justify-between gap-2">
          {item.badge ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              <Sparkles size={10} className="shrink-0 text-accent" />
              {item.badge}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-[10px] font-medium text-mute">
              <Tag size={10} className="shrink-0" />
              Featured
            </span>
          )}

          {item.price && (
            <span className="shrink-0 rounded-full bg-neutral-900 px-2.5 py-0.5 text-xs font-bold text-white shadow-2xs">
              {item.price}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-start justify-between gap-2">
          <h4 className={cn("font-display font-bold text-ink tracking-tight leading-snug", featured ? "text-lg sm:text-xl" : "text-base")}>
            {item.title}
          </h4>
          {item.href && isSafeBioHref(item.href) && (
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper text-mute group-hover:bg-brand group-hover:text-white transition">
              <ExternalLink size={12} />
            </span>
          )}
        </div>

        {item.detail && (
          <p className="mt-1 text-xs sm:text-[13px] leading-relaxed text-ink/75 font-normal line-clamp-3">
            {item.detail}
          </p>
        )}
      </div>

      {onClaim && (
        <button
          type="button"
          className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-brand px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-ink active:scale-[0.98]"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClaim(item);
          }}
        >
          <Sparkles size={12} className="text-accent" />
          <span>Show code at till</span>
        </button>
      )}
    </div>
  );

  const cardCls = cn(
    "group block relative rounded-3xl bg-card p-4 sm:p-5 text-left ring-1 ring-line/80 shadow-xs transition-all duration-200 hover:shadow-md hover:ring-brand/30 active:scale-[0.99]",
    featured && "bg-gradient-to-br from-card via-card to-paper ring-gold/40 shadow-sm",
  );

  if (item.href && isSafeBioHref(item.href)) {
    return (
      <a
        href={item.href}
        target={item.href.startsWith("http") ? "_blank" : undefined}
        rel="noreferrer"
        onClick={() => onTap(item.kind)}
        className={cardCls}
      >
        {inner}
      </a>
    );
  }

  return (
    <div className={cardCls} onClick={() => onTap(item.kind)}>
      {inner}
    </div>
  );
}

export function BioCatalogSection({
  label,
  items,
  featured,
  onTap,
  onClaim,
  id,
}: {
  label: string;
  items: BioCatalogItem[];
  featured?: boolean;
  onTap: (kind: string) => void;
  onClaim?: (item: BioCatalogItem) => void;
  id?: string;
}) {
  if (!items.length) return null;
  return (
    <section id={id} className="mt-7 scroll-mt-24">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
          {label}
        </h3>
        <span className="text-[11px] font-medium text-mute">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>
      <div className={cn("grid gap-3", items.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
        {items.map((item) => (
          <ItemCard key={item.id} item={item} featured={featured} onTap={onTap} onClaim={onClaim} />
        ))}
      </div>
    </section>
  );
}

