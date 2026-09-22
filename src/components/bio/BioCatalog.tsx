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
    <>
      {item.badge && <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">{item.badge}</p>}
      <div className="flex items-baseline justify-between gap-3">
        <p className={cn("font-medium", featured && "font-display text-xl font-semibold")}>{item.title}</p>
        {item.price && <p className="shrink-0 text-sm font-medium">{item.price}</p>}
      </div>
      {item.detail && <p className="mt-0.5 text-[15px] text-ink/80">{item.detail}</p>}
      {onClaim && (
        <button
          type="button"
          className="mt-3 h-10 w-full rounded-full bg-brand text-sm font-medium text-white"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClaim(item);
          }}
        >
          Show at till
        </button>
      )}
    </>
  );
  const cls = cn("block rounded-[24px] bg-card px-5 py-4 text-left ring-1 ring-line", featured && "rounded-[28px]");
  if (item.href && isSafeBioHref(item.href)) {
    return (
      <a
        href={item.href}
        target={item.href.startsWith("http") ? "_blank" : undefined}
        rel="noreferrer"
        onClick={() => onTap(item.kind)}
        className={cls}
      >
        {inner}
      </a>
    );
  }
  return (
    <div className={cls} onClick={() => onTap(item.kind)}>
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
    <section id={id} className="mt-6 scroll-mt-24">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">{label}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <ItemCard item={item} featured={featured} onTap={onTap} onClaim={onClaim} />
          </li>
        ))}
      </ul>
    </section>
  );
}
